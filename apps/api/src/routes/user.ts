import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { env } from '../env.js';
import { pool } from '../pg.js';

const Providers = z.enum(['pubmed', 'wiley', 'crossref', 'openrouter']);
type Provider = z.infer<typeof Providers>;

function getMasterKey(): Buffer {
  // Берём первые 32 байта (если длиннее) или падём если меньше 32
  const raw = env.API_KEYS_MASTER_KEY;
  const buf = Buffer.from(raw, 'utf8');
  if (buf.length < 32) throw new Error('API_KEYS_MASTER_KEY too short');
  return buf.subarray(0, 32);
}

function encrypt(plain: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // base64(iv).base64(tag).base64(data)
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export async function userRoutes(app: FastifyInstance) {
  // Сохранить/обновить ключ провайдера (у каждого юзера свой)
  app.post('/api/user/api-keys', { preHandler: [app.auth] }, async (req: any, reply) => {
    const body = z.object({
      provider: Providers,
      apiKey: z.string().min(1)
    }).parse(req.body);

    const userId = req.user.sub as string;
    const encryptedKey = encrypt(body.apiKey);

    await pool.query(
      `INSERT INTO user_api_keys (user_id, provider, encrypted_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_key=EXCLUDED.encrypted_key, created_at=now()`,
      [userId, body.provider, encryptedKey]
    );

    return reply.code(204).send();
  });

  // Получить статус по ключам (ключ НЕ возвращаем)
  app.get('/api/user/api-keys', { preHandler: [app.auth] }, async (req: any) => {
    const userId = req.user.sub as string;

    const res = await pool.query(
      `SELECT provider FROM user_api_keys WHERE user_id=$1`,
      [userId]
    );

    const have = new Set<string>(res.rows.map((r: any) => r.provider));

    const providers: Provider[] = ['pubmed', 'wiley', 'crossref', 'openrouter'];
    return providers.map((p) => ({ provider: p, hasKey: have.has(p) }));
  });
}
