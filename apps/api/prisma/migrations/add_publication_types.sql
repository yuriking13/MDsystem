-- Добавление типа публикации в статьи

-- Колонка для типов публикации (массив)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS publication_types TEXT[] DEFAULT '{}';

-- Колонка для качества статистики (ранжирование)
-- 1 = p<0.05, 2 = p<0.01, 3 = p<0.001
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS stats_quality INT DEFAULT 0;

-- Индекс для фильтрации по типу публикации
CREATE INDEX IF NOT EXISTS idx_articles_pub_types ON articles USING GIN (publication_types);

-- Индекс для сортировки по качеству статистики
CREATE INDEX IF NOT EXISTS idx_articles_stats_quality ON articles (stats_quality DESC) WHERE stats_quality > 0;
