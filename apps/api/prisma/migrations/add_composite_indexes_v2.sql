-- P3: Composite indexes for heavy filtered/sorted paths.
-- Safe to run multiple times.

-- Accelerates /api/projects/:id/articles with status + added_at sort
CREATE INDEX IF NOT EXISTS idx_project_articles_project_status_added_at
  ON project_articles(project_id, status, added_at DESC);

-- Accelerates /api/projects/:id/articles filtering by source_query
CREATE INDEX IF NOT EXISTS idx_project_articles_project_source_status_added_at
  ON project_articles(project_id, source_query, status, added_at DESC)
  WHERE source_query IS NOT NULL;

-- Accelerates active graph fetch job checks and dashboards
CREATE INDEX IF NOT EXISTS idx_graph_fetch_jobs_project_active_created_at
  ON graph_fetch_jobs(project_id, status, created_at DESC)
  WHERE status IN ('pending', 'running');

-- Covers common graph cache lifecycle queries
CREATE INDEX IF NOT EXISTS idx_graph_cache_project_expires_at
  ON graph_cache(project_id, expires_at);
