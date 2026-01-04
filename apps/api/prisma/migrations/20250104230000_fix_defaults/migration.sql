-- Fix default values for ID columns to use database-level generation
-- This requires pgcrypto extension for gen_random_uuid()

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Projects
ALTER TABLE projects ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE projects ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE projects ALTER COLUMN updated_at SET DEFAULT NOW();

-- Users
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE users ALTER COLUMN "createdAt" SET DEFAULT NOW();

-- Articles
ALTER TABLE articles ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE articles ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE articles ALTER COLUMN updated_at SET DEFAULT NOW();

-- Documents
ALTER TABLE documents ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE documents ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE documents ALTER COLUMN updated_at SET DEFAULT NOW();

-- Citations
ALTER TABLE citations ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE citations ALTER COLUMN created_at SET DEFAULT NOW();

-- Project Statistics
ALTER TABLE project_statistics ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE project_statistics ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE project_statistics ALTER COLUMN updated_at SET DEFAULT NOW();

-- Search Queries
ALTER TABLE search_queries ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE search_queries ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE search_queries ALTER COLUMN updated_at SET DEFAULT NOW();
