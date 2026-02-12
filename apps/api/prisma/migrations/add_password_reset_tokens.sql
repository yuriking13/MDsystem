-- Password Reset Tokens Table
-- Stores secure tokens for password reset flow
-- Tokens are hashed (SHA-256) before storage for security

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash (32 bytes = 64 hex chars)
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_password_reset_tokens_user_id (user_id),
  INDEX idx_password_reset_tokens_token_hash (token_hash),
  INDEX idx_password_reset_tokens_expires_at (expires_at)
);

-- Add comment for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens (hashed) with expiry';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiry time (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether the token has been used to reset password';

-- Cleanup old/expired tokens periodically (can be run as a cron job)
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL '7 days';
