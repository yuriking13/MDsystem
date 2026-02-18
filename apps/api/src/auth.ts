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

type BlockStatusCacheEntry = {
  isBlocked: boolean;
  expiresAt: number;
};

const BLOCK_STATUS_CACHE_TTL_MS = 10_000;
const blockedStatusCache = new Map<string, BlockStatusCacheEntry>();
const MAX_ACTIVE_REFRESH_TOKENS_PER_USER = 5;

type JwtTokenWithKid = {
  header?: {
    kid?: string;
  };
};

export default fp(async (app: FastifyInstance) => {
  const jwtSecretsByKid = new Map<string, string>([
    [env.JWT_SECRET_KID, env.JWT_SECRET],
  ]);

  if (env.JWT_SECRET_PREVIOUS) {
    jwtSecretsByKid.set(env.JWT_SECRET_PREVIOUS_KID, env.JWT_SECRET_PREVIOUS);
    app.log.warn(
      {
        activeKid: env.JWT_SECRET_KID,
        previousKid: env.JWT_SECRET_PREVIOUS_KID,
      },
      "JWT secret rotation is enabled",
    );
  }

  const selectJwtSecret = (token?: JwtTokenWithKid): string => {
    const tokenKid = token?.header?.kid;

    if (tokenKid) {
      const secretForKid = jwtSecretsByKid.get(tokenKid);
      if (!secretForKid) {
        throw new Error(`Unknown JWT key id: ${tokenKid}`);
      }
      return secretForKid;
    }

    // Legacy (no kid) tokens from pre-rotation deployments.
    if (env.JWT_SECRET_PREVIOUS) {
      return env.JWT_SECRET_PREVIOUS;
    }
    return env.JWT_SECRET;
  };

  await app.register(jwt, {
    secret: (_request: FastifyRequest, token: JwtTokenWithKid) =>
      selectJwtSecret(token),
    sign: {
      expiresIn: env.ACCESS_TOKEN_EXPIRES,
      header: {
        alg: "HS256",
        kid: env.JWT_SECRET_KID,
      },
    },
  });

  /**
   * Удаляем явно неактуальные refresh tokens пользователя
   * (истёкшие и уже отозванные).
   */
  const cleanupUserRefreshTokens = async (userId: string): Promise<void> => {
    await pool.query(
      `DELETE FROM refresh_tokens
       WHERE user_id = $1
         AND (revoked = true OR expires_at < now())`,
      [userId],
    );
  };

  /**
   * Ограничиваем число активных refresh tokens на пользователя.
   * Сохраняем только самые свежие токены, остальные отзываем.
   */
  const enforceRefreshTokenLimit = async (
    userId: string,
    maxActiveTokens: number,
  ): Promise<void> => {
    await pool.query(
      `WITH ranked AS (
         SELECT id,
                ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS rn
         FROM refresh_tokens
         WHERE user_id = $1
           AND revoked = false
           AND expires_at > now()
       )
       UPDATE refresh_tokens rt
       SET revoked = true
       FROM ranked
       WHERE rt.id = ranked.id
         AND ranked.rn > $2`,
      [userId, maxActiveTokens],
    );
  };

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

    // Opportunistic cleanup + bounded active sessions per user.
    await cleanupUserRefreshTokens(userId);
    await enforceRefreshTokenLimit(userId, MAX_ACTIVE_REFRESH_TOKENS_PER_USER);

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
      `SELECT rt.user_id, u.email, u.is_blocked, rt.expires_at
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked = false`,
      [tokenHash],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const {
      user_id: userId,
      email,
      is_blocked: isBlocked,
      expires_at: expiresAt,
    } = result.rows[0];

    // Проверяем срок действия
    if (new Date(expiresAt) < new Date()) {
      // Токен истёк - удаляем его
      await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
        tokenHash,
      ]);
      return null;
    }

    // Мгновенная инвалидизация blocked пользователей в refresh-потоке.
    if (isBlocked) {
      blockedStatusCache.set(userId, {
        isBlocked: true,
        expiresAt: Date.now() + BLOCK_STATUS_CACHE_TTL_MS,
      });
      await pool.query(
        "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false",
        [userId],
      );
      return null;
    }

    blockedStatusCache.set(userId, {
      isBlocked: false,
      expiresAt: Date.now() + BLOCK_STATUS_CACHE_TTL_MS,
    });

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

  const isUserBlocked = async (userId: string): Promise<boolean> => {
    const cached = blockedStatusCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.isBlocked;
    }

    const result = await pool.query(
      "SELECT is_blocked FROM users WHERE id = $1",
      [userId],
    );
    const isBlocked =
      (result.rowCount ?? 0) > 0 && Boolean(result.rows[0].is_blocked);

    blockedStatusCache.set(userId, {
      isBlocked,
      expiresAt: Date.now() + BLOCK_STATUS_CACHE_TTL_MS,
    });

    return isBlocked;
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
        return reply.code(401).send({
          error: "InvalidTokenType",
          message: "Access token required",
        });
      }

      // Дополнительная защита: даже живой access-token не должен работать
      // для пользователя, которого только что заблокировали админом.
      const userId = req.user?.sub;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      if (await isUserBlocked(userId)) {
        await revokeAllUserTokens(userId);
        return reply.code(403).send({
          error: "AccountBlocked",
          message: "User account is blocked",
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
