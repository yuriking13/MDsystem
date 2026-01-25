-- Migration: Add user blocking and password reset fields
-- Date: 2026-01-25

-- Add blocking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_activity_recent ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_recent ON system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_unresolved ON system_error_logs(resolved, created_at DESC) WHERE resolved = false;

-- Add timestamp to admin audit log if missing
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
