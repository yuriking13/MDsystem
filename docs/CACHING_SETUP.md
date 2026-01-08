# Настройка кэширования

Система поддерживает два режима кэширования:

1. **Redis** (рекомендуется для production) - внешний сервис
2. **In-memory LRU** (fallback) - встроенный кэш в Node.js

Переключение происходит **автоматически**: если Redis недоступен, система использует in-memory кэш.

---

## Вариант 1: Redis на том же сервере (РЕКОМЕНДУЕТСЯ)

Redis - это легковесный key-value store. Он потребляет минимум ресурсов:
- **RAM**: 5-50 МБ (в зависимости от объёма данных)
- **CPU**: практически нулевая нагрузка
- **Диск**: несколько МБ для persistence

### Установка на Ubuntu/Debian

```bash
# Обновляем пакеты
sudo apt update

# Устанавливаем Redis
sudo apt install redis-server -y

# Проверяем статус
sudo systemctl status redis-server
```

### Настройка безопасности

Редактируем конфиг:
```bash
sudo nano /etc/redis/redis.conf
```

Важные настройки:

```conf
# Слушать только localhost (безопасность)
bind 127.0.0.1 ::1

# Порт (по умолчанию 6379)
port 6379

# Ограничение памяти (256MB достаточно для большинства случаев)
maxmemory 256mb

# Политика вытеснения при переполнении памяти
# allkeys-lru - удаляет наименее используемые ключи
maxmemory-policy allkeys-lru

# Опционально: пароль (если нужна дополнительная защита)
# requirepass your_strong_password_here
```

### Применяем настройки

```bash
# Перезапускаем Redis
sudo systemctl restart redis-server

# Включаем автозапуск
sudo systemctl enable redis-server

# Проверяем работу
redis-cli ping
# Ответ: PONG
```

### Настройка приложения

В systemd drop-in файле (`/etc/systemd/system/thesis-api.service.d/override.conf`):

```ini
[Service]
Environment="REDIS_URL=redis://127.0.0.1:6379"
# Если установлен пароль:
# Environment="REDIS_PASSWORD=your_strong_password_here"
# Опционально: время жизни кэша в секундах (по умолчанию 300 = 5 минут)
# Environment="REDIS_CACHE_TTL=300"
```

Перезапускаем сервис:
```bash
sudo systemctl daemon-reload
sudo systemctl restart thesis-api
```

### Проверка работы

```bash
# Проверяем статус кэша через API
curl http://localhost:3000/api/cache-stats
```

Ожидаемый ответ:
```json
{
  "type": "redis",
  "connected": true
}
```

---

## Вариант 2: In-memory LRU кэш (без Redis)

Если Redis не установлен или недоступен, система **автоматически** использует встроенный in-memory LRU кэш.

### Характеристики

- **Лимит записей**: 10,000
- **Лимит памяти**: 100 МБ
- **Алгоритм**: LRU (Least Recently Used)
- **Persistence**: НЕТ (кэш теряется при перезапуске)

### Когда использовать

- Разработка и тестирование
- Маленькие проекты с редкими перезапусками
- Когда нет возможности установить Redis

### Ограничения

1. **Кэш теряется при перезапуске** - после рестарта сервера все данные нужно кэшировать заново
2. **Не shared** - в кластерном режиме (несколько процессов) каждый процесс имеет свой кэш
3. **Занимает память Node.js** - может повлиять на производительность при большом объёме данных

### Проверка работы

```bash
curl http://localhost:3000/api/cache-stats
```

Ответ для in-memory кэша:
```json
{
  "type": "memory",
  "connected": true,
  "stats": {
    "size": 42,
    "calculatedSize": 1048576,
    "hits": 1234,
    "misses": 56,
    "hitRate": "95.6%"
  }
}
```

---

## Сравнение вариантов

| Параметр | Redis | In-memory LRU |
|----------|-------|---------------|
| Производительность | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Persistence | ✅ Да | ❌ Нет |
| Shared между процессами | ✅ Да | ❌ Нет |
| Требует установки | ✅ Да | ❌ Нет |
| Потребление RAM | 5-50 МБ | 0-100 МБ* |
| Сложность настройки | Средняя | Нулевая |

*в пределах процесса Node.js

---

## Мониторинг Redis

### Командная строка

```bash
# Информация о сервере
redis-cli info

# Статистика памяти
redis-cli info memory

# Количество ключей
redis-cli dbsize

# Просмотр ключей по паттерну
redis-cli keys "proj:*"

# Мониторинг в реальном времени
redis-cli monitor
```

### Полезные команды

```bash
# Очистить весь кэш
redis-cli flushall

# Очистить ключи проекта
redis-cli --scan --pattern "proj:PROJECT_ID:*" | xargs redis-cli del

# Проверить TTL ключа
redis-cli ttl "proj:xxx:articles"
```

---

## Troubleshooting

### Redis не запускается

```bash
# Проверяем логи
sudo journalctl -u redis-server -n 50

# Проверяем конфиг на ошибки
redis-server --test-memory 100
```

### Приложение не подключается к Redis

1. Проверьте что Redis запущен:
   ```bash
   sudo systemctl status redis-server
   ```

2. Проверьте подключение:
   ```bash
   redis-cli ping
   ```

3. Проверьте переменные окружения:
   ```bash
   sudo systemctl show thesis-api --property=Environment
   ```

### Высокое потребление памяти Redis

1. Проверьте текущее использование:
   ```bash
   redis-cli info memory | grep used_memory_human
   ```

2. Уменьшите лимит в конфиге:
   ```conf
   maxmemory 128mb
   ```

3. Перезапустите Redis

---

## Рекомендации

1. **Для production** всегда используйте Redis
2. Установите `maxmemory` согласно доступным ресурсам (обычно 10-20% от общей RAM)
3. Используйте политику `allkeys-lru` для автоматического управления памятью
4. Слушайте только `127.0.0.1` если Redis на том же сервере
5. Регулярно мониторьте использование памяти

---

## API endpoints для мониторинга

### GET /api/cache-stats

Возвращает информацию о текущем backend кэширования.

**Пример ответа (Redis):**
```json
{
  "type": "redis",
  "connected": true
}
```

**Пример ответа (Memory):**
```json
{
  "type": "memory",
  "connected": true,
  "stats": {
    "size": 42,
    "calculatedSize": 1048576,
    "hits": 1234,
    "misses": 56,
    "hitRate": "95.6%"
  }
}
```
