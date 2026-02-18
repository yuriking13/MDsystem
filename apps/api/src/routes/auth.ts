import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { rateLimits } from "../plugins/rate-limit.js";

// Valid argon2 hash used to equalize timing for unknown users in login flow.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$Zdm6OhtHz6IvYS/i2wTnSQ$cChsYAQ7NJ850QOyJ339yXzE36VuvCj1vllIcJkIIfg";

export async function authRoutes(app: FastifyInstance) {
  // Rate limiting: 3 регистрации за час с одного IP
  app.post(
    "/api/auth/register",
    { preHandler: [rateLimits.register] },
    async (req, reply) => {
      const body = z
        .object({
          email: z.string().email(),
          password: z.string().min(8),
        })
        .parse(req.body);

      const exists = await pool.query("SELECT id FROM users WHERE email=$1", [
        body.email,
      ]);
      if (exists.rowCount)
        return reply.code(409).send({ error: "User already exists" });

      const passwordHash = await hashPassword(body.password);

      const created = await pool.query(
        `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at, last_login_at`,
        [body.email, passwordHash],
      );

      const user = created.rows[0];

      // Генерируем пару токенов (access + refresh)
      const { accessToken, refreshToken } = await app.generateTokens(
        user.id,
        user.email,
      );

      return {
        user: { id: user.id, email: user.email },
        token: accessToken,
        accessToken,
        refreshToken,
      };
    },
  );

  // Rate limiting: 5 попыток логина за 15 минут с одного IP
  app.post(
    "/api/auth/login",
    { preHandler: [rateLimits.login] },
    async (req, reply) => {
      const body = z
        .object({
          email: z.string().email(),
          password: z.string().min(1),
        })
        .parse(req.body);

      const found = await pool.query(
        `SELECT id, email, password_hash, is_blocked FROM users WHERE email=$1`,
        [body.email],
      );

      if (!found.rowCount) {
        try {
          await verifyPassword(DUMMY_PASSWORD_HASH, body.password);
        } catch {
          // Ignore: keep response identical for non-existent users.
        }
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const user = found.rows[0];

      if (user.is_blocked) {
        return reply.code(403).send({
          error: "AccountBlocked",
          message: "User account is blocked",
        });
      }

      const ok = await verifyPassword(user.password_hash, body.password);
      if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

      await pool.query(`UPDATE users SET last_login_at=now() WHERE id=$1`, [
        user.id,
      ]);

      // Генерируем пару токенов (access + refresh)
      const { accessToken, refreshToken } = await app.generateTokens(
        user.id,
        user.email,
      );

      return {
        user: { id: user.id, email: user.email },
        token: accessToken,
        accessToken,
        refreshToken,
      };
    },
  );

  // Обновление токенов по refresh token
  app.post(
    "/api/auth/refresh",
    { preHandler: [rateLimits.login] },
    async (req, reply) => {
      const body = z
        .object({
          refreshToken: z.string().min(1),
        })
        .parse(req.body);

      // Проверяем refresh token
      const userData = await app.verifyRefreshToken(body.refreshToken);
      if (!userData) {
        return reply.code(401).send({
          error: "InvalidRefreshToken",
          message: "Invalid or expired refresh token",
        });
      }

      // Отзываем старый refresh token (token rotation)
      await app.revokeRefreshToken(body.refreshToken);

      // Генерируем новую пару токенов
      const { accessToken, refreshToken } = await app.generateTokens(
        userData.userId,
        userData.email,
      );

      return {
        accessToken,
        refreshToken,
        token: accessToken, // для обратной совместимости
      };
    },
  );

  // Logout - отзыв refresh token
  app.post(
    "/api/auth/logout",
    { preHandler: [app.auth] },
    async (req: FastifyRequest) => {
      const body = z
        .object({
          refreshToken: z.string().optional(),
        })
        .safeParse(req.body);

      if (body.success && body.data.refreshToken) {
        // Отзываем конкретный refresh token
        await app.revokeRefreshToken(body.data.refreshToken);
      }

      return { success: true, message: "Logged out successfully" };
    },
  );

  // Logout everywhere - отзыв всех refresh tokens пользователя
  app.post(
    "/api/auth/logout-all",
    { preHandler: [app.auth] },
    async (req: FastifyRequest) => {
      const userId = req.user.sub;
      await app.revokeAllUserTokens(userId);
      return { success: true, message: "Logged out from all devices" };
    },
  );

  app.get(
    "/api/auth/me",
    { preHandler: [app.auth] },
    async (req: FastifyRequest) => {
      return { user: { id: req.user.sub, email: req.user.email } };
    },
  );
}
