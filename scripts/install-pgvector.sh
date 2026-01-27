#!/bin/bash
# Установка pgvector на Ubuntu/Debian сервере

echo "🔧 Установка pgvector extension для PostgreSQL"
echo "=============================================="

# Определяем версию PostgreSQL
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo "📊 Обнаружена PostgreSQL версия: $PG_VERSION"

# Установка pgvector
echo "📦 Устанавливаем pgvector..."

if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y postgresql-$PG_VERSION-pgvector
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    sudo yum install -y pgvector_$PG_VERSION
else
    echo "⚠️  Не удалось определить пакетный менеджер"
    echo "Попробуйте установить вручную из исходников"
    exit 1
fi

echo "✅ pgvector установлен"
echo ""
echo "📝 Следующий шаг: создайте extension в базе данных:"
echo "   psql \$DATABASE_URL -c 'CREATE EXTENSION vector;'"
