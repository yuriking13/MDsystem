-- ============================================
-- Миграция: Upgrade IVFFLAT → HNSW индекс
-- ============================================
-- HNSW (Hierarchical Navigable Small World) быстрее и точнее для pgvector
-- Требует pgvector >= 0.5.0
--
-- Преимущества HNSW над IVFFLAT:
-- - Не требует VACUUM для поддержания эффективности
-- - Более быстрый поиск (особенно на больших данных)
-- - Лучший recall (точность) при том же времени поиска
-- - Поддерживает параллельное построение индекса

-- 1. Проверяем версию pgvector (должна быть >= 0.5.0)
DO $$
DECLARE
  pgvector_version TEXT;
BEGIN
  SELECT extversion INTO pgvector_version 
  FROM pg_extension WHERE extname = 'vector';
  
  IF pgvector_version IS NULL THEN
    RAISE EXCEPTION 'pgvector extension not installed';
  END IF;
  
  RAISE NOTICE 'Current pgvector version: %', pgvector_version;
  
  -- Версия должна быть >= 0.5.0 для HNSW
  IF pgvector_version < '0.5.0' THEN
    RAISE WARNING 'pgvector version % is too old for HNSW. Trying to update...', pgvector_version;
  END IF;
END $$;

-- 2. Попробуем обновить pgvector до последней версии
ALTER EXTENSION vector UPDATE;

-- 3. Удаляем старый IVFFLAT индекс
DROP INDEX IF EXISTS article_embeddings_vector_idx;

-- 4. Создаём новый HNSW индекс
-- Параметры:
--   m = 16: количество двунаправленных связей (16 - хороший баланс)
--   ef_construction = 64: качество построения (больше = точнее, но дольше)
CREATE INDEX article_embeddings_hnsw_idx 
  ON article_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Для оптимальной производительности поиска устанавливаем ef_search
-- Это можно также добавить в postgresql.conf для постоянной настройки
-- ВАЖНО: Выполните это отдельно или добавьте в postgresql.conf:
-- SET hnsw.ef_search = 100;

-- 6. Проверяем что индекс создан
DO $$
DECLARE
  idx_count INT;
BEGIN
  SELECT COUNT(*) INTO idx_count 
  FROM pg_indexes 
  WHERE indexname = 'article_embeddings_hnsw_idx';
  
  IF idx_count > 0 THEN
    RAISE NOTICE '✅ HNSW index created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create HNSW index';
  END IF;
END $$;

-- 7. Выводим информацию о размере индекса
SELECT 
  pg_size_pretty(pg_relation_size('article_embeddings_hnsw_idx')) as index_size,
  (SELECT COUNT(*) FROM article_embeddings) as total_embeddings;

COMMENT ON INDEX article_embeddings_hnsw_idx IS 
  'HNSW index for fast semantic similarity search. Updated from IVFFLAT for better performance.';
