-- Миграция для исправления цитирования и добавления недостающих колонок
-- Применить ОДИН РАЗ на сервере

-- 1. Добавляем недостающие колонки в articles для библиографии
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS volume VARCHAR(50),
ADD COLUMN IF NOT EXISTS issue VARCHAR(50),
ADD COLUMN IF NOT EXISTS pages VARCHAR(50);

-- 2. Добавляем колонку для хранения поискового запроса (для группировки)
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS search_queries TEXT[] DEFAULT '{}';

-- 3. Добавляем колонку в project_articles для хранения запроса при добавлении
ALTER TABLE project_articles
ADD COLUMN IF NOT EXISTS source_query TEXT;

-- 4. Убираем уникальный индекс на citations чтобы можно было добавить несколько цитат
DROP INDEX IF EXISTS idx_citations_unique;

-- 5. Добавляем колонку для нумерации цитаты внутри источника (n#1, n#2)
ALTER TABLE citations
ADD COLUMN IF NOT EXISTS sub_number INT DEFAULT 1;

-- 6. Индексы для поиска по запросам
CREATE INDEX IF NOT EXISTS idx_articles_search_queries ON articles USING gin(search_queries);
CREATE INDEX IF NOT EXISTS idx_project_articles_source_query ON project_articles(source_query);

-- Комментарии
COMMENT ON COLUMN articles.search_queries IS 'Список поисковых запросов, по которым найдена статья';
COMMENT ON COLUMN project_articles.source_query IS 'Поисковый запрос, по которому статья добавлена в проект';
COMMENT ON COLUMN citations.sub_number IS 'Номер цитаты внутри источника (1, 2, 3...)';
