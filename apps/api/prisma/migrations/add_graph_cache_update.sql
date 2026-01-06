-- Обновление таблицы graph_cache для связи с проектами
-- Выполнить после создания базовой таблицы graph_cache

-- Добавляем колонку project_id если её нет
ALTER TABLE graph_cache ADD COLUMN IF NOT EXISTS project_id UUID;

-- Создаём индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_graph_cache_project_id ON graph_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_cache_pmid ON graph_cache(pmid);
CREATE INDEX IF NOT EXISTS idx_graph_cache_expires ON graph_cache(expires_at);

-- Внешний ключ к проектам (опционально, можно закомментировать если не нужен)
-- ALTER TABLE graph_cache ADD CONSTRAINT fk_graph_cache_project 
--   FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Таблица для отслеживания прогресса загрузки связей
CREATE TABLE IF NOT EXISTS graph_fetch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  total_articles INT DEFAULT 0,
  processed_articles INT DEFAULT 0,
  total_pmids_to_fetch INT DEFAULT 0,
  fetched_pmids INT DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_fetch_jobs_project ON graph_fetch_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_fetch_jobs_status ON graph_fetch_jobs(status);

-- Обновляем expires_at по умолчанию на 30 дней
ALTER TABLE graph_cache ALTER COLUMN expires_at SET DEFAULT now() + interval '30 days';
