/**
 * Password Reset Flow
 * 1. POST /api/auth/forgot-password - отправка reset link
 * 2. POST /api/auth/reset-password - сброс пароля по токену
 * 3. POST /api/auth/verify-reset-token - проверка валидности токена
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { hashPassword } from "../lib/password.js";
import { rateLimits } from "../plugins/rate-limit.js";
import crypto from "crypto";
import { createLogger } from "../utils/logger.js";
import {
  ValidationError,
  NotFoundError,
  RateLimitError,
  InvalidTokenError,
} from "../utils/typed-errors.js";

const log = createLogger("password-reset");

// Время жизни reset token: 1 час
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Генерация безопасного reset token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Хеширование токена для хранения в БД
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Password strength validation
 */
function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { valid: false, message: "Password must not exceed 128 characters" };
  }

  // Check for at least one number, one letter
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (!hasNumber || !hasLetter) {
    return {
      valid: false,
      message: "Password must contain both letters and numbers",
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "12345678",
    "password123",
    "qwerty123",
    "admin123",
  ];
  if (
    commonPasswords.some((weak) => password.toLowerCase().includes(weak))
  ) {
    return { valid: false, message: "Password is too common" };
  }

  return { valid: true };
}

export async function passwordResetRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/forgot-password
   * Инициация процесса сброса пароля
   */
  app.post(
    "/api/auth/forgot-password",
    { preHandler: [rateLimits.passwordReset] },
    async (req, reply) => {
      const schema = z.object({
        email: z.string().email("Invalid email format"),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(
          "Invalid email",
          result.error.issues,
        );
      }

      const { email } = result.data;

      // Проверяем существование пользователя
      const userResult = await pool.query(
        "SELECT id, email, is_blocked FROM users WHERE email = $1",
        [email],
      );

      // Всегда возвращаем success даже если пользователь не найден
      // (защита от user enumeration)
      if (userResult.rowCount === 0) {
        log.info("Password reset requested for non-existent email", { email });
        return {
          success: true,
          message:
            "If the email exists, a password reset link has been sent",
        };
      }

      const user = userResult.rows[0];

      // Проверяем, не заблокирован ли пользователь
      if (user.is_blocked) {
        log.warn("Password reset attempted for blocked user", {
          userId: user.id,
        });
        return {
          success: true,
          message:
            "If the email exists, a password reset link has been sent",
        };
      }

      // Генерируем reset token
      const resetToken = generateResetToken();
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      // Используем транзакцию для атомарности
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Удаляем старые токены для этого пользователя
        await client.query(
          "DELETE FROM password_reset_tokens WHERE user_id = $1",
          [user.id],
        );

        // Создаём новый токен
        await client.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`,
          [user.id, tokenHash, expiresAt],
        );

        await client.query("COMMIT");

        // TODO: Отправить email с reset link
        // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        // await sendEmail(user.email, 'Password Reset', resetLink);

        log.info("Password reset token generated", {
          userId: user.id,
          expiresAt,
        });

        // В development режиме возвращаем токен (для тестирования)
        if (process.env.NODE_ENV === "development") {
          return {
            success: true,
            message: "Password reset link sent",
            devToken: resetToken, // ONLY for development!
          };
        }

        return {
          success: true,
          message:
            "If the email exists, a password reset link has been sent",
        };
      } catch (err) {
        await client.query("ROLLBACK");
        log.error("Failed to create reset token", err as Error);
        throw err;
      } finally {
        client.release();
      }
    },
  );

  /**
   * POST /api/auth/verify-reset-token
   * Проверка валидности reset token (перед отображением формы)
   */
  app.post("/api/auth/verify-reset-token", async (req, reply) => {
    const schema = z.object({
      token: z.string().min(1, "Reset token is required"),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(
        "Invalid token",
        result.error.issues,
      );
    }

    const { token } = result.data;
    const tokenHash = hashToken(token);

    const tokenResult = await pool.query(
      `SELECT rt.user_id, rt.expires_at, u.email, u.is_blocked
       FROM password_reset_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.used = false`,
      [tokenHash],
    );

    if (tokenResult.rowCount === 0) {
      throw new InvalidTokenError("Invalid or expired reset token");
    }

    const tokenData = tokenResult.rows[0];

    // Проверяем срок действия
    if (new Date(tokenData.expires_at) < new Date()) {
      // Удаляем истёкший токен
      await pool.query(
        "DELETE FROM password_reset_tokens WHERE token_hash = $1",
        [tokenHash],
      );
      throw new InvalidTokenError("Reset token has expired");
    }

    // Проверяем, не заблокирован ли пользователь
    if (tokenData.is_blocked) {
      throw new InvalidTokenError("User account is blocked");
    }

    return {
      valid: true,
      email: tokenData.email,
    };
  });

  /**
   * POST /api/auth/reset-password
   * Сброс пароля по токену
   */
  app.post(
    "/api/auth/reset-password",
    { preHandler: [rateLimits.passwordReset] },
    async (req, reply) => {
      const schema = z.object({
        token: z.string().min(1, "Reset token is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(
          "Invalid input",
          result.error.issues,
        );
      }

      const { token, password } = result.data;

      // Валидация силы пароля
      const strengthCheck = validatePasswordStrength(password);
      if (!strengthCheck.valid) {
        throw new ValidationError(
          strengthCheck.message || "Password is too weak",
        );
      }

      const tokenHash = hashToken(token);

      // Проверяем токен
      const tokenResult = await pool.query(
        `SELECT rt.user_id, rt.expires_at, u.email, u.is_blocked
         FROM password_reset_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND rt.used = false`,
        [tokenHash],
      );

      if (tokenResult.rowCount === 0) {
        throw new InvalidTokenError("Invalid or expired reset token");
      }

      const tokenData = tokenResult.rows[0];

      // Проверяем срок действия
      if (new Date(tokenData.expires_at) < new Date()) {
        await pool.query(
          "DELETE FROM password_reset_tokens WHERE token_hash = $1",
          [tokenHash],
        );
        throw new InvalidTokenError("Reset token has expired");
      }

      // Проверяем блокировку
      if (tokenData.is_blocked) {
        throw new InvalidTokenError("User account is blocked");
      }

      // Хешируем новый пароль
      const passwordHash = await hashPassword(password);

      // Используем транзакцию
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Обновляем пароль
        await client.query(
          `UPDATE users 
           SET password_hash = $1, password_reset_required = false
           WHERE id = $2`,
          [passwordHash, tokenData.user_id],
        );

        // Помечаем токен как использованный
        await client.query(
          `UPDATE password_reset_tokens 
           SET used = true, used_at = now()
           WHERE token_hash = $1`,
          [tokenHash],
        );

        // Отзываем все refresh токены для безопасности
        await client.query(
          "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
          [tokenData.user_id],
        );

        await client.query("COMMIT");

        log.info("Password successfully reset", {
          userId: tokenData.user_id,
        });

        return {
          success: true,
          message: "Password has been reset successfully",
        };
      } catch (err) {
        await client.query("ROLLBACK");
        log.error("Failed to reset password", err as Error);
        throw err;
      } finally {
        client.release();
      }
    },
  );
}
