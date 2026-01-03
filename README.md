# Thesis Stack (MVP шаблон)

Монорепо: `apps/api` (Node.js + Fastify + Prisma + pg-boss) и `apps/web` (React + Vite).

## 0) Важно про секреты
**Не храните** API-ключи и пароли в репозитории. Используйте `.env` на сервере и `.env.local` локально.

## 1) Требования
- Node.js >= 20 (желательно LTS)
- pnpm >= 9
- PostgreSQL (можно внешний)

## 2) Локальный запуск (dev)
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter api prisma generate
# ВНИМАНИЕ: перед миграциями укажите правильный DATABASE_URL в apps/api/.env
pnpm --filter api prisma migrate deploy
pnpm dev
```

API по умолчанию: http://localhost:3000  
WEB по умолчанию: http://localhost:5173

## 3) Что уже есть в MVP
- Регистрация/логин (JWT)
- Проекты + участники (по email)
- Старт поиска (пока: PubMed через очередь)
- Сохранение статей, дедуп (DOI/PMID)
- Первичное извлечение статистики из abstract (p, CI, OR/RR/HR и т.д.)

## 4) Production (идея)
- API как systemd service / pm2
- WEB собирается `pnpm --filter web build`, отдаётся через nginx + проксирование `/api`

Шаблоны nginx и systemd: см. `deploy/`.

## 5) Дальше по дорожной карте
- Crossref провайдер (работы + references)
- Wiley TDM (скачивание PDF по DOI) в очередь
- Перевод RU (через внешний провайдер, ключи в env)
- Структурированный парсинг эффектов/статистики (LLM + валидация)
- Документ-редактор (TipTap) + экспорт DOCX/PDF + ГОСТ через CSL/citeproc
