# Agent Monitoring Dashboard

Комплексная система мониторинга в реальном времени для агентских систем с оптимизированной обработкой больших данных.

## 🚀 Возможности

### 1. AgentDashboard - Общий дашбоард состояния

- Мониторинг системных метрик в реальном времени
- Визуализация производительности через Chart.js
- Адаптивный дизайн с темной темой
- Настраиваемые панели мониторинга

### 2. Performance Tracking - Метрики производительности

- CPU/Memory usage в реальном времени
- Task processing rate monitoring
- Error rate tracking
- Исторические тренды производительности

### 3. Error Handling System - Система обработки ошибок

- Централизованное логирование ошибок
- Группировка и подсчет повторяющихся ошибок
- Фильтрация по уровням (critical, error, warning, info)
- Экспорт логов ошибок

### 4. Task Queue Visualization - Отображение очереди задач

- Управление очередью задач в реальном времени
- Статистика выполнения (pending, processing, completed, failed)
- Ретрай неудачных задач
- Детальный просмотр задач

### 5. Real-time Updates - WebSocket соединение

- Обновления в реальном времени через WebSocket
- Автоматическое переподключение
- Heartbeat мониторинг
- Efficient broadcasting для множественных клиентов

### 6. Optimized Tabulator Tables

- Виртуальный скроллинг для обработки больших данных
- Пагинация с настраиваемым размером страницы
- Сортировка и фильтрация
- Экспорт данных (JSON, CSV, Excel)
- Responsive дизайн

## 📦 Установка

```bash
# Переход в директорию мониторинга
cd MDsystem/monitoring

# Установка зависимостей
npm install

# Или использование yarn
yarn install
```

## 🔧 Настройка

### Конфигурация сервера

Создайте файл `config.json` для настройки:

```json
{
  "port": 3001,
  "websocket": {
    "path": "/ws/monitoring",
    "heartbeatInterval": 30000
  },
  "monitoring": {
    "maxErrorLogSize": 1000,
    "maxTaskHistorySize": 10000,
    "metricsInterval": 5000
  },
  "performance": {
    "virtualScrolling": true,
    "pageSize": 50,
    "maxDataPoints": 100
  }
}
```

### Переменные окружения

```bash
export PORT=3001
export NODE_ENV=production
export LOG_LEVEL=info
```

## 🚀 Запуск

### Запуск сервера мониторинга

```bash
# Продакшн режим
npm start

# Режим разработки с автоперезапуском
npm run dev
```

### Симуляция данных для тестирования

```bash
# Запуск симулятора данных
npm run simulate

# С настраиваемой скоростью и длительностью
node scripts/simulate-data.ts --speed=2 --duration=300
```

## 🌐 Доступ к дашборду

После запуска сервера:

- **Дашборд**: http://localhost:3001
- **API здоровья**: http://localhost:3001/health
- **WebSocket**: ws://localhost:3001/ws/monitoring

## 📊 API Endpoints

### Task Management

```bash
# Создание задачи
POST /api/tasks
{
  "name": "Data Processing Task",
  "type": "analysis",
  "description": "Process incoming dataset",
  "parameters": { "batchSize": 1000 }
}

# Обновление задачи
PUT /api/tasks/:id
{
  "status": "processing",
  "progress": 45,
  "agent": "analyzer-01"
}
```

### Error Logging

```bash
# Логирование ошибки
POST /api/errors
{
  "level": "error",
  "source": "data-processor",
  "message": "Failed to parse JSON data",
  "stack": "Error: ...",
  "context": { "userId": 12345 }
}
```

### Agent Status

```bash
# Обновление статуса агента
POST /api/agents
{
  "id": "agent-01",
  "name": "Data Analyzer",
  "status": "online",
  "cpu": 67.5,
  "memory": 1024,
  "activeTasks": 3,
  "capabilities": ["data-analysis", "ml"]
}
```

### System Metrics

```bash
# Получение метрик
GET /api/metrics
```

## 🔧 WebSocket Events

### Client → Server

```javascript
// Подписка на каналы
{
  "type": "subscribe",
  "channels": ["system", "tasks", "errors", "agents"]
}

// Запросы данных
{
  "type": "request_system_metrics"
}

// Управление очередью
{
  "type": "pause_queue"
}
{
  "type": "retry_failed_tasks"
}

// Управление агентами
{
  "type": "restart_agent",
  "agentId": "agent-01"
}
```

### Server → Client

```javascript
// Метрики системы
{
  "type": "system_metrics",
  "payload": {
    "cpu": 45.2,
    "memory": { "used": 2048, "total": 8192 },
    "taskRate": 12,
    "errorRate": 2.1
  }
}

// Обновление задачи
{
  "type": "task_update",
  "payload": {
    "id": 1001,
    "status": "processing",
    "progress": 65
  }
}

// Новая ошибка
{
  "type": "error_log",
  "payload": {
    "level": "error",
    "source": "processor",
    "message": "Connection timeout"
  }
}

// Статус агента
{
  "type": "agent_status",
  "payload": {
    "id": "agent-01",
    "status": "online",
    "cpu": 67.5,
    "memory": 1024
  }
}
```

## ⌨️ Горячие клавиши

- `Ctrl+R`: Обновить все данные
- `Ctrl+L`: Очистить логи
- `Ctrl+E`: Экспорт данных
- `Escape`: Закрыть модальные окна

## 🎯 Оптимизация производительности

### Tabulator Tables оптимизация

```javascript
// Виртуальный скроллинг для больших таблиц
const table = new Tabulator("#table", {
  virtualDom: true,
  virtualDomBuffer: 300,
  pagination: true,
  paginationSize: 50,
});

// Эффективное обновление данных
table.updateData([changedRows]);
```

### Chart.js оптимизация

```javascript
// Отключение анимации для частых обновлений
const chart = new Chart(ctx, {
  options: {
    animation: { duration: 0 },
    elements: { point: { radius: 0 } },
  },
});

// Лимит данных для исторических графиков
const maxDataPoints = 50;
```

### WebSocket оптимизация

```javascript
// Батчинг сообщений
const batchInterval = 100; // ms
const messageBatch = [];

// Дебаунсинг обновлений UI
const debouncedUpdate = debounce(updateUI, 50);
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Линтинг кода
npm run lint

# Проверка производительности
node scripts/performance-test.js
```

## 🔍 Мониторинг и отладка

### Health Check

```bash
curl http://localhost:3001/health
```

### Debug Mode

```javascript
// Включение режима отладки
localStorage.setItem("debug", "true");

// Доступ к debug функциям
window.debugDashboard.healthCheck();
window.debugDashboard.loadSampleData();
```

### Логирование

```javascript
// Уровни логирования
console.log("[INFO]", message);
console.warn("[WARN]", message);
console.error("[ERROR]", message);

// Structured logging
logger.info("Task completed", {
  taskId: 1001,
  duration: 5000,
  agent: "processor-01",
});
```

## 🚀 Продакшн деплой

### Используя PM2

```bash
# Установка PM2
npm install -g pm2

# Запуск в продакшн
pm2 start server/monitoring-server.ts --name "monitoring-dashboard"

# Мониторинг процесса
pm2 monit
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001
CMD ["npm", "start"]
```

### Nginx прокси

```nginx
server {
    listen 80;
    server_name monitoring.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🛠️ Разработка

### Структура проекта

```
MDsystem/monitoring/
├── index.html              # Основная страница дашборда
├── styles/
│   └── dashboard.css        # Стили дашборда
├── js/
│   ├── app.ts              # Главный файл приложения
│   ├── websocket-client.ts  # WebSocket клиент
│   ├── chart-manager.ts     # Менеджер графиков
│   ├── table-manager.ts     # Менеджер таблиц
│   └── dashboard-controller.ts # Контроллер дашборда
├── server/
│   └── monitoring-server.ts # WebSocket сервер
├── scripts/
│   └── simulate-data.ts     # Симулятор данных
├── package.json
└── README.md
```

### Добавление новых метрик

1. Обновите `collectSystemMetrics()` в сервере
2. Добавьте обработчик в `websocket-client.ts`
3. Создайте визуализацию в `chart-manager.ts`
4. Обновите UI в HTML

### Добавление новых типов задач

1. Обновите `taskTypes` в симуляторе
2. Добавьте обработку в `table-manager.js`
3. Обновите стили для новых статусов

## 📋 TODO

- [ ] Интеграция с Prometheus/Grafana
- [ ] Alerts и уведомления
- [ ] Пользовательские дашборды
- [ ] Более детальная аналитика
- [ ] Mobile приложение
- [ ] Интеграция с внешними системами мониторинга
- [ ] Advanced фильтрация и поиск
- [ ] Экспорт в различные форматы

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License - см. файл LICENSE для подробностей.

## 🆘 Поддержка

- GitHub Issues: [Создать issue](https://github.com/your-org/agent-monitoring/issues)
- Документация: [Wiki](https://github.com/your-org/agent-monitoring/wiki)
- Slack: #monitoring-dashboard

---

**Создан для эффективного мониторинга агентских систем с поддержкой больших объемов данных в реальном времени.**
