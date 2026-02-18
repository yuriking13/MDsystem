-- Rollback for add_composite_indexes_v2.sql

DROP INDEX IF EXISTS idx_graph_cache_project_expires_at;
DROP INDEX IF EXISTS idx_graph_fetch_jobs_project_active_created_at;
DROP INDEX IF EXISTS idx_project_articles_project_source_status_added_at;
DROP INDEX IF EXISTS idx_project_articles_project_status_added_at;
