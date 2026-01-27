# 🚀 Инструкция по деплою Phase 2

## ⚠️ ВАЖНО: Сначала установите pgvector

**Перед применением миграции необходимо установить pgvector extension на сервере!**

### Установка pgvector на сервере

```bash
# SSH на продакшен сервер
ssh user@your-server

# Автоматическая установка
cd /path/to/MDsystem
bash scripts/install-pgvector.sh

# ИЛИ вручную для Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y postgresql-16-pgvector

# Для других систем см. https://github.com/pgvector/pgvector#installation
```

**После установки перезапустите PostgreSQL:**

```bash
sudo systemctl restart postgresql
```

---

## ✅ Что уже сделано

1. ✅ Код запушен в `main`
2. ✅ Миграция подготовлена: `apps/api/prisma/migrations/add_semantic_search.sql`
3. ✅ Bash-скрипт для миграции: `apps/api/migrate.sh`

---

## 📋 Чеклист деплоя на продакшен

### Шаг 1: Подключиться к продакшен серверу

```bash
ssh user@your-server
cd /path/to/MDsystem
```

### Шаг 2: Подтянуть изменения из main

```bash
git pull origin main
```

### Шаг 3: Установить зависимости (если нужно)

```bash
pnpm install
```

### Шаг 4: Запустить миграцию БД

**Вариант A: Через bash-скрипт (автоматически)**

```bash
cd apps/api
bash migrate.sh
```

**Вариант B: Вручную через psql**

```bash
# Установить pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Применить миграцию
psql $DATABASE_URL -f apps/api/prisma/migrations/add_semantic_search.sql
```

**Вариант C: Через node-скрипт**

```bash
cd apps/api
npx tsx run-migration.ts
```

### Шаг 5: Добавить OPENAI_API_KEY в переменные окружения

Добавьте в ваш файл конфигурации systemd (`override.conf`):

```ini
[Service]
Environment="OPENAI_API_KEY=sk-proj-..."
```

Или в docker-compose.yml:

```yaml
environment:
  - OPENAI_API_KEY=sk-proj-...
```

### Шаг 6: Перезапустить API сервер

**Systemd:**

```bash
sudo systemctl restart thesis-api
sudo systemctl status thesis-api
```

**Docker:**

```bash
docker-compose restart api
docker-compose logs -f api
```

**PM2:**

```bash
pm2 restart api
pm2 logs api
```

### Шаг 7: Проверить работоспособность

```bash
# Проверка здоровья
curl http://localhost:3000/health

# Проверка эндпоинта семантического поиска
curl -X GET http://localhost:3000/api/embedding-stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🔧 Проверка миграции

После применения миграции проверьте:

```sql
-- Проверить установку pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Проверить таблицу article_embeddings
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'article_embeddings'
);

-- Проверить колонку embedding_status
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'articles'
  AND column_name = 'embedding_status'
);

-- Проверить индексы
SELECT indexname FROM pg_indexes
WHERE tablename = 'article_embeddings';
```

---

## 📊 Генерация эмбеддингов для существующих статей

После успешного деплоя:

```bash
# Сгенерировать эмбеддинги для проекта
curl -X POST http://localhost:3000/api/generate-embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "batchSize": 50
  }'

# Проверить прогресс
curl -X GET http://localhost:3000/api/embedding-stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🎯 Новые API эндпоинты

После деплоя доступны:

1. **Семантический поиск:**
   - `POST /api/semantic-search` - поиск похожих статей
   - `POST /api/generate-embeddings` - генерация эмбеддингов
   - `GET /api/embedding-stats` - статистика

2. **Кластеризация:**
   - `POST /api/methodology-clusters/analyze` - полный анализ
   - `GET /api/methodology-clusters/stats` - быстрая статистика

---

## ⚠️ Возможные проблемы

### Проблема: pgvector не установлен

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# Или скомпилировать из исходников
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### Проблема: Нет прав на CREATE EXTENSION

```bash
# Подключиться как суперпользователь
sudo -u postgres psql -d your_database -c "CREATE EXTENSION vector;"
```

### Проблема: Сервер не перезапускается

```bash
# Проверить логи
sudo journalctl -u thesis-api -n 100 --no-pager

# Или docker логи
docker-compose logs api --tail=100
```

---

## 💰 Стоимость эмбеддингов

- **Модель:** text-embedding-3-small
- **Стоимость:** ~$0.02 за 1000 статей
- **Для 10,000 статей:** ~$0.20

---

## 📚 Дополнительные документы

- [PHASE2_COMPLETE.md](docs/PHASE2_COMPLETE.md) - полное описание функций
- [SEMANTIC_SEARCH_MIGRATION.md](docs/SEMANTIC_SEARCH_MIGRATION.md) - детали миграции БД
