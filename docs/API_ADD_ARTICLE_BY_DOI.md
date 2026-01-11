# API: Добавление статьи по DOI

## Описание

Новый API endpoint для добавления статьи в базу данных проекта по DOI (Digital Object Identifier).

## Endpoint

```
POST /api/projects/:id/add-article-by-doi
```

### Параметры URL

- `id` (string, UUID) - ID проекта

### Тело запроса

```json
{
  "doi": "10.1234/example.doi",
  "status": "candidate"  // или "selected" (необязательно, по умолчанию "candidate")
}
```

### Заголовки

- `Authorization: Bearer <token>` - JWT токен для аутентификации

### Права доступа

Пользователь должен иметь права редактирования проекта (роль `editor` или `owner`).

## Поток работы

1. Валидация входных данных (DOI и статус)
2. Проверка прав доступа пользователя к проекту
3. Поиск статьи в БД по DOI:
   - Если найдена → использует существующую
   - Если не найдена → запрашивает данные из Crossref API
4. Создание записи статьи в таблице `articles` (если новая)
5. Добавление связи между проектом и статьей в таблице `project_articles`
6. Инвалидация кеша статей проекта
7. Возврат результата

## Ответы

### Успешное добавление новой статьи (201)

```json
{
  "ok": true,
  "articleId": "uuid-статьи",
  "created": true,
  "status": "candidate",
  "message": "Article added to project as candidate"
}
```

### Статья уже существовала в БД (200)

```json
{
  "ok": true,
  "articleId": "uuid-статьи",
  "created": false,
  "status": "candidate",
  "message": "Article already exists in database and added to project as candidate"
}
```

### Ошибки

#### 400 - Некорректные данные

```json
{
  "error": "Invalid body",
  "details": "Validation error message"
}
```

#### 403 - Нет прав доступа

```json
{
  "error": "No edit access to project"
}
```

#### 404 - Статья не найдена в Crossref

```json
{
  "error": "Article not found in Crossref. Please check the DOI."
}
```

#### 409 - Статья уже добавлена в проект

```json
{
  "error": "Article already added to this project"
}
```

#### 500 - Внутренняя ошибка сервера

```json
{
  "error": "Failed to add article",
  "details": "Error message"
}
```

## Пример использования

### cURL

```bash
curl -X POST http://localhost:3000/api/projects/project-uuid/add-article-by-doi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "doi": "10.1038/nature12373",
    "status": "selected"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch(`/api/projects/${projectId}/add-article-by-doi`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    doi: '10.1038/nature12373',
    status: 'selected'
  })
});

const result = await response.json();
console.log(result);
```

## Источник данных

Статьи загружаются через **Crossref API** (`https://api.crossref.org/works/{doi}`).

### Извлекаемые данные:

- Заголовок (title)
- Авторы (authors)
- Аннотация (abstract)
- Год публикации (year)
- Журнал (journal)
- Том, выпуск, страницы (volume, issue, pages)
- URL статьи
- Метаданные в формате JSON (raw_json)

### Обработка данных:

- Автоматическое извлечение статистических данных из аннотации
- Вычисление качества статистики (stats_quality)
- Сохранение в таблице `articles` с источником `source='crossref'`

## Преимущества

1. **Быстрое добавление** - достаточно только DOI
2. **Автоматическая дедупликация** - не создаёт дубликаты статей
3. **Богатые метаданные** - данные из авторитетного источника Crossref
4. **Гибкость** - можно сразу выбрать статус (кандидат или отобранная)
5. **Совместимость** - работает с существующими функциями перевода и статистического анализа

## Связанные файлы

- Маршрут: `/workspaces/MDsystem/apps/api/src/routes/articles.ts`
- Crossref API: `/workspaces/MDsystem/apps/api/src/lib/crossref.ts`
- Схема БД: `/workspaces/MDsystem/apps/api/prisma/schema.prisma`
