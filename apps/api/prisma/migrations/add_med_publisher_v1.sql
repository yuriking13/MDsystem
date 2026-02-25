-- Medical publisher workflow (author + reviewer + timeline)
-- Idempotent migration for manual SQL deployment

CREATE TABLE IF NOT EXISTS med_publisher_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  abstract TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  manuscript TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  handling_editor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  CONSTRAINT med_publisher_submissions_status_check
    CHECK (status IN ('draft', 'submitted', 'under_review', 'revision_requested', 'accepted', 'rejected', 'published'))
);

ALTER TABLE med_publisher_submissions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE med_publisher_submissions
  ADD COLUMN IF NOT EXISTS handling_editor_id TEXT;
ALTER TABLE med_publisher_submissions
  ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE med_publisher_submissions
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE med_publisher_submissions
  ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ;
ALTER TABLE med_publisher_submissions
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE med_publisher_submissions
    DROP CONSTRAINT med_publisher_submissions_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_submissions
    ADD CONSTRAINT med_publisher_submissions_status_check
    CHECK (status IN ('draft', 'submitted', 'under_review', 'revision_requested', 'accepted', 'rejected', 'published'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_med_publisher_submissions_created_by
  ON med_publisher_submissions(created_by);
CREATE INDEX IF NOT EXISTS idx_med_publisher_submissions_handling_editor
  ON med_publisher_submissions(handling_editor_id);
CREATE INDEX IF NOT EXISTS idx_med_publisher_submissions_project_id
  ON med_publisher_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_med_publisher_submissions_status
  ON med_publisher_submissions(status);
CREATE INDEX IF NOT EXISTS idx_med_publisher_submissions_updated_at
  ON med_publisher_submissions(updated_at DESC);

CREATE TABLE IF NOT EXISTS med_publisher_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  recommendation TEXT,
  public_comment TEXT,
  confidential_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT med_publisher_reviews_status_check
    CHECK (status IN ('assigned', 'submitted')),
  CONSTRAINT med_publisher_reviews_recommendation_check
    CHECK (recommendation IS NULL OR recommendation IN ('accept', 'minor_revision', 'major_revision', 'reject')),
  CONSTRAINT med_publisher_reviews_submission_reviewer_unique
    UNIQUE (submission_id, reviewer_id)
);

ALTER TABLE med_publisher_reviews
  ADD COLUMN IF NOT EXISTS recommendation TEXT;
ALTER TABLE med_publisher_reviews
  ADD COLUMN IF NOT EXISTS public_comment TEXT;
ALTER TABLE med_publisher_reviews
  ADD COLUMN IF NOT EXISTS confidential_comment TEXT;
ALTER TABLE med_publisher_reviews
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE med_publisher_reviews
    DROP CONSTRAINT med_publisher_reviews_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_reviews
    ADD CONSTRAINT med_publisher_reviews_status_check
    CHECK (status IN ('assigned', 'submitted'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_reviews
    DROP CONSTRAINT med_publisher_reviews_recommendation_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_reviews
    ADD CONSTRAINT med_publisher_reviews_recommendation_check
    CHECK (recommendation IS NULL OR recommendation IN ('accept', 'minor_revision', 'major_revision', 'reject'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_med_publisher_reviews_submission_id
  ON med_publisher_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_med_publisher_reviews_reviewer_id
  ON med_publisher_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_med_publisher_reviews_status
  ON med_publisher_reviews(status);

CREATE TABLE IF NOT EXISTS med_publisher_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_label TEXT NOT NULL,
  actor_user_id TEXT,
  actor_role TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS med_publisher_editors (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'editor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_publish BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT med_publisher_editors_role_check
    CHECK (role IN ('editor', 'chief_editor'))
);

ALTER TABLE med_publisher_editors
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'editor';
ALTER TABLE med_publisher_editors
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE med_publisher_editors
  ADD COLUMN IF NOT EXISTS can_publish BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE med_publisher_editors
  ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE med_publisher_editors
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE med_publisher_editors
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE med_publisher_editors
    DROP CONSTRAINT med_publisher_editors_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_editors
    ADD CONSTRAINT med_publisher_editors_role_check
    CHECK (role IN ('editor', 'chief_editor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_med_publisher_editors_role_active
  ON med_publisher_editors(role, is_active);
CREATE INDEX IF NOT EXISTS idx_med_publisher_editors_created_by
  ON med_publisher_editors(created_by);

CREATE INDEX IF NOT EXISTS idx_med_publisher_timeline_submission_created
  ON med_publisher_timeline_events(submission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_med_publisher_timeline_actor_user
  ON med_publisher_timeline_events(actor_user_id);

DO $$ BEGIN
  ALTER TABLE med_publisher_submissions
    ADD CONSTRAINT med_publisher_submissions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_submissions
    ADD CONSTRAINT med_publisher_submissions_handling_editor_id_fkey
    FOREIGN KEY (handling_editor_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_submissions
    ADD CONSTRAINT med_publisher_submissions_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_reviews
    ADD CONSTRAINT med_publisher_reviews_submission_id_fkey
    FOREIGN KEY (submission_id) REFERENCES med_publisher_submissions(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_reviews
    ADD CONSTRAINT med_publisher_reviews_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_editors
    ADD CONSTRAINT med_publisher_editors_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_editors
    ADD CONSTRAINT med_publisher_editors_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE med_publisher_timeline_events
    ADD CONSTRAINT med_publisher_timeline_submission_id_fkey
    FOREIGN KEY (submission_id) REFERENCES med_publisher_submissions(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO med_publisher_editors (user_id, role, is_active, can_publish, created_by)
SELECT u.id, 'chief_editor', true, true, u.id
FROM users u
WHERE u.is_admin = true
ON CONFLICT (user_id) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE med_publisher_timeline_events
    ADD CONSTRAINT med_publisher_timeline_actor_user_id_fkey
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
