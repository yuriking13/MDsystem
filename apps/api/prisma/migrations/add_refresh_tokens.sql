-- Migration: Add refresh tokens table
-- Run this SQL in Adminer to add support for refresh tokens

-- Создаём таблицу refresh_tokens для хранения refresh токенов
-- ВАЖНО: user_id имеет тип TEXT, как и id в таблице users
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash токена
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индекс для поиска токенов по user_id (для logout-all)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Индекс для поиска неотозванных токенов по хешу
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(token_hash) WHERE revoked = false;

-- Индекс для очистки истёкших токенов
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Комментарии к таблице
COMMENT ON TABLE refresh_tokens IS 'Хранение refresh токенов для JWT аутентификации';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA256 хеш refresh токена (сам токен не хранится)';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Флаг отозванного токена (при logout)';

-- Функция для периодической очистки истёкших токенов (опционально)
-- Можно вызывать через pg_cron или pg-boss job
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < now() OR revoked = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_refresh_tokens IS 'Удаляет истёкшие и отозванные refresh токены';
