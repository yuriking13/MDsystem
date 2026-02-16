import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { wsEvents } from "../websocket.js";
import {
  cacheGet,
  cacheSet,
  invalidateStatistics,
  invalidateStatistic,
  CACHE_KEYS,
  TTL,
} from "../lib/redis.js";
import { getUserId } from "../utils/auth-helpers.js";

const ProjectIdSchema = z.object({
  id: z.string().uuid(),
});

const StatIdSchema = z.object({
  id: z.string().uuid(),
  statId: z.string().uuid(),
});

// Схема для удаления - принимает любой ID (для поврежденных записей)
const StatIdSchemaAny = z.object({
  id: z.string().uuid(),
  statId: z.string().min(1),
});

type StatisticsListResponse = {
  statistics: unknown[];
};

type ForceDeleteQuery = {
  force?: string;
};

type StatisticIdentityRow = {
  id: string;
};

type StatisticRecord = Record<string, unknown>;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

const JsonObjectSchema = z.record(JsonValueSchema);

const MAX_TABLE_COLUMNS = 100;
const MAX_TABLE_ROWS = 2000;
const MAX_TABLE_CELL_LENGTH = 4000;
const XSS_PAYLOAD_RE =
  /<\s*script\b|<\/\s*script\b|javascript:|on\w+\s*=|<\s*(iframe|object|embed)\b/i;

function containsXssPayload(value: string): boolean {
  return XSS_PAYLOAD_RE.test(value);
}

const TableCellSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((value) => (value == null ? "" : String(value)))
  .pipe(z.string().max(MAX_TABLE_CELL_LENGTH))
  .refine((value) => !containsXssPayload(value), {
    message: "Table cell contains potentially unsafe script content",
  });

const TableDataSchema = z
  .object({
    headers: z.array(TableCellSchema).max(MAX_TABLE_COLUMNS),
    rows: z
      .array(z.array(TableCellSchema).max(MAX_TABLE_COLUMNS))
      .max(MAX_TABLE_ROWS),
  })
  .strict();

const CreateStatisticSchema = z.object({
  type: z.enum(["chart", "table"]),
  title: z
    .string()
    .min(1)
    .max(500)
    .refine((value) => !containsXssPayload(value), {
      message: "Title contains potentially unsafe script content",
    }),
  description: z
    .string()
    .max(2000)
    .refine((value) => !containsXssPayload(value), {
      message: "Description contains potentially unsafe script content",
    })
    .optional(),
  config: JsonObjectSchema,
  tableData: TableDataSchema.optional(),
  dataClassification: z
    .object({
      variableType: z.enum(["quantitative", "qualitative"]),
      subType: z.enum([
        "continuous",
        "discrete",
        "nominal",
        "dichotomous",
        "ordinal",
      ]),
      isNormalDistribution: z.boolean().optional(),
    })
    .optional(),
  chartType: z.string().max(50).optional(),
});

const UpdateStatisticSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(500)
    .refine((value) => !containsXssPayload(value), {
      message: "Title contains potentially unsafe script content",
    })
    .optional(),
  description: z
    .string()
    .max(2000)
    .refine((value) => !containsXssPayload(value), {
      message: "Description contains potentially unsafe script content",
    })
    .optional(),
  config: JsonObjectSchema.optional(),
  tableData: TableDataSchema.optional(),
  dataClassification: z
    .object({
      variableType: z.enum(["quantitative", "qualitative"]),
      subType: z.enum([
        "continuous",
        "discrete",
        "nominal",
        "dichotomous",
        "ordinal",
      ]),
      isNormalDistribution: z.boolean().optional(),
    })
    .optional(),
  chartType: z.string().max(50).optional(),
  orderIndex: z.number().optional(),
  version: z.number().optional(), // Optimistic locking - клиент отправляет версию для проверки
});

const plugin: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects/:id/statistics - list project statistics
  fastify.get(
    "/projects/:id/statistics",
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

      // Try cache first
      const cacheKey = CACHE_KEYS.statistics(parsed.data.id);
      const cached = await cacheGet<StatisticsListResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const res = await pool.query(
        `SELECT id, type, title, description, config, table_data, 
                data_classification, chart_type, used_in_documents,
                order_index, created_at, updated_at,
                COALESCE(version, 1) as version
         FROM project_statistics
         WHERE project_id = $1
         ORDER BY order_index, created_at DESC`,
        [parsed.data.id],
      );

      const result = { statistics: res.rows };

      // Cache the result
      await cacheSet(cacheKey, result, TTL.SHORT);

      return result;
    },
  );

  // GET /api/projects/:id/statistics/:statId - get single statistic
  fastify.get(
    "/projects/:id/statistics/:statId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const parsed = StatIdSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid IDs" });
      }

      // Check access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [parsed.data.id, userId],
      );

      if (access.rows.length === 0) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      // Get the statistic
      const res = await pool.query(
        `SELECT * FROM project_statistics 
         WHERE id = $1 AND project_id = $2`,
        [parsed.data.statId, parsed.data.id],
      );

      if (res.rows.length === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Statistic not found" });
      }

      return { statistic: res.rows[0] };
    },
  );

  // POST /api/projects/:id/statistics - create statistic item
  fastify.post(
    "/projects/:id/statistics",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsP = ProjectIdSchema.safeParse(request.params);

      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      const bodyP = CreateStatisticSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check edit access
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

      const {
        type,
        title,
        description,
        config,
        tableData,
        dataClassification,
        chartType,
      } = bodyP.data;

      const res = await pool.query(
        `INSERT INTO project_statistics 
         (project_id, type, title, description, config, table_data, data_classification, chart_type, created_by, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
         RETURNING id, type, title, description, config, table_data, 
                   data_classification, chart_type, order_index, created_at, updated_at,
                   version`,
        [
          paramsP.data.id,
          type,
          title,
          description || null,
          JSON.stringify(config),
          tableData ? JSON.stringify(tableData) : null,
          dataClassification ? JSON.stringify(dataClassification) : null,
          chartType || null,
          userId,
        ],
      );

      // WebSocket: уведомляем о создании
      wsEvents.statisticCreated(paramsP.data.id, res.rows[0], userId);

      // Invalidate statistics cache
      await invalidateStatistics(paramsP.data.id);

      return { statistic: res.rows[0] };
    },
  );

  // PATCH /api/projects/:id/statistics/:statId - update statistic item
  // Поддерживает Optimistic Locking через параметр version
  fastify.patch(
    "/projects/:id/statistics/:statId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsP = StatIdSchema.safeParse(request.params);

      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid params" });
      }

      const bodyP = UpdateStatisticSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check edit access
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

      const updates: string[] = [];
      const values: unknown[] = [];
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
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "No fields to update" });
      }

      // Увеличиваем версию при каждом обновлении
      updates.push(`version = COALESCE(version, 1) + 1`);
      updates.push(`updated_at = NOW()`);

      // Optimistic Locking: если клиент передал version, проверяем её
      const clientVersion = bodyP.data.version;
      let whereClause = `id = $${idx} AND project_id = $${idx + 1}`;
      values.push(paramsP.data.statId);
      values.push(paramsP.data.id);
      idx += 2;

      if (clientVersion !== undefined) {
        whereClause += ` AND COALESCE(version, 1) = $${idx}`;
        values.push(clientVersion);
      }

      const res = await pool.query(
        `UPDATE project_statistics SET ${updates.join(", ")} 
         WHERE ${whereClause}
         RETURNING id, type, title, description, config, table_data, 
                   data_classification, chart_type, order_index, created_at, updated_at,
                   COALESCE(version, 1) as version`,
        values,
      );

      if (res.rowCount === 0) {
        // Проверяем причину: запись не существует или версия не совпала
        if (clientVersion !== undefined) {
          const exists = await pool.query(
            `SELECT COALESCE(version, 1) as version FROM project_statistics 
             WHERE id = $1 AND project_id = $2`,
            [paramsP.data.statId, paramsP.data.id],
          );

          if (exists.rowCount === 0) {
            return reply
              .code(404)
              .send({ error: "NotFound", message: "Statistic not found" });
          }

          // Запись есть, но версия другая — конфликт
          return reply.code(409).send({
            error: "VersionConflict",
            message:
              "Данные были изменены другим пользователем. Обновите страницу.",
            currentVersion: exists.rows[0].version,
            yourVersion: clientVersion,
          });
        }

        return reply
          .code(404)
          .send({ error: "NotFound", message: "Statistic not found" });
      }

      // WebSocket: уведомляем об обновлении
      wsEvents.statisticUpdated(paramsP.data.id, res.rows[0], userId);

      // Invalidate statistics cache
      await invalidateStatistic(paramsP.data.id, paramsP.data.statId);

      return { statistic: res.rows[0] };
    },
  );

  // DELETE /api/projects/:id/statistics/:statId - delete statistic item
  // Использует StatIdSchemaAny для поддержки удаления записей с невалидными ID
  fastify.delete(
    "/projects/:id/statistics/:statId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      // Используем StatIdSchemaAny чтобы можно было удалять записи с любым ID (включая поврежденные)
      const paramsP = StatIdSchemaAny.safeParse(request.params);

      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid params" });
      }

      // Check edit access
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

      // Проверяем, используется ли статистика в документах
      const usageCheck = await pool.query(
        `SELECT used_in_documents FROM project_statistics 
         WHERE id = $1 AND project_id = $2`,
        [paramsP.data.statId, paramsP.data.id],
      );

      if (usageCheck.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Statistic not found" });
      }

      const usedInDocs = usageCheck.rows[0].used_in_documents || [];

      // Проверяем force флаг в query параметрах
      const force = (request.query as ForceDeleteQuery)?.force === "true";

      if (usedInDocs.length > 0 && !force) {
        return reply.code(409).send({
          error: "Conflict",
          message: `Статистика используется в ${usedInDocs.length} документе(ах). Удалите её из документов или используйте force=true`,
          usedInDocuments: usedInDocs,
        });
      }

      await pool.query(
        `DELETE FROM project_statistics WHERE id = $1 AND project_id = $2`,
        [paramsP.data.statId, paramsP.data.id],
      );

      // WebSocket: уведомляем об удалении
      wsEvents.statisticDeleted(paramsP.data.id, paramsP.data.statId, userId);

      // Invalidate statistics cache
      await invalidateStatistics(paramsP.data.id);

      return { ok: true };
    },
  );

  // POST /api/projects/:id/statistics/:statId/use - mark statistic as used in document
  fastify.post(
    "/projects/:id/statistics/:statId/use",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsP = StatIdSchema.safeParse(request.params);

      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid params" });
      }

      const bodySchema = z.object({
        documentId: z.string().uuid(),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      await pool.query(
        `UPDATE project_statistics 
         SET used_in_documents = array_append(
           COALESCE(used_in_documents, ARRAY[]::text[]), 
           $1::text
         )
         WHERE id = $2 AND project_id = $3
         AND NOT ($1::text = ANY(COALESCE(used_in_documents, ARRAY[]::text[])))`,
        [bodyP.data.documentId, paramsP.data.statId, paramsP.data.id],
      );

      return { ok: true };
    },
  );

  // DELETE /api/projects/:id/statistics/:statId/use - remove document link from statistic
  fastify.delete(
    "/projects/:id/statistics/:statId/use",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsP = StatIdSchema.safeParse(request.params);

      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid params" });
      }

      const bodySchema = z.object({
        documentId: z.string().uuid(),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check access
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId],
      );

      if (access.rowCount === 0) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Project not found" });
      }

      await pool.query(
        `UPDATE project_statistics 
         SET used_in_documents = array_remove(
           COALESCE(used_in_documents, ARRAY[]::text[]), 
           $1::text
         )
         WHERE id = $2 AND project_id = $3`,
        [bodyP.data.documentId, paramsP.data.statId, paramsP.data.id],
      );

      return { ok: true };
    },
  );

  // POST /api/projects/:id/statistics/sync - sync statistics from document content
  // This creates new statistics for tables/charts found in document and removes outdated links
  fastify.post(
    "/projects/:id/statistics/sync",
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
        documentId: z.string().uuid(),
        tables: z
          .array(
            z.object({
              id: z.string(),
              title: z.string().optional(),
              tableData: TableDataSchema,
            }),
          )
          .max(500),
        charts: z
          .array(
            z.object({
              id: z.string(),
              title: z.string().optional(),
              config: JsonObjectSchema,
              tableData: TableDataSchema.optional(),
            }),
          )
          .max(500),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: bodyP.error.message });
      }

      // Check edit access
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

      const { documentId, tables, charts } = bodyP.data;
      const allItemIds = [
        ...tables.map((t) => t.id),
        ...charts.map((c) => c.id),
      ];

      // Get existing statistics linked to this document
      const existingRes = await pool.query(
        `SELECT id FROM project_statistics 
         WHERE project_id = $1 AND $2 = ANY(COALESCE(used_in_documents, ARRAY[]::text[]))`,
        [paramsP.data.id, documentId],
      );
      const existingIds = new Set(
        existingRes.rows.map((r) => (r as StatisticIdentityRow).id),
      );

      // Remove document link from statistics that are no longer in the document
      for (const existingId of existingIds) {
        if (!allItemIds.includes(existingId)) {
          await pool.query(
            `UPDATE project_statistics 
             SET used_in_documents = array_remove(
               COALESCE(used_in_documents, ARRAY[]::text[]), 
               $1::text
             )
             WHERE id = $2 AND project_id = $3`,
            [documentId, existingId, paramsP.data.id],
          );
        }
      }

      const createdStats: StatisticRecord[] = [];

      // Process tables
      for (const table of tables) {
        // Check if statistic with this ID already exists
        const existsRes = await pool.query(
          `SELECT id FROM project_statistics WHERE id = $1 AND project_id = $2`,
          [table.id, paramsP.data.id],
        );

        if (existsRes.rowCount === 0) {
          // Create new statistic
          const insertRes = await pool.query(
            `INSERT INTO project_statistics 
             (id, project_id, type, title, table_data, config, used_in_documents, created_by)
             VALUES ($1, $2, 'table', $3, $4, $5, ARRAY[$6::text], $7)
             RETURNING *`,
            [
              table.id,
              paramsP.data.id,
              table.title || "Таблица из документа",
              JSON.stringify(table.tableData),
              JSON.stringify({}),
              documentId,
              userId,
            ],
          );
          createdStats.push(insertRes.rows[0]);
        } else {
          // Update link if not already linked
          await pool.query(
            `UPDATE project_statistics 
             SET used_in_documents = array_append(
               COALESCE(used_in_documents, ARRAY[]::text[]), 
               $1::text
             )
             WHERE id = $2 AND project_id = $3
             AND NOT ($1::text = ANY(COALESCE(used_in_documents, ARRAY[]::text[])))`,
            [documentId, table.id, paramsP.data.id],
          );
        }
      }

      // Process charts
      for (const chart of charts) {
        const existsRes = await pool.query(
          `SELECT id FROM project_statistics WHERE id = $1 AND project_id = $2`,
          [chart.id, paramsP.data.id],
        );

        if (existsRes.rowCount === 0) {
          // Create new statistic
          const insertRes = await pool.query(
            `INSERT INTO project_statistics 
             (id, project_id, type, title, config, table_data, used_in_documents, created_by)
             VALUES ($1, $2, 'chart', $3, $4, $5, ARRAY[$6::text], $7)
             RETURNING *`,
            [
              chart.id,
              paramsP.data.id,
              chart.title || "График из документа",
              JSON.stringify(chart.config),
              chart.tableData ? JSON.stringify(chart.tableData) : null,
              documentId,
              userId,
            ],
          );
          createdStats.push(insertRes.rows[0]);
        } else {
          // Update link if not already linked
          await pool.query(
            `UPDATE project_statistics 
             SET used_in_documents = array_append(
               COALESCE(used_in_documents, ARRAY[]::text[]), 
               $1::text
             )
             WHERE id = $2 AND project_id = $3
             AND NOT ($1::text = ANY(COALESCE(used_in_documents, ARRAY[]::text[])))`,
            [documentId, chart.id, paramsP.data.id],
          );
        }
      }

      return {
        ok: true,
        created: createdStats.length,
        statistics: createdStats,
      };
    },
  );

  // POST /api/projects/:id/statistics/cleanup - удалить "битые" статистики без данных
  fastify.post(
    "/projects/:id/statistics/cleanup",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsP = ProjectIdSchema.safeParse(request.params);

      if (!paramsP.success) {
        return reply
          .code(400)
          .send({ error: "BadRequest", message: "Invalid project ID" });
      }

      // Check edit access
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

      // Удаляем статистики без данных или с пустыми данными
      const deleteRes = await pool.query(
        `DELETE FROM project_statistics 
         WHERE project_id = $1 
         AND (
           table_data IS NULL 
           OR table_data = '{}'::jsonb 
           OR table_data = 'null'::jsonb
           OR (table_data->>'rows' IS NULL AND table_data->>'headers' IS NULL)
           OR (
             table_data->>'rows' = '[]' 
             AND (table_data->>'headers' IS NULL OR table_data->>'headers' = '[]')
           )
         )
         RETURNING id, title`,
        [paramsP.data.id],
      );

      return {
        ok: true,
        deleted: deleteRes.rowCount || 0,
        deletedItems: deleteRes.rows,
      };
    },
  );
};

export default plugin;
