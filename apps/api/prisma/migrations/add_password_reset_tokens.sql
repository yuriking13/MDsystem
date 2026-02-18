-- Migration: add_password_reset_tokens.sql
-- Purpose: password reset token storage with idempotent PostgreSQL DDL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward-compatible self-healing for partially applied/legacy table shapes.
ALTER TABLE password_reset_tokens
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used BOOLEAN,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE password_reset_tokens
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE password_reset_tokens
  ALTER COLUMN id TYPE TEXT USING id::text,
  ALTER COLUMN user_id TYPE TEXT USING user_id::text,
  ALTER COLUMN token_hash TYPE VARCHAR(64),
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at::timestamptz,
  ALTER COLUMN used TYPE BOOLEAN USING COALESCE(used, FALSE),
  ALTER COLUMN used_at TYPE TIMESTAMPTZ USING used_at::timestamptz,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;

ALTER TABLE password_reset_tokens
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN token_hash SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN used SET DEFAULT FALSE,
  ALTER COLUMN created_at SET DEFAULT NOW();

UPDATE password_reset_tokens
SET
  id = COALESCE(NULLIF(id, ''), gen_random_uuid()::text),
  used = COALESCE(used, FALSE),
  created_at = COALESCE(created_at, NOW());

-- Reset tokens are ephemeral; malformed legacy rows should not block migration.
DELETE FROM password_reset_tokens
WHERE user_id IS NULL OR token_hash IS NULL OR expires_at IS NULL;

ALTER TABLE password_reset_tokens
  ALTER COLUMN used SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'password_reset_tokens'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE password_reset_tokens
      ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'password_reset_tokens'::regclass
      AND contype = 'f'
      AND confrelid = 'users'::regclass
  ) THEN
    ALTER TABLE password_reset_tokens
      ADD CONSTRAINT password_reset_tokens_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'password_reset_tokens'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND indexdef ILIKE '%token_hash%'
  ) THEN
    CREATE UNIQUE INDEX idx_password_reset_tokens_token_hash
      ON password_reset_tokens (token_hash);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_expires_at
  ON password_reset_tokens (used, expires_at);

COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens (hashed) with expiry';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiry time (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether the token has been used to reset password';
