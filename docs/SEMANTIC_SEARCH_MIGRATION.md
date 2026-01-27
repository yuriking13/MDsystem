# Semantic Search Migration Guide

## Быстрый старт

### 1. Установка pgvector extension

```bash
# Подключитесь к БД
psql $DATABASE_URL

# Включите pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Запуск миграции

```bash
cd /workspaces/MDsystem/apps/api
psql $DATABASE_URL -f prisma/migrations/add_semantic_search.sql
```

### 3. Проверка установки

```sql
-- Проверить наличие extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Проверить таблицу embeddings
\d article_embeddings

-- Должно показать:
-- Column     | Type       | Nullable
-- -----------+------------+---------
-- article_id | uuid       | not null
-- embedding  | vector(1536) |
-- model      | varchar(100) | not null
-- created_at | timestamp   | not null
-- updated_at | timestamp   | not null
```

### 4. Настройка API ключей

Добавьте OpenAI API key в настройках пользователя:

```typescript
// Frontend: Settings → API Keys → OpenAI
provider: "openai";
key: "sk-...";
```

### 5. Генерация первых embeddings

```bash
# Тестовый запрос через curl
curl -X POST http://localhost:3000/api/projects/{PROJECT_ID}/citation-graph/generate-embeddings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'

# Ответ:
# {
#   "success": true,
#   "total": 10,
#   "processed": 10,
#   "errors": 0,
#   "remaining": 0
# }
```

### 6. Проверка semantic search

```bash
curl -X POST http://localhost:3000/api/projects/{PROJECT_ID}/citation-graph/semantic-search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning in medicine",
    "limit": 5,
    "threshold": 0.7
  }'

# Ответ:
# {
#   "query": "machine learning in medicine",
#   "results": [
#     {
#       "id": "...",
#       "title": "Deep Learning for Medical Diagnosis",
#       "similarity": 0.89
#     }
#   ],
#   "totalFound": 5
# }
```

---

## Troubleshooting

### Ошибка: extension "vector" does not exist

**Решение**: Установите pgvector в PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# macOS
brew install pgvector

# Или из исходников
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### Ошибка: OpenAI API key not configured

**Решение**: Добавьте ключ через UI или напрямую в БД

```sql
INSERT INTO user_api_keys (user_id, provider, encrypted_key, created_at)
VALUES (
  'your-user-id',
  'openai',
  encrypt_api_key('sk-...'),  -- используйте функцию шифрования
  NOW()
);
```

### Медленный semantic search

**Решение**: Проверьте индекс

```sql
-- Пересоздать индекс с большим числом списков
DROP INDEX article_embeddings_vector_idx;
CREATE INDEX article_embeddings_vector_idx
  ON article_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200);  -- увеличено с 100

-- Для проектов > 10k статей используйте lists = 500
```

### Слишком много незаполненных embeddings

**Решение**: Batch generation

```bash
# Запустите несколько раз подряд
for i in {1..10}; do
  curl -X POST .../generate-embeddings -d '{"batchSize": 50}'
  sleep 2
done
```

---

## Оптимизация производительности

### 1. Индекс IVFFLAT tuning

```sql
-- Для маленьких проектов (<1000 статей)
lists = 50

-- Для средних проектов (1000-10000 статей)
lists = 100-200

-- Для больших проектов (>10000 статей)
lists = 500-1000
```

### 2. Batch size для embeddings

- **Малые проекты**: batchSize = 50-100
- **Средние проекты**: batchSize = 100-200 (с задержками)
- **Большие проекты**: batchSize = 50 + увеличить задержку до 2-3 сек

### 3. Threshold tuning

| Threshold | Precision | Recall  | Use case                    |
| --------- | --------- | ------- | --------------------------- |
| 0.9       | Высокая   | Низкая  | Только очень похожие статьи |
| 0.7-0.8   | Средняя   | Средняя | **Рекомендуется**           |
| 0.5-0.6   | Низкая    | Высокая | Исследовательский поиск     |

---

## Стоимость OpenAI API

### text-embedding-3-small pricing

- **Цена**: $0.02 / 1M tokens
- **Средняя статья**: ~500 tokens (title + abstract)
- **1000 статей**: ~$0.01
- **10000 статей**: ~$0.10

### Оптимизация затрат

1. Кэшировать embeddings (уже реализовано в БД)
2. Обновлять только новые/измененные статьи
3. Использовать `batchSize` для rate limiting

---

## Мониторинг

### Статистика embeddings

```sql
-- Процент готовности проекта
SELECT
  COUNT(*) as total,
  COUNT(ae.article_id) as with_embeddings,
  ROUND(COUNT(ae.article_id)::numeric / COUNT(*) * 100, 2) as completion_rate
FROM project_articles pa
JOIN articles a ON a.id = pa.article_id
LEFT JOIN article_embeddings ae ON ae.article_id = a.id
WHERE pa.project_id = 'PROJECT_ID'
  AND pa.status != 'deleted';
```

### Размер таблицы

```sql
-- Размер таблицы embeddings
SELECT
  pg_size_pretty(pg_total_relation_size('article_embeddings')) as total_size,
  COUNT(*) as embeddings_count
FROM article_embeddings;
```

### Эффективность индекса

```sql
-- Проверить использование индекса
EXPLAIN ANALYZE
SELECT a.id, 1 - (ae.embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM article_embeddings ae
JOIN articles a ON a.id = ae.article_id
ORDER BY similarity DESC
LIMIT 20;

-- Должно показать: Index Scan using article_embeddings_vector_idx
```

---

## Rollback (если нужно)

```sql
-- Удалить таблицу embeddings
DROP TABLE IF EXISTS article_embeddings CASCADE;

-- Удалить колонку embedding_status
ALTER TABLE articles DROP COLUMN IF EXISTS embedding_status;

-- Удалить extension (осторожно!)
DROP EXTENSION IF EXISTS vector CASCADE;
```

---

## Полезные запросы

### Найти статьи без embeddings

```sql
SELECT a.id, a.title_en, pa.project_id
FROM project_articles pa
JOIN articles a ON a.id = pa.article_id
LEFT JOIN article_embeddings ae ON ae.article_id = a.id
WHERE ae.article_id IS NULL
  AND pa.status != 'deleted'
LIMIT 100;
```

### Проверить качество embeddings

```sql
-- Средняя similarity между random парами (должно быть ~0.3-0.5)
SELECT AVG(1 - (e1.embedding <=> e2.embedding)) as avg_similarity
FROM article_embeddings e1
CROSS JOIN article_embeddings e2
WHERE e1.article_id != e2.article_id
LIMIT 1000;
```

### Удалить старые embeddings (для обновления)

```sql
-- Удалить embeddings старше 1 года
DELETE FROM article_embeddings
WHERE updated_at < NOW() - INTERVAL '1 year';
```

---

## Готово! 🎉

Semantic search настроен и готов к использованию.

**Следующий шаг**: Создайте UI для semantic search в frontend.
