import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "./env.js";
import { pool } from "./pg.js";
import crypto from "crypto";

declare module "fastify" {
  interface FastifyInstance {
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    generateTokens: (
      userId: string,
      email: string,
    ) => Promise<{ accessToken: string; refreshToken: string }>;
    verifyRefreshToken: (
      refreshToken: string,
    ) => Promise<{ userId: string; email: string } | null>;
    revokeRefreshToken: (refreshToken: string) => Promise<boolean>;
    revokeAllUserTokens: (userId: string) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      type?: "access" | "refresh";
      iat?: number;
      exp?: number;
    };
    user: {
      sub: string;
      email: string;
      type?: "access" | "refresh";
      iat?: number;
      exp?: number;
    };
  }
}

/**
 * Генерация безопасного токена
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Хеширование токена для хранения в БД
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Парсинг строки времени (15m, 1h, 7d) в миллисекунды
 */
function parseExpiration(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${exp}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.ACCESS_TOKEN_EXPIRES,
    },
  });

  /**
   * Генерация пары токенов (access + refresh)
   */
  const generateTokens = async (
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    // Access token - короткоживущий JWT
    const accessToken = app.jwt.sign(
      { sub: userId, email, type: "access" },
      { expiresIn: env.ACCESS_TOKEN_EXPIRES },
    );

    // Refresh token - случайная строка, хранится в БД
    const refreshToken = generateSecureToken();
    const tokenHash = hashToken(refreshToken);

    // Вычисляем время истечения refresh токена
    const refreshExpiresMs = parseExpiration(env.REFRESH_TOKEN_EXPIRES);
    const expiresAt = new Date(Date.now() + refreshExpiresMs);

    // Сохраняем refresh token в БД
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );

    return { accessToken, refreshToken };
  };

  /**
   * Проверка и обновление refresh токена
   */
  const verifyRefreshToken = async (
    refreshToken: string,
  ): Promise<{ userId: string; email: string } | null> => {
    const tokenHash = hashToken(refreshToken);

    // Ищем токен в БД
    const result = await pool.query(
      `SELECT rt.user_id, u.email, rt.expires_at
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked = false`,
      [tokenHash],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const { user_id: userId, email, expires_at: expiresAt } = result.rows[0];

    // Проверяем срок действия
    if (new Date(expiresAt) < new Date()) {
      // Токен истёк - удаляем его
      await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
        tokenHash,
      ]);
      return null;
    }

    return { userId, email };
  };

  /**
   * Отзыв конкретного refresh токена (logout)
   */
  const revokeRefreshToken = async (refreshToken: string): Promise<boolean> => {
    const tokenHash = hashToken(refreshToken);
    const result = await pool.query(
      "UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1",
      [tokenHash],
    );
    return (result.rowCount ?? 0) > 0;
  };

  /**
   * Отзыв всех refresh токенов пользователя (logout everywhere)
   */
  const revokeAllUserTokens = async (userId: string): Promise<void> => {
    await pool.query(
      "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
      [userId],
    );
  };

  // Декораторы
  app.decorate("generateTokens", generateTokens);
  app.decorate("verifyRefreshToken", verifyRefreshToken);
  app.decorate("revokeRefreshToken", revokeRefreshToken);
  app.decorate("revokeAllUserTokens", revokeAllUserTokens);

  const authHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();

      // Проверяем что это access token, а не refresh
      if (req.user.type === "refresh") {
        return reply
          .code(401)
          .send({
            error: "InvalidTokenType",
            message: "Access token required",
          });
      }
    } catch (err) {
      const error = err as Error;
      // Различаем типы ошибок для лучшего UX
      if (error.name === "TokenExpiredError") {
        return reply.code(401).send({
          error: "TokenExpired",
          message: "Token has expired. Please refresh or log in again.",
        });
      }
      return reply.code(401).send({ error: "Unauthorized" });
    }
  };

  // Декоратор auth (для обратной совместимости)
  app.decorate("auth", authHandler);
  // Декоратор authenticate (для settings.ts и новых routes)
  app.decorate("authenticate", authHandler);
});
