#!/bin/bash

echo "🚀 Запуск миграции MDsystem Phase 2"
echo "=================================="

# Получаем DATABASE_URL из переменных окружения или используем значение по умолчанию
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL не установлен, используем значение из .env если есть"
    if [ -f .env ]; then
        export $(cat .env | grep DATABASE_URL | xargs)
    fi
fi

# Проверяем доступность PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ psql не найден"
    exit 1
fi

# Парсим DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    echo "📡 Используем DATABASE_URL из окружения"
    PSQL_CMD="psql $DATABASE_URL"
else
    # Пробуем подключиться локально
    echo "📡 Пробуем локальное подключение"
    PSQL_CMD="psql -h localhost -U postgres"
fi

# Проверяем подключение
echo "🔍 Проверка подключения к БД..."
echo "SELECT version();" | $PSQL_CMD -t 2>&1 | head -1

if [ $? -ne 0 ]; then
    echo "❌ Не удалось подключиться к PostgreSQL"
    echo "💡 Попробуйте установить DATABASE_URL:"
    echo "   export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
    exit 1
fi

echo "✅ Подключение установлено"

# Устанавливаем pgvector extension
echo ""
echo "🔧 Установка pgvector extension..."
echo "CREATE EXTENSION IF NOT EXISTS vector;" | $PSQL_CMD

if [ $? -eq 0 ]; then
    echo "✅ pgvector установлен"
else
    echo "⚠️  Возможно pgvector уже установлен или требуются права суперпользователя"
fi

# Запускаем миграцию
echo ""
echo "📦 Применение миграции add_semantic_search.sql..."
$PSQL_CMD -f prisma/migrations/add_semantic_search.sql

if [ $? -eq 0 ]; then
    echo "✅ Миграция успешно применена"
else
    echo "❌ Ошибка применения миграции"
    exit 1
fi

# Проверяем результат
echo ""
echo "🔍 Проверка результата..."
echo "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'article_embeddings');" | $PSQL_CMD -t

echo ""
echo "✅ Миграция завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Установите OPENAI_API_KEY в переменные окружения"
echo "   2. Перезапустите API сервер"
echo "   3. Используйте POST /api/generate-embeddings для генерации эмбеддингов"
