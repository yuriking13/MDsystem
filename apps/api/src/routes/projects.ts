import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";
import {
  OffsetPaginationSchema,
  calculateOffset,
  createPaginationMeta,
  buildOrderByClause,
} from "../utils/pagination.js";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  citationStyle: z
    .enum(["gost-r-7-0-5-2008", "gost", "apa", "vancouver"])
    .optional(),
  // Тип исследования - только если передано, иначе игнорируем
  researchType: z
    .enum([
      "observational_descriptive",
      "observational_analytical",
      "experimental",
      "second_order",
      "other",
    ])
    .nullish()
    .optional(),
  researchSubtype: z.string().max(100).nullish().optional(),
  // Протокол исследования - только если передано, иначе игнорируем
  researchProtocol: z
    .enum(["CARE", "STROBE", "CONSORT", "PRISMA", "OTHER"])
    .nullish()
    .optional(),
  protocolCustomName: z.string().max(200).nullish().optional(),
  // AI-анализ
  aiErrorAnalysisEnabled: z.boolean().optional(),
  aiProtocolCheckEnabled: z.boolean().optional(),
  // Автоподготовка графа после поиска
  autoGraphSyncEnabled: z.boolean().optional(),
});

const ProjectIdSchema = z.object({
  id: z.string().uuid(),
});

const ListProjectsQuerySchema = OffsetPaginationSchema.extend({
  sortBy: z
    .enum(["updated_at", "created_at", "name"])
    .optional()
    .default("updated_at"),
});

async function hasAutoGraphSyncColumn(): Promise<boolean> {
  try {
    const res = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'projects'
         AND column_name = 'auto_graph_sync_enabled'
       LIMIT 1`,
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

const plugin: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects - list user's projects
  fastify.get(
    "/projects",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const queryP = ListProjectsQuerySchema.safeParse(request.query ?? {});
      if (!queryP.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: queryP.error.message,
        });
      }

      const { page, limit, sortBy, sortOrder } = queryP.data;
      const offset = calculateOffset(page, limit);
      const orderBy = buildOrderByClause(`p.${sortBy}`, sortOrder, "p.id");

      const [res, totalRes] = await Promise.all([
        pool.query(
          `SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
                  pm.role
           FROM projects p
           JOIN project_members pm ON pm.project_id = p.id
           WHERE pm.user_id = $1
           ORDER BY ${orderBy}
           LIMIT $2 OFFSET $3`,
          [userId, limit, offset],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM projects p
           JOIN project_members pm ON pm.project_id = p.id
           WHERE pm.user_id = $1`,
          [userId],
        ),
      ]);

      const total = Number(totalRes.rows[0]?.total ?? 0);

      return {
        projects: res.rows,
        pagination: createPaginationMeta(page, limit, total),
      };
    },
  );

  // POST /api/projects - create project
  fastify.post(
    "/projects",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const parsed = CreateProjectSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: parsed.error.message });
      }

      const { name, description } = parsed.data;

      // Create project and add creator as owner
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const projectRes = await client.query(
          `INSERT INTO projects (name, description, created_by)
           VALUES ($1, $2, $3)
           RETURNING id, name, description, created_at, updated_at`,
          [name, description || null, userId],
        );

        const project = projectRes.rows[0];

        await client.query(
          `INSERT INTO project_members (project_id, user_id, role)
           VALUES ($1, $2, 'owner')`,
          [project.id, userId],
        );

        await client.query("COMMIT");

        return { project: { ...project, role: "owner" } };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  );

  // GET /api/projects/:id - get single project
  fastify.get(
    "/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const parsed = ProjectIdSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      const autoGraphSyncColumnExists = await hasAutoGraphSyncColumn();

      const res = await pool.query(
        `SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
                p.citation_style, pm.role,
                p.research_type, p.research_subtype, p.research_protocol, p.protocol_custom_name,
                p.ai_error_analysis_enabled, p.ai_protocol_check_enabled,
                ${
                  autoGraphSyncColumnExists
                    ? "p.auto_graph_sync_enabled"
                    : "false AS auto_graph_sync_enabled"
                }
         FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
         WHERE p.id = $1 AND pm.user_id = $2`,
        [parsed.data.id, userId],
      );

      if (res.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      return { project: res.rows[0] };
    },
  );

  // PATCH /api/projects/:id - update project
  fastify.patch(
    "/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      const bodyP = UpdateProjectSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check access (owner or editor)
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      const role = access.rows[0].role;
      if (role !== "owner" && role !== "editor") {
        return reply
          .code(403)
          .send({ error: "Forbidden", message: "No edit access" });
      }

      const autoGraphSyncColumnExists = await hasAutoGraphSyncColumn();
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (bodyP.data.name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(bodyP.data.name);
      }
      if (bodyP.data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(bodyP.data.description);
      }
      if (bodyP.data.citationStyle !== undefined) {
        updates.push(`citation_style = $${idx++}`);
        values.push(bodyP.data.citationStyle);
      }
      if (
        bodyP.data.researchType !== undefined &&
        bodyP.data.researchType !== null
      ) {
        updates.push(`research_type = $${idx++}`);
        values.push(bodyP.data.researchType);
      }
      if (
        bodyP.data.researchSubtype !== undefined &&
        bodyP.data.researchSubtype !== null
      ) {
        updates.push(`research_subtype = $${idx++}`);
        values.push(bodyP.data.researchSubtype);
      }
      if (
        bodyP.data.researchProtocol !== undefined &&
        bodyP.data.researchProtocol !== null
      ) {
        updates.push(`research_protocol = $${idx++}`);
        values.push(bodyP.data.researchProtocol);
      }
      if (
        bodyP.data.protocolCustomName !== undefined &&
        bodyP.data.protocolCustomName !== null
      ) {
        updates.push(`protocol_custom_name = $${idx++}`);
        values.push(bodyP.data.protocolCustomName);
      }
      if (bodyP.data.aiErrorAnalysisEnabled !== undefined) {
        updates.push(`ai_error_analysis_enabled = $${idx++}`);
        values.push(bodyP.data.aiErrorAnalysisEnabled);
      }
      if (bodyP.data.aiProtocolCheckEnabled !== undefined) {
        updates.push(`ai_protocol_check_enabled = $${idx++}`);
        values.push(bodyP.data.aiProtocolCheckEnabled);
      }
      if (bodyP.data.autoGraphSyncEnabled !== undefined) {
        if (autoGraphSyncColumnExists) {
          updates.push(`auto_graph_sync_enabled = $${idx++}`);
          values.push(bodyP.data.autoGraphSyncEnabled);
        } else {
          fastify.log.warn(
            { projectId: paramsP.data.id, userId },
            "Skipping auto_graph_sync_enabled update: column is missing",
          );
        }
      }

      if (updates.length === 0) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "No fields to update" });
      }

      updates.push(`updated_at = now()`);
      values.push(paramsP.data.id);

      const autoGraphSyncReturning = autoGraphSyncColumnExists
        ? "auto_graph_sync_enabled"
        : "false AS auto_graph_sync_enabled";

      const res = await pool.query(
        `UPDATE projects SET ${updates.join(", ")} WHERE id = $${idx}
         RETURNING id, name, description, citation_style, 
                   research_type, research_subtype, research_protocol, protocol_custom_name,
                   ai_error_analysis_enabled, ai_protocol_check_enabled, ${autoGraphSyncReturning},
                   created_at, updated_at`,
        values,
      );

      return { project: { ...res.rows[0], role } };
    },
  );

  // DELETE /api/projects/:id - delete project
  // Полностью удаляет проект и ВСЕ связанные данные:
  // - project_articles, project_members, project_statistics (каскад через FK)
  // - documents, citations (каскад через FK)
  // - graph_fetch_jobs (каскад через FK)
  // - graph_cache (ручная очистка - нет FK)
  // - boss.job записи с данными проекта (ручная очистка)
  // - search_queries (каскад через FK)
  fastify.delete(
    "/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const parsed = ProjectIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      const projectId = parsed.data.id;

      // Check if owner
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      if (access.rows[0].role !== "owner") {
        return reply
          .code(403)
          .send({ error: "Forbidden", message: "Only owner can delete" });
      }

      // 1. Очищаем graph_cache для этого проекта (нет FK, нужно вручную)
      await pool.query(`DELETE FROM graph_cache WHERE project_id = $1`, [
        projectId,
      ]);

      // 2. Очищаем boss.job записи связанные с проектом
      // boss jobs хранят projectId в data jsonb
      try {
        await pool.query(`DELETE FROM boss.job WHERE data->>'projectId' = $1`, [
          projectId,
        ]);
      } catch (err) {
        // Игнорируем если boss схема не существует
        console.log(
          "[project-delete] Boss schema cleanup skipped:",
          err instanceof Error ? err.message : err,
        );
      }

      // 3. Удаляем проект - всё остальное удалится каскадно через FK
      // (project_articles, project_members, project_statistics, documents,
      //  citations, graph_fetch_jobs, search_queries)
      await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);

      return { ok: true, message: "Project and all related data deleted" };
    },
  );

  // GET /api/projects/:id/members - list members
  fastify.get(
    "/projects/:id/members",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const parsed = ProjectIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      // Check access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [parsed.data.id, userId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      const res = await pool.query(
        `SELECT pm.user_id, pm.role, pm.joined_at, u.email
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1
         ORDER BY pm.joined_at`,
        [parsed.data.id],
      );

      return { members: res.rows };
    },
  );

  // POST /api/projects/:id/members - invite member by email
  fastify.post(
    "/projects/:id/members",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      const bodySchema = z.object({
        email: z.string().email(),
        role: z.enum(["viewer", "editor"]).default("viewer"),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check if owner
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      if (access.rows[0].role !== "owner") {
        return reply
          .code(403)
          .send({ error: "Forbidden", message: "Only owner can invite" });
      }

      // Find user by email
      const userRes = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [bodyP.data.email],
      );

      if (userRes.rowCount === 0) {
        return reply.code(404).send({
          error: "NotFound",
          message: "User not found. They need to register first.",
        });
      }

      const inviteeId = userRes.rows[0].id;

      // Add member (or update role if already member)
      await pool.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id)
         DO UPDATE SET role = EXCLUDED.role`,
        [paramsP.data.id, inviteeId, bodyP.data.role],
      );

      return { ok: true, userId: inviteeId };
    },
  );

  // DELETE /api/projects/:id/members/:userId - remove member
  fastify.delete(
    "/projects/:id/members/:userId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const currentUserId = getUserId(request);

      const paramsSchema = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
      });

      const parsed = paramsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid params" });
      }

      // Check if owner
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [parsed.data.id, currentUserId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      if (access.rows[0].role !== "owner") {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only owner can remove members",
        });
      }

      // Can't remove owner
      const targetRole = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [parsed.data.id, parsed.data.userId],
      );

      if (
        (targetRole.rowCount ?? 0) > 0 &&
        targetRole.rows[0].role === "owner"
      ) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Cannot remove owner" });
      }

      await pool.query(
        `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [parsed.data.id, parsed.data.userId],
      );

      return { ok: true };
    },
  );
};

export default plugin;
