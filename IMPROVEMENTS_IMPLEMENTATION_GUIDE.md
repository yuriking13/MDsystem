# Руководство по Реализованным Улучшениям

## Дата: 12 февраля 2026

---

## 1. РЕАЛИЗОВАННЫЕ УЛУЧШЕНИЯ

### 1.1 Система Typed Errors ✅

**Файл:** `apps/api/src/utils/typed-errors.ts`

**Что сделано:**
- Создана иерархия typed error классов
- Все ошибки наследуются от базового `AppError`
- Добавлены специфические классы для разных типов ошибок:
  - `AuthenticationError`, `AuthorizationError` - для auth
  - `ValidationError`, `InvalidInputError` - для валидации
  - `NotFoundError`, `ResourceNotFoundError` - для 404
  - `ConflictError`, `DuplicateResourceError` - для конфликтов
  - `RateLimitError` - для rate limiting
  - `DatabaseError`, `ExternalServiceError` - для инфраструктуры
  - `CircuitBreakerOpenError` - для отказоустойчивости

**Преимущества:**
- ✅ Структурированная обработка ошибок
- ✅ Консистентный формат API responses
- ✅ Легче отлавливать специфические ошибки
- ✅ Улучшенное логирование с контекстом
- ✅ Разделение операционных (recoverable) и критических ошибок

**Использование:**
```typescript
import { ValidationError, NotFoundError } from '../utils/typed-errors.js';

// Вместо:
throw new Error('User not found');

// Используем:
throw new NotFoundError('User', userId);

// Результат:
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with identifier 'abc123' not found",
    "timestamp": "2026-02-12T10:00:00.000Z",
    "requestId": "req-xyz"
  }
}
```

### 1.2 Password Reset Flow ✅

**Файлы:**
- `apps/api/src/routes/password-reset.ts` - endpoints
- `apps/api/prisma/migrations/add_password_reset_tokens.sql` - migration

**Что сделано:**
- Полный flow сброса пароля:
  1. `POST /api/auth/forgot-password` - запрос reset token
  2. `POST /api/auth/verify-reset-token` - проверка токена
  3. `POST /api/auth/reset-password` - установка нового пароля

**Функции безопасности:**
- ✅ Токены хешируются (SHA-256) перед сохранением
- ✅ Короткое время жизни (1 час)
- ✅ One-time use (помечаются как used после применения)
- ✅ Rate limiting (3 запроса в час)
- ✅ Защита от user enumeration (всегда возвращаем success)
- ✅ Валидация силы пароля
- ✅ Отзыв всех refresh tokens после сброса
- ✅ Транзакции для атомарности
- ✅ Проверка на блокировку аккаунта

**Использование:**
```typescript
// 1. Пользователь забыл пароль
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}

// 2. Backend генерирует токен и отправляет email (TODO)
// В dev режиме возвращает токен в response

// 3. Пользователь переходит по ссылке и проверяет токен
POST /api/auth/verify-reset-token
{
  "token": "abc123..."
}

// 4. Пользователь устанавливает новый пароль
POST /api/auth/reset-password
{
  "token": "abc123...",
  "password": "NewStrongPassword123!"
}
```

**TODO:**
- [ ] Интеграция email service для отправки ссылок
- [ ] Cleanup job для старых токенов (можно через pg-boss)

### 1.3 Улучшенная Content Security Policy (CSP) ✅

**Файл:** `apps/api/src/server.ts`

**Что сделано:**
- Настроен CSP для production окружения
- Добавлены директивы для защиты от XSS, clickjacking
- Разрешены только безопасные источники

**CSP Директивы:**
```javascript
{
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // TODO: удалить unsafe-inline
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", env.CORS_ORIGIN],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
}
```

**TODO:**
- [ ] Удалить `unsafe-inline` из scriptSrc после рефакторинга inline scripts
- [ ] Добавить nonce-based CSP для динамических скриптов
- [ ] Настроить CSP reporting endpoint

### 1.4 Улучшенная Обработка Ошибок ✅

**Файл:** `apps/api/src/utils/errors.ts`

**Что сделано:**
- Интеграция typed errors в global error handler
- Единообразный формат ошибок через `formatErrorResponse`
- Улучшенное логирование с request context
- Разделение client (4xx) и server (5xx) ошибок

**Формат error response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input for field 'email': must be valid email",
    "details": { ... },
    "timestamp": "2026-02-12T10:00:00.000Z",
    "requestId": "req-abc123"
  }
}
```

### 1.5 Pagination Utilities ✅

**Файл:** `apps/api/src/utils/pagination.ts`

**Что сделано:**
- Поддержка offset-based pagination (для простых списков)
- Поддержка cursor-based pagination (для больших датасетов)
- Валидация и санитизация параметров через Zod
- SQL injection защита через whitelist sort fields
- Стабильная сортировка с tie-breaking по ID

**Offset Pagination:**
```typescript
import { OffsetPaginationSchema, paginateQuery } from '../utils/pagination.js';

const params = OffsetPaginationSchema.parse(req.query);

const result = await paginateQuery(
  (offset, limit) => pool.query(
    'SELECT * FROM articles OFFSET $1 LIMIT $2',
    [offset, limit]
  ).then(r => r.rows),
  () => pool.query('SELECT COUNT(*) FROM articles')
    .then(r => parseInt(r.rows[0].count)),
  params
);

// Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Cursor Pagination:**
```typescript
import { CursorPaginationSchema, paginateCursor } from '../utils/pagination.js';

const params = CursorPaginationSchema.parse(req.query);

const result = await paginateCursor(
  (cursorWhere, cursorValues, limit) => {
    let query = 'SELECT * FROM articles';
    if (cursorWhere) {
      query += ` WHERE ${cursorWhere}`;
    }
    query += ' ORDER BY created_at DESC, id DESC LIMIT $' + (cursorValues.length + 1);
    return pool.query(query, [...cursorValues, limit]).then(r => r.rows);
  },
  params,
  'created_at'
);

// Response:
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xMiIsImlkIjoiMTIzIn0",
    "prevCursor": null,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 1.6 Transaction Helpers ✅

**Файл:** `apps/api/src/utils/transactions.ts`

**Что сделано:**
- `withTransaction` - автоматический COMMIT/ROLLBACK
- Support для isolation levels (SERIALIZABLE, REPEATABLE READ)
- `withTransactionRetry` - retry для serialization failures
- `Savepoint` support для вложенных транзакций
- `batchInTransaction` для массовых операций
- `withAdvisoryLock` для координации между процессами

**Использование:**

**Простая транзакция:**
```typescript
import { withTransaction } from '../utils/transactions.js';

await withTransaction(async (client) => {
  // Создаём проект
  const project = await client.query(
    'INSERT INTO projects (name, created_by) VALUES ($1, $2) RETURNING id',
    [name, userId]
  );
  
  // Добавляем владельца как участника
  await client.query(
    'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
    [project.rows[0].id, userId, 'owner']
  );
  
  return project.rows[0];
});

// Автоматически:
// - BEGIN в начале
// - COMMIT при успехе
// - ROLLBACK при ошибке
// - release() клиента в finally
```

**Транзакция с retry (для SERIALIZABLE):**
```typescript
import { withTransactionRetry } from '../utils/transactions.js';

await withTransactionRetry(
  async (client) => {
    // Критическая секция с SERIALIZABLE isolation
    const balance = await client.query(
      'SELECT balance FROM accounts WHERE id = $1',
      [accountId]
    );
    
    await client.query(
      'UPDATE accounts SET balance = $1 WHERE id = $2',
      [balance.rows[0].balance - amount, accountId]
    );
  },
  { isolationLevel: 'SERIALIZABLE', maxRetries: 3 }
);
```

**Savepoints (вложенные транзакции):**
```typescript
import { withTransaction, createSavepoint } from '../utils/transactions.js';

await withTransaction(async (client) => {
  await client.query('INSERT INTO users ...');
  
  const sp = await createSavepoint(client, 'before_risky_op');
  
  try {
    await client.query('RISKY OPERATION');
    await sp.release();
  } catch (err) {
    await sp.rollback(); // Откатываем только RISKY OPERATION
  }
  
  await client.query('INSERT INTO audit_log ...');
});
```

**Advisory locks (для background jobs):**
```typescript
import { withAdvisoryLock, generateLockId } from '../utils/transactions.js';

const lockId = generateLockId('graph-fetch-job');

const result = await withAdvisoryLock(lockId, async () => {
  // Только один процесс может выполнять это одновременно
  return await doExpensiveWork();
});

if (result === null) {
  log.info('Another process is already running this job');
}
```

---

## 2. КАК ИСПОЛЬЗОВАТЬ УЛУЧШЕНИЯ В СУЩЕСТВУЮЩЕМ КОДЕ

### 2.1 Миграция на Typed Errors

**До:**
```typescript
if (!user) {
  return reply.code(404).send({ error: 'User not found' });
}
```

**После:**
```typescript
import { NotFoundError } from '../utils/typed-errors.js';

if (!user) {
  throw new NotFoundError('User', userId);
}
```

### 2.2 Добавление Pagination

**До:**
```typescript
app.get('/api/articles', async (req, reply) => {
  const articles = await pool.query('SELECT * FROM articles');
  return articles.rows;
});
```

**После:**
```typescript
import { OffsetPaginationSchema, paginateQuery } from '../utils/pagination.js';

app.get('/api/articles', async (req, reply) => {
  const params = OffsetPaginationSchema.parse(req.query);
  
  return paginateQuery(
    (offset, limit) => pool.query(
      'SELECT * FROM articles OFFSET $1 LIMIT $2',
      [offset, limit]
    ).then(r => r.rows),
    () => pool.query('SELECT COUNT(*) FROM articles')
      .then(r => parseInt(r.rows[0].count)),
    params
  );
});
```

### 2.3 Использование Транзакций

**До (НЕ АТОМАРНО!):**
```typescript
app.post('/api/projects', async (req, reply) => {
  const project = await pool.query(
    'INSERT INTO projects (name) VALUES ($1) RETURNING id',
    [name]
  );
  
  // ❌ Если это упадёт, проект останется без владельца!
  await pool.query(
    'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
    [project.rows[0].id, userId]
  );
  
  return project.rows[0];
});
```

**После (АТОМАРНО):**
```typescript
import { withTransaction } from '../utils/transactions.js';

app.post('/api/projects', async (req, reply) => {
  return withTransaction(async (client) => {
    const project = await client.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING id',
      [name]
    );
    
    await client.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
      [project.rows[0].id, userId]
    );
    
    return project.rows[0];
  });
});
```

---

## 3. СЛЕДУЮЩИЕ ШАГИ

### 3.1 Немедленные задачи (Sprint 1)

1. **Применить миграцию password_reset_tokens:**
   ```bash
   psql $DATABASE_URL -f apps/api/prisma/migrations/add_password_reset_tokens.sql
   ```

2. **Обновить существующие routes на typed errors:**
   - Начать с `routes/auth.ts`
   - Затем `routes/projects.ts`
   - Постепенно мигрировать остальные

3. **Добавить pagination в критичные endpoints:**
   - `/api/articles` - список статей
   - `/api/documents` - список документов
   - `/api/projects` - список проектов
   - `/api/admin/users` - admin панель

4. **Обернуть критические операции в транзакции:**
   - Создание проекта + добавление участника
   - Добавление статьи + обновление метаданных
   - Удаление ресурсов с cascade операциями
   - Batch операции в worker jobs

5. **Настроить email service для password reset:**
   - Выбрать провайдера (SendGrid, AWS SES, Mailgun)
   - Создать email templates
   - Добавить в `password-reset.ts`

### 3.2 Краткосрочные задачи (Sprint 2-3)

1. **Создать services слой:**
   ```
   apps/api/src/services/
   ├── ArticleService.ts
   ├── ProjectService.ts
   ├── UserService.ts
   └── GraphService.ts
   ```

2. **Добавить недостающие database indexes:**
   - См. AUDIT_REPORT.md раздел 5.1

3. **Улучшить N+1 queries в graphFetchJob:**
   - Использовать batch queries
   - Применить prepared statements
   - Добавить data loaders pattern

4. **Реализовать API versioning:**
   ```
   /api/v1/articles
   /api/v2/articles (с pagination)
   ```

5. **Добавить error reporting (Sentry):**
   ```typescript
   import * as Sentry from '@sentry/node';
   
   Sentry.init({
     dsn: env.SENTRY_DSN,
     environment: env.NODE_ENV,
   });
   ```

---

## 4. ТЕСТИРОВАНИЕ УЛУЧШЕНИЙ

### 4.1 Тесты для Typed Errors

```typescript
// apps/api/tests/utils/typed-errors.test.ts
import { describe, it, expect } from 'vitest';
import { 
  NotFoundError, 
  ValidationError,
  formatErrorResponse 
} from '../src/utils/typed-errors.js';

describe('Typed Errors', () => {
  it('should create NotFoundError with correct properties', () => {
    const error = new NotFoundError('User', '123');
    
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toContain('User');
    expect(error.message).toContain('123');
  });
  
  it('should format error response correctly', () => {
    const error = new ValidationError('Invalid email');
    const response = formatErrorResponse(error, 'req-123');
    
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.requestId).toBe('req-123');
    expect(response.error.timestamp).toBeDefined();
  });
});
```

### 4.2 Тесты для Password Reset

```typescript
// apps/api/tests/routes/password-reset.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../helpers/app.js';

describe('Password Reset Flow', () => {
  let app;
  
  beforeEach(async () => {
    app = await build();
  });
  
  it('should initiate password reset', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'test@example.com' }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
  });
  
  it('should reset password with valid token', async () => {
    // 1. Request reset
    const resetResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'test@example.com' }
    });
    
    const { devToken } = resetResponse.json();
    
    // 2. Reset password
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: {
        token: devToken,
        password: 'NewPassword123!'
      }
    });
    
    expect(response.statusCode).toBe(200);
  });
});
```

### 4.3 Тесты для Pagination

```typescript
// apps/api/tests/utils/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { 
  calculateOffset,
  createPaginationMeta,
  encodeCursor,
  decodeCursor 
} from '../src/utils/pagination.js';

describe('Pagination', () => {
  it('should calculate offset correctly', () => {
    expect(calculateOffset(1, 20)).toBe(0);
    expect(calculateOffset(2, 20)).toBe(20);
    expect(calculateOffset(5, 10)).toBe(40);
  });
  
  it('should create pagination meta', () => {
    const meta = createPaginationMeta(2, 20, 100);
    
    expect(meta.page).toBe(2);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(true);
  });
  
  it('should encode and decode cursor', () => {
    const data = { created_at: '2026-01-01', id: '123' };
    const cursor = encodeCursor(data);
    const decoded = decodeCursor(cursor);
    
    expect(decoded).toEqual(data);
  });
});
```

### 4.4 Тесты для Transactions

```typescript
// apps/api/tests/utils/transactions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { withTransaction } from '../src/utils/transactions.js';
import { pool } from '../src/pg.js';

describe('Transactions', () => {
  beforeEach(async () => {
    // Setup test DB
  });
  
  it('should commit on success', async () => {
    const result = await withTransaction(async (client) => {
      await client.query('INSERT INTO test_table (name) VALUES ($1)', ['test']);
      return 'success';
    });
    
    expect(result).toBe('success');
    
    // Verify data was committed
    const check = await pool.query('SELECT * FROM test_table WHERE name = $1', ['test']);
    expect(check.rows.length).toBe(1);
  });
  
  it('should rollback on error', async () => {
    try {
      await withTransaction(async (client) => {
        await client.query('INSERT INTO test_table (name) VALUES ($1)', ['test']);
        throw new Error('Simulated error');
      });
    } catch (err) {
      // Expected
    }
    
    // Verify data was rolled back
    const check = await pool.query('SELECT * FROM test_table WHERE name = $1', ['test']);
    expect(check.rows.length).toBe(0);
  });
});
```

---

## 5. МОНИТОРИНГ И МЕТРИКИ

### 5.1 Метрики для отслеживания

1. **Error Rates:**
   - 4xx vs 5xx ratio
   - Top error codes
   - Error rate by endpoint

2. **Transaction Performance:**
   - Transaction duration (p50, p95, p99)
   - Rollback rate
   - Deadlock frequency

3. **Pagination Usage:**
   - Average page size requested
   - Cursor vs offset usage
   - Performance по cursor vs offset

4. **Password Reset:**
   - Reset requests per day
   - Token expiry rate
   - Success rate

### 5.2 Логирование

Все новые модули используют structured logging:

```typescript
log.info('Password reset initiated', { userId, expiresAt });
log.error('Transaction failed', { error, context });
log.warn('Rate limit exceeded', { ip, endpoint });
```

---

## 6. ПРОИЗВОДСТВЕННЫЙ ЧЕКЛИСТ

Перед деплоем в production убедитесь:

- [ ] Применены все миграции БД
- [ ] Обновлены environment variables (если требуется)
- [ ] CSP настроен и протестирован
- [ ] Email service для password reset настроен
- [ ] Rate limits протестированы
- [ ] Мониторинг и alerting настроены
- [ ] Rollback план подготовлен
- [ ] Документация обновлена
- [ ] Команда проинформирована

---

## 7. КОНТАКТЫ И ПОДДЕРЖКА

**Вопросы по реализации:**
- См. код и комментарии в соответствующих файлах
- Проверьте AUDIT_REPORT.md для контекста

**Проблемы и баги:**
- Создайте issue в проекте
- Приложите логи и контекст

**Предложения по улучшению:**
- Pull requests приветствуются
- Следуйте существующим паттернам

---

**Последнее обновление:** 12.02.2026
**Версия:** 1.0
