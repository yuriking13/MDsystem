-- Добавляем колонки для хранения DOI-связей (для DOAJ, Wiley, Crossref статей)
-- reference_dois - DOIs статей, на которые ссылается данная статья
-- cited_by_count - количество цитирований из Crossref

ALTER TABLE articles ADD COLUMN IF NOT EXISTS reference_dois TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE articles ADD COLUMN IF NOT EXISTS crossref_cited_by_count INTEGER;

-- Индекс для поиска по reference_dois (GIN для массивов)
CREATE INDEX IF NOT EXISTS idx_articles_reference_dois ON articles USING GIN (reference_dois);

COMMENT ON COLUMN articles.reference_dois IS 'DOIs статей, на которые ссылается (из Crossref)';
COMMENT ON COLUMN articles.crossref_cited_by_count IS 'Количество цитирований из Crossref is-referenced-by-count';
