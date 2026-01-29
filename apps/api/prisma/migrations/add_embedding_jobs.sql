-- Migration: Add embedding_jobs table for async embedding generation
-- This table tracks background jobs for generating article embeddings

CREATE TABLE IF NOT EXISTS embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  include_references BOOLEAN NOT NULL DEFAULT true,
  include_cited_by BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying jobs by project
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_project_id ON embedding_jobs(project_id);

-- Index for querying active jobs
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status) WHERE status IN ('pending', 'running');

-- Index for user's jobs
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_user_id ON embedding_jobs(user_id);

-- Comments
COMMENT ON TABLE embedding_jobs IS 'Tracks async embedding generation jobs';
COMMENT ON COLUMN embedding_jobs.status IS 'Job status: pending, running, completed, failed, cancelled, timeout';
COMMENT ON COLUMN embedding_jobs.total IS 'Total articles to process';
COMMENT ON COLUMN embedding_jobs.processed IS 'Successfully processed articles';
COMMENT ON COLUMN embedding_jobs.errors IS 'Number of articles with errors';
