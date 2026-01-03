import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../pg.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    }).parse(req.body);

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [body.email]);
    if (exists.rowCount) return reply.code(409).send({ error: 'User already exists' });

    const passwordHash = await hashPassword(body.password);

    const created = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at, last_login_at`,
      [body.email, passwordHash]
    );

    const user = created.rows[0];
    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return { user: { id: user.id, email: user.email }, token };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);

    const found = await pool.query(
      `SELECT id, email, password_hash FROM users WHERE email=$1`,
      [body.email]
    );

    if (!found.rowCount) return reply.code(401).send({ error: 'Invalid credentials' });

    const user = found.rows[0];

    const ok = await verifyPassword(user.password_hash, body.password);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    await pool.query(`UPDATE users SET last_login_at=now() WHERE id=$1`, [user.id]);

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return { user: { id: user.id, email: user.email }, token };
  });

  app.get('/api/me', { preHandler: [app.auth] }, async (req: any) => {
    return { user: { id: req.user.sub, email: req.user.email } };
  });
}
