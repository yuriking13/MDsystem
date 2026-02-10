# Промт для создания локального редактора тем MDsystem

## Задача

Создать файл `/workspaces/MDsystem/theme-editor/index.html` — полностраничный конструктор тем, который показывает **1:1 реплики** всех пользовательских страниц приложения MDsystem с возможностью редактирования **каждого цвета каждого элемента** через color-picker. Затем запустить сервер `node theme-editor/server.js` на порту 3099.

Файл `theme-editor/server.js` уже существует и работает — обслуживает статику из своей директории на порту 3099.

## Требования к конструктору

### Страницы (вкладки сверху)

1. **Логин** — auth-page с анимированным фоном, карточкой формы, feature-блоками
2. **Проекты** — page-container с projects-grid, project-card (glass-карточки)
3. **Статьи** — sidebar + article-card с бейджами, toolbar, фильтры
4. **Документы** — список документов, glass-карточки с метаданными
5. **Редактор** — текстовый редактор с toolbar (bold/italic/h1-h3/списки/цитаты)
6. **Файлы** — grid файлов с иконками/превью, upload-прогресс
7. **Граф** — canvas-область, control-panel (280px справа), легенда нод (12+ типов), toolbar
8. **Настройки проекта** — табы, формы, inputs
9. **Настройки пользователя** — API-ключи, формы

### Интерфейс

- **Слева**: навигация по страницам (вкладки)
- **По центру**: превью страницы (реплика реального UI)
- **Справа**: панель редактирования цветов (скроллируемая) с color-picker для КАЖДОГО цветового свойства на текущей странице
- **Сверху**: переключатель Dark/Light темы, кнопки "Экспорт CSS" и "Сброс"
- Все color-picker должны мгновенно обновлять превью при изменении

### Экспорт

Кнопка "Экспорт CSS" генерирует готовые CSS-переменные для обеих тем (`:root` для dark, `.light-theme` для light), которые можно скопировать и вставить в реальные CSS-файлы проекта.

---

## Система тем проекта

### Атрибуты

- `data-theme="dark|light"` на `<html>`
- Класс `light-theme` или `dark` на `<body>`
- Два набора переменных: modern (index.css `:root`/`[data-theme="dark"]`) и legacy (legacy.css `:root`/`.light-theme`)

### CSS-файлы проекта (для справки)

- `apps/web/src/styles/index.css` — design tokens, Tailwind v4
- `apps/web/src/styles/legacy.css` — legacy variables, все компоненты
- `apps/web/src/styles/app-layout.css` — sidebar neon glass
- `apps/web/src/styles/pages.css` — контейнеры, кнопки, модалки, project-cards
- `apps/web/src/styles/articles-section.css` — карточки статей, бейджи
- `apps/web/src/styles/citation-graph.css` — граф, control panel, легенда
- `apps/web/src/styles/animated-background.css` — статичный градиент фона
- `apps/web/src/styles/theme-switcher.css` — glassmorphic toggle

---

## ВСЕ CSS-переменные и цвета

### DARK THEME (`:root` / default)

#### Основные фоны

| Переменная         | Значение                                                                 | Описание       |
| ------------------ | ------------------------------------------------------------------------ | -------------- |
| `--bg-primary`     | `#0a1628`                                                                | Основной фон   |
| `--bg-secondary`   | `rgba(13, 27, 42, 0.9)`                                                  | Вторичный фон  |
| `--bg-glass`       | `rgba(13, 27, 42, 0.8)`                                                  | Glass-панели   |
| `--bg-glass-light` | `rgba(22, 34, 54, 0.6)`                                                  | Лёгкий glass   |
| `--bg-metal`       | `linear-gradient(145deg, rgba(22, 34, 54, 0.9), rgba(13, 27, 42, 0.95))` | Metal gradient |

#### Границы

| Переменная             | Значение                   |
| ---------------------- | -------------------------- |
| `--border-glass`       | `rgba(100, 140, 200, 0.1)` |
| `--border-glass-light` | `rgba(120, 160, 220, 0.2)` |
| `--border-glow`        | `rgba(75, 116, 255, 0.4)`  |

#### Текст

| Переменная         | Значение  | Описание           |
| ------------------ | --------- | ------------------ |
| `--text-primary`   | `#e8f0ff` | Основной текст     |
| `--text-secondary` | `#a0b5d8` | Вторичный текст    |
| `--text-muted`     | `#607095` | Приглушённый текст |

#### Акцентные цвета

| Переменная           | Значение  |
| -------------------- | --------- |
| `--accent`           | `#4b74ff` |
| `--accent-secondary` | `#7c3aed` |
| `--success`          | `#10b981` |
| `--danger`           | `#ef4444` |
| `--warning`          | `#fbbf24` |

#### Анимированный фон

| Значение                                    |
| ------------------------------------------- |
| `linear-gradient(-29deg, #01111D, #074F83)` |

#### Цвета нод графа (Dark)

| Переменная                      | Значение                    | Описание               |
| ------------------------------- | --------------------------- | ---------------------- |
| `--graph-node-citing`           | `#ec4899`                   | Citing (pink)          |
| `--graph-node-selected`         | `#22c55e`                   | Selected (green)       |
| `--graph-node-excluded`         | `#ef4444`                   | Excluded (red)         |
| `--graph-node-candidate-pubmed` | `#3b82f6`                   | PubMed (blue)          |
| `--graph-node-candidate-doaj`   | `#eab308`                   | DOAJ (yellow)          |
| `--graph-node-candidate-wiley`  | `#8b5cf6`                   | Wiley (violet)         |
| `--graph-node-reference`        | `#f97316`                   | Reference (orange)     |
| `--graph-node-related`          | `#06b6d4`                   | Related (cyan)         |
| `--graph-node-ai-found`         | `#00ffff`                   | AI Found (bright cyan) |
| `--graph-node-pvalue`           | `#fbbf24`                   | P-value (amber)        |
| `--graph-node-default`          | `#6b7280`                   | Default (gray)         |
| `--graph-cluster-default`       | `#6366f1`                   | Cluster (indigo)       |
| `--graph-bg`                    | `#0b0f19`                   | Graph background       |
| `--graph-link-color`            | `rgba(100, 130, 180, 0.25)` | Link color             |

#### Sidebar (Dark) — HSL hue variables

| Переменная     | Значение                                                                |
| -------------- | ----------------------------------------------------------------------- |
| `--glass-hue1` | `210`                                                                   |
| `--glass-hue2` | `250`                                                                   |
| Sidebar BG     | 75% прозрачный, `hsla(220, 25%, 6%, 0.25)` + backdrop-filter blur(18px) |
| Nav link text  | `neutral-400` → hover `white`                                           |
| Nav active     | bg `blue-600/20`, text `blue-400`                                       |
| Submenu text   | `neutral-400` → hover `white`                                           |
| Submenu active | bg `blue-600/15`, text `blue-400`                                       |
| Logo icon      | `bg-gradient-to-br from-blue-500 to-blue-600`                           |
| Footer text    | `neutral-400`                                                           |
| Logout hover   | bg `red-500/20`, text `red-400`                                         |

#### Компоненты (Dark)

| Элемент          | Background                                        | Border                    | Text                                      |
| ---------------- | ------------------------------------------------- | ------------------------- | ----------------------------------------- |
| Project card     | `rgba(13, 27, 42, 0.45)` + blur                   | `rgba(56, 89, 138, 0.25)` | title: `white`, desc: `neutral-400`       |
| Article card     | `rgba(13, 27, 42, 0.45)` + blur + 3px left border | `rgba(56, 89, 138, 0.25)` | title: `neutral-100`, meta: `neutral-400` |
| Modal            | `rgba(13, 27, 42, 0.85)` + blur                   | `rgba(56, 89, 138, 0.25)` | title: `white`, body: `neutral-300`       |
| Button primary   | `#2563eb` (bg-blue-600)                           | —                         | `white`                                   |
| Button secondary | `#162236`                                         | —                         | `neutral-200`                             |
| Button danger    | `#dc2626` (bg-red-600)                            | —                         | `white`                                   |
| Input            | `#162236`                                         | `rgba(56, 89, 138, 0.3)`  | `white`, placeholder: `neutral-500`       |
| Tab active       | bg `var(--accent)` / `#2563eb`                    | —                         | `white`                                   |
| Tab inactive     | glass pill                                        | —                         | `var(--text-secondary)`                   |
| Table header     | `rgba(13, 27, 42, 0.5)`                           | —                         | `var(--text-secondary)`                   |
| Alert error      | `bg-red-500/10`                                   | `border-red-500/20`       | `red-400`                                 |
| Badge source     | varies by source                                  | —                         | accent colored                            |
| File card        | `rgba(13, 27, 42, 0.45)`                          | `rgba(56, 89, 138, 0.25)` | `white`                                   |
| Editor toolbar   | `rgba(0, 0, 0, 0.3)`                              | —                         | —                                         |

#### Graph Control Panel (Dark)

| Элемент         | Значение                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Panel bg        | `#0f172a`                                                                                                        |
| Canvas bg       | `linear-gradient(135deg, #0f172a, #1e293b)`                                                                      |
| Slider bg       | `#334155`                                                                                                        |
| Slider thumb    | `#3b82f6`                                                                                                        |
| Select bg       | `rgba(51, 65, 85, 0.5)`, border `#475569`                                                                        |
| Checkbox border | `#475569`, bg `#1e293b`                                                                                          |
| Tool button     | bg `#1e293b`, text `#cbd5e1`                                                                                     |
| Tool active     | `#3b82f6` (blue), variants: purple `#8b5cf6`, emerald `#10b981`, amber `#f59e0b`, rose `#f43f5e`, cyan `#06b6d4` |
| Legend label    | `#cbd5e1`                                                                                                        |
| Legend count    | `#64748b`                                                                                                        |
| Node details bg | `#0f172a`                                                                                                        |
| Node title      | `#e2e8f0`                                                                                                        |
| Node authors    | `#94a3b8`                                                                                                        |
| Graph toolbar   | `rgba(15, 23, 42, 0.9)`, border `rgba(71, 85, 105, 0.5)`                                                         |

---

### LIGHT THEME (`.light-theme`)

#### Основные фоны

| Переменная         | Значение                    | Описание     |
| ------------------ | --------------------------- | ------------ |
| `--bg-primary`     | `#FDFCFB`                   | Основной фон |
| `--bg-secondary`   | `rgba(255, 239, 213, 0.9)`  | Вторичный    |
| `--bg-glass`       | `rgba(255, 248, 236, 0.9)`  | Glass        |
| `--bg-glass-light` | `rgba(255, 253, 249, 0.97)` | Light glass  |

#### Границы

| Переменная             | Значение                   |
| ---------------------- | -------------------------- |
| `--border-glass`       | `rgba(200, 125, 42, 0.15)` |
| `--border-glass-light` | `rgba(200, 125, 42, 0.25)` |
| `--border-glow`        | `rgba(200, 125, 42, 0.4)`  |

#### Текст

| Переменная         | Значение  |
| ------------------ | --------- |
| `--text-primary`   | `#2D1F10` |
| `--text-secondary` | `#6B5744` |
| `--text-muted`     | `#A89580` |

#### Акцентные цвета

| Переменная           | Значение  |
| -------------------- | --------- |
| `--accent`           | `#C87D2A` |
| `--accent-secondary` | `#D99A3A` |
| `--success`          | `#15803D` |
| `--danger`           | `#DC2626` |
| `--warning`          | `#EA580C` |

#### Анимированный фон

| Значение                                    |
| ------------------------------------------- |
| `linear-gradient(-29deg, #211f1f, #f3b067)` |

#### Цвета нод графа (Light)

| Переменная                      | Значение                    |
| ------------------------------- | --------------------------- |
| `--graph-node-citing`           | `#C87D2A`                   |
| `--graph-node-selected`         | `#D99A3A`                   |
| `--graph-node-excluded`         | `#9A5F1C`                   |
| `--graph-node-candidate-pubmed` | `#A89580`                   |
| `--graph-node-candidate-doaj`   | `#E0D6CA`                   |
| `--graph-node-candidate-wiley`  | `#C4B5A3`                   |
| `--graph-node-reference`        | `#F5BA5C`                   |
| `--graph-node-related`          | `#FFE4B8`                   |
| `--graph-node-ai-found`         | `#D99A3A`                   |
| `--graph-node-pvalue`           | `#FFD48A`                   |
| `--graph-node-default`          | `#E0D6CA`                   |
| `--graph-cluster-default`       | `#C87D2A`                   |
| `--graph-bg`                    | `#FDFCFB`                   |
| `--graph-link-color`            | `rgba(140, 122, 107, 0.25)` |

#### Sidebar (Light) — HSL hue overrides

| Переменная     | Значение                                               |
| -------------- | ------------------------------------------------------ |
| `--glass-hue1` | `35`                                                   |
| `--glass-hue2` | `25`                                                   |
| Sidebar BG     | `hsla(35, 30%, 85%, 0.12)` / `hsla(0, 0%, 100%, 0.25)` |
| Sidebar border | `hsla(25, 20%, 60%, 0.2)`                              |
| Nav link text  | `neutral-600` → hover `neutral-900`                    |
| Nav active     | bg `hsla(35, 50%, 50%, 0.12)`, text `primary-700`      |
| Submenu text   | `neutral-500` → hover `neutral-900`                    |
| Submenu active | text `primary-700`                                     |
| Logo text      | `neutral-900`                                          |
| Footer text    | `neutral-600`                                          |

#### Компоненты (Light)

| Элемент          | Background                         | Border                     | Text                                      |
| ---------------- | ---------------------------------- | -------------------------- | ----------------------------------------- |
| Project card     | `rgba(255, 255, 255, 0.45)` + blur | `rgba(255, 255, 255, 0.5)` | title: `neutral-900`, desc: `neutral-600` |
| Article card     | `rgba(255, 255, 255, 0.45)` + blur | `rgba(255, 255, 255, 0.5)` | title: `neutral-900`, meta: `neutral-600` |
| Modal            | `rgba(255, 255, 255, 0.9)` + blur  | `rgba(255, 255, 255, 0.5)` | title: `neutral-900`, body: `neutral-700` |
| Button primary   | `#C87D2A`                          | —                          | `white`                                   |
| Button secondary | `#FFF8EC` / `bg-neutral-100`       | —                          | `neutral-700`                             |
| Button danger    | `#DC2626`                          | —                          | `white`                                   |
| Input            | `#fff` / `bg-white`                | `border-neutral-300`       | `neutral-900`                             |
| Tab active       | `#C87D2A`                          | —                          | `white`                                   |
| File card        | `rgba(255, 255, 255, 0.45)`        | `rgba(255, 255, 255, 0.5)` | `#2D1F10`                                 |

#### Graph (Light)

| Элемент          | Значение                                    |
| ---------------- | ------------------------------------------- |
| Canvas bg        | `linear-gradient(135deg, #FDFCFB, #FFF8EC)` |
| Control panel bg | аналогично, light variant                   |

---

## Статистические бейджи (оба темы)

| Класс         | Background (Dark)           | Color (Dark)     |
| ------------- | --------------------------- | ---------------- |
| `.stat-p001`  | `rgba(74, 222, 128, 0.3)`   | `var(--success)` |
| `.stat-p01`   | `rgba(125, 222, 128, 0.25)` | `#7dde80`        |
| `.stat-p05`   | `rgba(173, 232, 128, 0.2)`  | `#ade880`        |
| `.stat-pval`  | `rgba(232, 224, 128, 0.2)`  | `#e8e080`        |
| `.stat-ci`    | `rgba(128, 200, 232, 0.2)`  | `#80c8e8`        |
| `.stat-ratio` | `rgba(200, 128, 232, 0.2)`  | `#c880e8`        |
| `.stat-n`     | `rgba(128, 128, 232, 0.2)`  | `#8080e8`        |
| `.stat-ai`    | `rgba(255, 165, 0, 0.25)`   | `#ffa500`        |

## Glassmorphism паттерн (повторяется везде)

```css
background-color: rgba(13, 27, 42, 0.45); /* dark */
backdrop-filter: blur(16px) saturate(180%);
border: 1px solid rgba(56, 89, 138, 0.25);
box-shadow:
  inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
  0 4px 24px -4px rgba(0, 0, 0, 0.2);

/* light variant */
background-color: rgba(255, 255, 255, 0.45);
border: 1px solid rgba(255, 255, 255, 0.5);
box-shadow:
  inset 0 1px 0 0 rgba(255, 255, 255, 0.6),
  0 4px 24px -4px rgba(0, 0, 0, 0.08);
```

---

## Инструкции

1. Создай файл `theme-editor/index.html` — single HTML file (всё inline: CSS + JS)
2. Файл должен содержать ВСЕ 9 страниц-вкладок, перечисленных выше
3. Каждая страница — визуальная реплика реального UI (glassmorphism, sidebar neon glass, карточки, бейджи и т.д.)
4. Справа — панель редактирования, организованная по группам (Фон, Текст, Акценты, Компоненты, Граф...) с color-picker для КАЖДОГО цвета
5. Переключатель темы Dark/Light — переключает и превью, и набор редактируемых цветов
6. Кнопка экспорта — генерирует копируемый CSS с переменными `:root` (dark) и `.light-theme` (light)
7. Запусти `node theme-editor/server.js` и открой в браузере `http://localhost:3099`

**Важно**: абсолютно ВСЕ цвета должны быть редактируемыми — каждый текст, каждый фон, каждая граница, каждый бейдж, каждая нода графа, каждая кнопка.
