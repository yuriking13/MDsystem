-- =====================================================
-- Performance Indexes Migration
-- Добавляет индексы для ускорения частых запросов
-- =====================================================

-- Индексы для таблицы articles
-- ==============================

-- Ускоряет поиск статей по PMID (часто используется в PubMed интеграции)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_pmid ON articles(pmid) WHERE pmid IS NOT NULL;

-- Ускоряет поиск статей по DOI (используется в Crossref, DOAJ, Wiley)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_doi ON articles(doi) WHERE doi IS NOT NULL;

-- Ускоряет фильтрацию по году публикации
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_year ON articles(year) WHERE year IS NOT NULL;

-- Ускоряет поиск статей с статистикой (has_stats = true)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_has_stats ON articles(has_stats) WHERE has_stats = true;

-- Составной индекс для поиска статей по источнику
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_source ON articles(source);

-- Индекс для поиска статей с загруженными references
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_refs_fetched ON articles(references_fetched_at) WHERE references_fetched_at IS NOT NULL;


-- Индексы для таблицы project_articles
-- =====================================

-- Ускоряет получение статей проекта (очень частый запрос)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_articles_project_id ON project_articles(project_id);

-- Ускоряет фильтрацию по статусу (candidate, selected, excluded)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_articles_status ON project_articles(status);

-- Составной индекс для получения статей проекта с фильтром по статусу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_articles_proj_status ON project_articles(project_id, status);

-- Индекс для поиска по article_id (обратные lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_articles_article_id ON project_articles(article_id);


-- Индексы для таблицы project_members
-- =====================================

-- Ускоряет checkProjectAccess (вызывается на КАЖДОМ запросе)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Составной индекс для быстрой проверки доступа (project_id + user_id)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_proj_user ON project_members(project_id, user_id);


-- Индексы для таблицы documents
-- ==============================

-- Ускоряет получение документов проекта
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- Ускоряет сортировку по order_index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_order ON documents(project_id, order_index);


-- Индексы для таблицы citations
-- ==============================

-- Ускоряет получение цитат документа
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citations_document_id ON citations(document_id);

-- Индекс для поиска по article_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citations_article_id ON citations(article_id);

-- Составной индекс для сортировки цитат
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citations_doc_order ON citations(document_id, inline_number, order_index);


-- Индексы для таблицы project_statistics
-- ========================================

-- Ускоряет получение статистики проекта
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_statistics_project_id ON project_statistics(project_id);


-- Индексы для таблицы project_files
-- ==================================

-- Ускоряет получение файлов проекта
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- Индекс для фильтрации по категории
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_files_category ON project_files(project_id, category) WHERE category IS NOT NULL;


-- Индексы для таблицы graph_fetch_jobs
-- =====================================

-- Ускоряет поиск активных jobs проекта
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_fetch_jobs_proj_status ON graph_fetch_jobs(project_id, status);


-- Индексы для таблицы search_queries (если существует)
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_project_id ON search_queries(project_id);


-- Индексы для полнотекстового поиска по статьям
-- ==============================================

-- GIN индекс для поиска по заголовкам (английский)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_title_en_gin 
ON articles USING gin(to_tsvector('english', COALESCE(title_en, '')));

-- GIN индекс для поиска по абстрактам (английский)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_abstract_en_gin 
ON articles USING gin(to_tsvector('english', COALESCE(abstract_en, '')));


-- =====================================================
-- ANALYZE для обновления статистики планировщика
-- =====================================================

ANALYZE articles;
ANALYZE project_articles;
ANALYZE project_members;
ANALYZE documents;
ANALYZE citations;
ANALYZE project_statistics;
ANALYZE project_files;
