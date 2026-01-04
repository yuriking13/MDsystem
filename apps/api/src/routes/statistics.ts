import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";

const ProjectIdSchema = z.object({
  id: z.string().uuid(),
});

const StatIdSchema = z.object({
  id: z.string().uuid(),
  statId: z.string().uuid(),
});

const CreateStatisticSchema = z.object({
  type: z.enum(['chart', 'table']),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  config: z.record(z.any()),
  tableData: z.record(z.any()).optional(),
  dataClassification: z.object({
    variableType: z.enum(['quantitative', 'qualitative']),
    subType: z.enum(['continuous', 'discrete', 'nominal', 'dichotomous', 'ordinal']),
    isNormalDistribution: z.boolean().optional(),
  }).optional(),
  chartType: z.string().max(50).optional(),
});

const UpdateStatisticSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  config: z.record(z.any()).optional(),
  tableData: z.record(z.any()).optional(),
  dataClassification: z.object({
    variableType: z.enum(['quantitative', 'qualitative']),
    subType: z.enum(['continuous', 'discrete', 'nominal', 'dichotomous', 'ordinal']),
    isNormalDistribution: z.boolean().optional(),
  }).optional(),
  chartType: z.string().max(50).optional(),
  orderIndex: z.number().optional(),
});

const plugin: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects/:id/statistics - list project statistics
  fastify.get(
    "/projects/:id/statistics",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      const parsed = ProjectIdSchema.safeParse(request.params);
      
      if (!parsed.success) {
        return reply.code(400).send({ error: "BadRequest", message: "Invalid project ID" });
      }

      // Check access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [parsed.data.id, userId]
      );

      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "NotFound", message: "Project not found" });
      }

      const res = await pool.query(
        `SELECT id, type, title, description, config, table_data, 
                data_classification, chart_type, used_in_documents,
                order_index, created_at, updated_at
         FROM project_statistics
         WHERE project_id = $1
         ORDER BY order_index, created_at DESC`,
        [parsed.data.id]
      );

      return { statistics: res.rows };
    }
  );

  // POST /api/projects/:id/statistics - create statistic item
  fastify.post(
    "/projects/:id/statistics",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      const paramsP = ProjectIdSchema.safeParse(request.params);
      
      if (!paramsP.success) {
        return reply.code(400).send({ error: "BadRequest", message: "Invalid project ID" });
      }

      const bodyP = CreateStatisticSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check edit access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId]
      );

      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "NotFound", message: "Project not found" });
      }

      const role = access.rows[0].role;
      if (role !== "owner" && role !== "editor") {
        return reply.code(403).send({ error: "Forbidden", message: "No edit access" });
      }

      const { type, title, description, config, tableData, dataClassification, chartType } = bodyP.data;

      const res = await pool.query(
        `INSERT INTO project_statistics 
         (project_id, type, title, description, config, table_data, data_classification, chart_type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, type, title, description, config, table_data, 
                   data_classification, chart_type, order_index, created_at, updated_at`,
        [
          paramsP.data.id,
          type,
          title,
          description || null,
          JSON.stringify(config),
          tableData ? JSON.stringify(tableData) : null,
          dataClassification ? JSON.stringify(dataClassification) : null,
          chartType || null,
          userId
        ]
      );

      return { statistic: res.rows[0] };
    }
  );

  // PATCH /api/projects/:id/statistics/:statId - update statistic item
  fastify.patch(
    "/projects/:id/statistics/:statId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      const paramsP = StatIdSchema.safeParse(request.params);
      
      if (!paramsP.success) {
        return reply.code(400).send({ error: "BadRequest", message: "Invalid params" });
      }

      const bodyP = UpdateStatisticSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check edit access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId]
      );

      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "NotFound", message: "Project not found" });
      }

      const role = access.rows[0].role;
      if (role !== "owner" && role !== "editor") {
        return reply.code(403).send({ error: "Forbidden", message: "No edit access" });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (bodyP.data.title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(bodyP.data.title);
      }
      if (bodyP.data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(bodyP.data.description);
      }
      if (bodyP.data.config !== undefined) {
        updates.push(`config = $${idx++}`);
        values.push(JSON.stringify(bodyP.data.config));
      }
      if (bodyP.data.tableData !== undefined) {
        updates.push(`table_data = $${idx++}`);
        values.push(JSON.stringify(bodyP.data.tableData));
      }
      if (bodyP.data.dataClassification !== undefined) {
        updates.push(`data_classification = $${idx++}`);
        values.push(JSON.stringify(bodyP.data.dataClassification));
      }
      if (bodyP.data.chartType !== undefined) {
        updates.push(`chart_type = $${idx++}`);
        values.push(bodyP.data.chartType);
      }
      if (bodyP.data.orderIndex !== undefined) {
        updates.push(`order_index = $${idx++}`);
        values.push(bodyP.data.orderIndex);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: "BadRequest", message: "No fields to update" });
      }

      // Always update the updated_at timestamp
      updates.push(`updated_at = NOW()`);

      values.push(paramsP.data.statId);
      values.push(paramsP.data.id);

      const res = await pool.query(
        `UPDATE project_statistics SET ${updates.join(", ")} 
         WHERE id = $${idx} AND project_id = $${idx + 1}
         RETURNING id, type, title, description, config, table_data, 
                   data_classification, chart_type, order_index, created_at, updated_at`,
        values
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "NotFound", message: "Statistic not found" });
      }

      return { statistic: res.rows[0] };
    }
  );

  // DELETE /api/projects/:id/statistics/:statId - delete statistic item
  fastify.delete(
    "/projects/:id/statistics/:statId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      const paramsP = StatIdSchema.safeParse(request.params);
      
      if (!paramsP.success) {
        return reply.code(400).send({ error: "BadRequest", message: "Invalid params" });
      }

      // Check edit access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId]
      );

      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "NotFound", message: "Project not found" });
      }

      const role = access.rows[0].role;
      if (role !== "owner" && role !== "editor") {
        return reply.code(403).send({ error: "Forbidden", message: "No edit access" });
      }

      await pool.query(
        `DELETE FROM project_statistics WHERE id = $1 AND project_id = $2`,
        [paramsP.data.statId, paramsP.data.id]
      );

      return { ok: true };
    }
  );

  // POST /api/projects/:id/statistics/:statId/use - mark statistic as used in document
  fastify.post(
    "/projects/:id/statistics/:statId/use",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      const paramsP = StatIdSchema.safeParse(request.params);
      
      if (!paramsP.success) {
        return reply.code(400).send({ error: "BadRequest", message: "Invalid params" });
      }

      const bodySchema = z.object({
        documentId: z.string().uuid(),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId]
      );

      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "NotFound", message: "Project not found" });
      }

      await pool.query(
        `UPDATE project_statistics 
         SET used_in_documents = array_append(
           COALESCE(used_in_documents, ARRAY[]::uuid[]), 
           $1::uuid
         )
         WHERE id = $2 AND project_id = $3
         AND NOT ($1::uuid = ANY(COALESCE(used_in_documents, ARRAY[]::uuid[])))`,
        [bodyP.data.documentId, paramsP.data.statId, paramsP.data.id]
      );

      return { ok: true };
    }
  );
};

export default plugin;
