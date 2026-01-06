-- Reset pg-boss schema
-- This script drops the old boss schema so pg-boss can recreate it with correct structure
-- pg-boss automatically creates all required tables, types and indexes on start()

-- Drop the entire boss schema if it exists (including all tables and types)
DROP SCHEMA IF EXISTS boss CASCADE;

-- pg-boss will automatically create:
-- - boss schema
-- - boss.job_state enum
-- - boss.job table (partitioned)
-- - boss.queue table
-- - boss.schedule table
-- - boss.subscription table
-- - boss.version table
-- - All required indexes
