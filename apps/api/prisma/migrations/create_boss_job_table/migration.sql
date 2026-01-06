-- CreateTable boss.job (manually created with correct pg-boss 10.4.0 schema)
-- Requires job_state enum to be created first
CREATE TYPE IF NOT EXISTS boss.job_state AS ENUM ('created', 'active', 'completed', 'expired', 'cancelled', 'failed');

CREATE TABLE IF NOT EXISTS boss.job (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  data jsonb,
  state boss.job_state NOT NULL DEFAULT 'created',
  retry_limit integer NOT NULL DEFAULT 2,
  retry_count integer NOT NULL DEFAULT 0,
  retry_delay integer NOT NULL DEFAULT 0,
  retry_backoff boolean NOT NULL DEFAULT false,
  start_after timestamp with time zone NOT NULL DEFAULT now(),
  started_on timestamp with time zone,
  singleton_key text,
  singleton_on timestamp without time zone,
  expire_in interval NOT NULL DEFAULT '15 minutes',
  created_on timestamp with time zone NOT NULL DEFAULT now(),
  completed_on timestamp with time zone,
  keep_until timestamp with time zone NOT NULL DEFAULT now() + interval '14 days',
  output jsonb,
  dead_letter text,
  policy text,
  PRIMARY KEY (name, id)
) PARTITION BY LIST (name);

-- Indexes for job table
CREATE INDEX IF NOT EXISTS idx_job_name_start_after ON boss.job (name, start_after) INCLUDE (priority, created_on, id) WHERE state < 'active'::boss.job_state;
CREATE INDEX IF NOT EXISTS idx_job_name_singleton ON boss.job (name, COALESCE(singleton_key, '')) WHERE state = 'created'::boss.job_state AND policy = 'short';
CREATE INDEX IF NOT EXISTS idx_job_singleton_on ON boss.job (name, singleton_on, COALESCE(singleton_key, '')) WHERE state != 'cancelled'::boss.job_state AND singleton_on IS NOT NULL;
