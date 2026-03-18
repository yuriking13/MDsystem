# Development Tools

Инструменты для разработки контента и ресурсов проекта.

## HiggsField AI Integration

### Описание

Интеграция с HiggsField AI для генерации визуального контента в процессе разработки. Это **инструмент агента**, а не функция сайта.

### Настройка

1. Получите API ключи на https://cloud.higgsfield.ai/
2. Установите переменные окружения:

```bash
export HIGGSFIELD_API_KEY="ваш-api-ключ"
export HIGGSFIELD_API_SECRET="ваш-api-секрет"
```

### Использование

#### Быстрые команды:

```bash
# Контент для лэндинга
./generate-content.sh landing

# UI элементы
./generate-content.sh ui

# Фоны секций
./generate-content.sh backgrounds

# Медицинские иллюстрации
./generate-content.sh medical

# Набор иконок
./generate-content.sh icons
```

#### Кастомная генерация:

```bash
# Любой промпт
./generate-content.sh custom "Визуализация ДНК для героической секции"

# Научные диаграммы
./generate-content.sh custom "Схема работы ИИ в медицинских исследованиях"

# Абстрактные фоны
./generate-content.sh custom "Минималистичный фон с молекулярными структурами"
```

### Типы контента

**Для лэндинга:**

- Фоны героических секций
- Научные иллюстрации
- Визуализация ИИ и технологий
- Медицинские диаграммы

**Для интерфейса:**

- Иконки функций
- Иллюстрации процессов
- Графические элементы
- Декоративные элементы

**Для контента:**

- Обложки статей
- Инфографика данных
- Схемы исследований
- Образовательные материалы

### Структура вывода

```
generated-content/
├── landing/
│   ├── hero-background/
│   ├── ai-brain-visualization/
│   ├── research-workflow/
│   └── medical-innovation/
├── ui/
│   ├── feature-icons/
│   └── service-illustrations/
└── [timestamp]/
    └── generated-[timestamp]-[n].jpg
```

### Примеры промптов

**Научные:**

- "DNA double helix structure, molecular biology illustration"
- "Human brain anatomy, neuroscience medical diagram"
- "Modern research laboratory, scientific instruments"

**Технологические:**

- "AI neural network visualization, futuristic design"
- "Data flow diagram, information processing"
- "Digital transformation in healthcare"

**Медицинские:**

- "Medical imaging visualization, diagnostic technology"
- "Clinical research workflow, evidence-based medicine"
- "Patient care innovation, healthcare technology"

### Интеграция в рабочий процесс

1. **Планирование контента**: Определите нужные визуальные элементы
2. **Генерация**: Используйте команды для создания контента
3. **Обработка**: При необходимости отредактируйте в графических редакторах
4. **Интеграция**: Добавьте в проект и адаптируйте под дизайн

### Ограничения

- **Асинхронная генерация**: 30-120 секунд на изображение
- **Качество**: Зависит от детализации промпта
- **Лицензия**: Проверьте условия использования HiggsField
- **Кредиты**: Учитывайте лимиты аккаунта

### Советы по промптам

1. **Будьте специфичны**: Указывайте стиль, цвета, композицию
2. **Используйте качественные модификаторы**: "professional", "high quality", "detailed"
3. **Укажите назначение**: "for website header", "educational diagram"
4. **Тестируйте варианты**: Экспериментируйте с разными формулировками

Этот инструмент помогает быстро создавать качественный визуальный контент без необходимости искать стоковые изображения или заказывать дизайн.
