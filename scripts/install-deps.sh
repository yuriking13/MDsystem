#!/bin/bash
# Скрипт для установки всех необходимых зависимостей

set -e

echo "📦 Установка backend зависимостей..."
pnpm --filter=api add @fastify/jwt zod pg fastify-plugin
pnpm --filter=api add -D @types/pg

echo "📦 Установка frontend зависимостей..."
pnpm --filter=web add react-router-dom

echo "✅ Все зависимости установлены!"
echo ""
echo "Следующие шаги:"
echo "1. Применить миграцию БД: psql \$DATABASE_URL < apps/api/prisma/migrations/add_user_api_keys.sql"
echo "2. Настроить переменные окружения (см. DEPLOYMENT.md)"
echo "3. Собрать и развернуть проект"
