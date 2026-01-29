-- Таблица для хранения семантических кластеров
CREATE TABLE IF NOT EXISTS semantic_clusters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    central_article_id TEXT REFERENCES articles(id) ON DELETE SET NULL,
    avg_internal_similarity FLOAT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица связей статей с кластерами
CREATE TABLE IF NOT EXISTS semantic_cluster_articles (
    cluster_id TEXT NOT NULL REFERENCES semantic_clusters(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    similarity_to_center FLOAT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cluster_id, article_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS semantic_clusters_project_id_idx ON semantic_clusters(project_id);
CREATE INDEX IF NOT EXISTS semantic_cluster_articles_article_id_idx ON semantic_cluster_articles(article_id);
CREATE INDEX IF NOT EXISTS semantic_cluster_articles_cluster_id_idx ON semantic_cluster_articles(cluster_id);

-- Комментарии
COMMENT ON TABLE semantic_clusters IS 'Семантические кластеры статей проекта';
COMMENT ON TABLE semantic_cluster_articles IS 'Связь статей с семантическими кластерами';
COMMENT ON COLUMN semantic_clusters.central_article_id IS 'Центральная статья кластера (хаб)';
COMMENT ON COLUMN semantic_clusters.avg_internal_similarity IS 'Средняя схожесть внутри кластера';
