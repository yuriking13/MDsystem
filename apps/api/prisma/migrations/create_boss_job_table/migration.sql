-- CreateTable boss.job (manually created since pg-boss doesn't reliably create it)
CREATE TABLE IF NOT EXISTS boss.job (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'created',
  retrylimit integer NOT NULL DEFAULT 0,
  retrycount integer NOT NULL DEFAULT 0,
  retrydelay integer NOT NULL DEFAULT 0,
  retrybackoff boolean NOT NULL DEFAULT false,
  startafter timestamp with time zone NOT NULL DEFAULT now(),
  startedon timestamp with time zone,
  singletonkey text,
  singletonon timestamp with time zone,
  expirein interval NOT NULL DEFAULT '15 minutes'::interval,
  createdon timestamp with time zone NOT NULL DEFAULT now(),
  completedon timestamp with time zone,
  data jsonb,
  output jsonb,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_job_name ON boss.job(name);
CREATE INDEX IF NOT EXISTS idx_job_state ON boss.job(state);
CREATE INDEX IF NOT EXISTS idx_job_singletonkey ON boss.job(singletonkey) WHERE singletonkey IS NOT NULL;
