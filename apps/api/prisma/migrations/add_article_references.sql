-- Миграция для добавления references к статьям
-- Применить ОДИН РАЗ на сервере

-- Добавляем колонки для хранения связей между статьями
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS reference_pmids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cited_by_pmids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS references_fetched_at TIMESTAMPTZ;

-- Индексы для быстрого поиска связей
CREATE INDEX IF NOT EXISTS idx_articles_reference_pmids ON articles USING gin(reference_pmids);
CREATE INDEX IF NOT EXISTS idx_articles_cited_by_pmids ON articles USING gin(cited_by_pmids);

-- Комментарии для документации
COMMENT ON COLUMN articles.reference_pmids IS 'PMIDs статей, на которые ссылается эта статья (исходящие связи)';
COMMENT ON COLUMN articles.cited_by_pmids IS 'PMIDs статей, которые цитируют эту статью (входящие связи)';
COMMENT ON COLUMN articles.references_fetched_at IS 'Когда последний раз были получены данные о references';
