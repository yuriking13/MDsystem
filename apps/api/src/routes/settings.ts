import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getDb } from "../utils/db.js";
import { encryptApiKey } from "../utils/apiKeyCrypto.js";
import { getAuthUser } from "../utils/authUser.js";

const KnownProviders = ["pubmed", "wiley", "doaj", "openrouter"] as const;

function normalizeProvider(p: string): string {
  return p.trim().toLowerCase();
}

function isValidProvider(p: string): boolean {
  return /^[a-z0-9_-]{2,50}$/.test(p);
}

const BodySchema = z.object({
  provider: z.string().min(1),
  key: z.string().min(1).max(4096),
});

const ParamsSchema = z.object({
  provider: z.string().min(1),
});

function badRequest(reply: any, message: string) {
  reply.code(400).send({ error: "BadRequest", message });
}

const plugin: FastifyPluginAsync = async (fastify) => {
  // /api/user/api-keys
  fastify.get(
    "/user/api-keys",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = await getAuthUser(fastify, request);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });

      const db = getDb(fastify);
      const res = await db.query("select provider from user_api_keys where user_id = $1", [
        user.id,
      ]);

      const keys: Record<string, boolean> = Object.fromEntries(
        KnownProviders.map((p) => [p, false]),
      );

      for (const row of res.rows) {
        const provider = normalizeProvider(String((row as any).provider));
        if (!provider) continue;
        keys[provider] = true;
      }

      return { keys };
    },
  );

  // /api/user/api-keys  (save/upsert)
  fastify.post(
    "/user/api-keys",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = await getAuthUser(fastify, request);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });

      const parsed = BodySchema.safeParse(request.body);
      if (!parsed.success) {
        return badRequest(reply, "Invalid body (expected { provider, key })");
      }

      const provider = normalizeProvider(parsed.data.provider);
      if (!isValidProvider(provider)) {
        return badRequest(reply, "Invalid provider (use [a-z0-9_-], 2..50 chars)");
      }

      const encrypted = encryptApiKey(parsed.data.key);

      const db = getDb(fastify);
      // ВАЖНО: не трогаем столбцы, которых может не быть (updated_at и т.п.)
      await db.query(
        `
        insert into user_api_keys (user_id, provider, encrypted_key)
        values ($1, $2, $3)
        on conflict (user_id, provider)
        do update set encrypted_key = excluded.encrypted_key
      `,
        [user.id, provider, encrypted],
      );

      return { ok: true };
    },
  );

  // /api/user/api-keys/:provider (delete)
  fastify.delete(
    "/user/api-keys/:provider",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = await getAuthUser(fastify, request);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });

      const parsed = ParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return badRequest(reply, "Invalid provider param");
      }

      const provider = normalizeProvider(parsed.data.provider);
      if (!isValidProvider(provider)) {
        return badRequest(reply, "Invalid provider (use [a-z0-9_-], 2..50 chars)");
      }

      const db = getDb(fastify);
      await db.query("delete from user_api_keys where user_id = $1 and provider = $2", [
        user.id,
        provider,
      ]);

      return { ok: true };
    },
  );
};

export default plugin;
