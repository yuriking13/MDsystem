import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SidebarLayout from '../components/Layout/SidebarLayout';

type DocSection = 
  | 'overview'
  | 'articles'
  | 'documents'
  | 'files'
  | 'statistics'
  | 'graph'
  | 'team'
  | 'settings'
  | 'api-keys';

const DOC_SECTIONS: { id: DocSection; title: string; icon: React.ReactNode }[] = [
  { 
    id: 'overview', 
    title: 'Обзор платформы',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  { 
    id: 'articles', 
    title: 'База статей',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  { 
    id: 'documents', 
    title: 'Документы',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  { 
    id: 'files', 
    title: 'Файлы',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  { 
    id: 'statistics', 
    title: 'Статистика',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  { 
    id: 'graph', 
    title: 'Граф цитирований',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  { 
    id: 'team', 
    title: 'Команда',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  { 
    id: 'settings', 
    title: 'Настройки проекта',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  { 
    id: 'api-keys', 
    title: 'API ключи',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
];

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('overview');

  return (
    <SidebarLayout>
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Документация
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Руководство по использованию платформы
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="sticky top-24 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800 p-2">
              <nav className="space-y-1">
                {DOC_SECTIONS.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="w-5 h-5">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800 p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {activeSection === 'overview' && <OverviewSection />}
                {activeSection === 'articles' && <ArticlesSection />}
                {activeSection === 'documents' && <DocumentsSection />}
                {activeSection === 'files' && <FilesSection />}
                {activeSection === 'statistics' && <StatisticsSection />}
                {activeSection === 'graph' && <GraphSection />}
                {activeSection === 'team' && <TeamSection />}
                {activeSection === 'settings' && <SettingsSection />}
                {activeSection === 'api-keys' && <ApiKeysSection />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

function OverviewSection() {
  return (
    <div className="doc-section">
      <h2>Добро пожаловать в платформу для научных исследований</h2>
      
      <p className="doc-intro">
        Наша платформа помогает исследователям систематизировать работу с научными статьями, 
        создавать документы с автоматическим управлением библиографией, 
        визуализировать связи между публикациями и совместно работать над проектами.
      </p>

      <h3>Ключевые возможности</h3>
      
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
        <div className="feature-card" style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Поиск статей
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Поиск в PubMed, DOAJ, Wiley с фильтрацией по типу публикации, году, доступности текста
          </p>
        </div>
        
        <div className="feature-card" style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: '#10b981' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Автоматическая библиография
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Цитирование статей в документах с автоматическим формированием списка литературы в ГОСТ, APA, Vancouver
          </p>
        </div>
        
        <div className="feature-card" style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: '#8b5cf6' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Граф цитирований
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Визуализация связей между статьями, поиск релевантных публикаций через AI-ассистента
          </p>
        </div>
        
        <div className="feature-card" style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
            </svg>
            Статистика и графики
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Создание таблиц и графиков с возможностью вставки в документы и экспорта
          </p>
        </div>
      </div>

      <h3 style={{ marginTop: 32 }}>Быстрый старт</h3>
      <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
        <li>Создайте новый проект на странице «Проекты»</li>
        <li>Перейдите в раздел «База статей» и выполните поиск</li>
        <li>Отберите нужные статьи для работы</li>
        <li>Создайте документы и вставляйте цитаты из отобранных статей</li>
        <li>Экспортируйте готовую работу в Word или PDF</li>
      </ol>
    </div>
  );
}

function ArticlesSection() {
  return (
    <div className="doc-section">
      <h2>База статей</h2>
      
      <p className="doc-intro">
        База статей — центральное хранилище научных публикаций вашего проекта. 
        Здесь вы можете искать статьи, фильтровать их, переводить и управлять статусами.
      </p>

      <h3>Поиск статей</h3>
      <p>Нажмите кнопку «Поиск статей» для открытия формы поиска. Доступные параметры:</p>
      <ul>
        <li><strong>Поисковый запрос</strong> — ключевые слова или фразы. Поддерживаются операторы AND, OR</li>
        <li><strong>Источники</strong> — PubMed (медицинские статьи), DOAJ (открытый доступ), Wiley</li>
        <li><strong>Период публикации</strong> — выберите готовый пресет или укажите произвольные годы</li>
        <li><strong>Доступность текста</strong> — любой, полный текст, бесплатный полный текст</li>
        <li><strong>Типы публикаций</strong> — мета-анализ, систематический обзор, РКИ и др.</li>
        <li><strong>Максимум результатов</strong> — 10, 50, 100, 500, 1000 или все статьи</li>
      </ul>

      <div className="doc-tip" style={{ padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, marginTop: 16 }}>
        <strong>Совет:</strong> Используйте «Мультипоиск» для одновременного выполнения нескольких запросов 
        с одинаковыми фильтрами.
      </div>

      <h3 style={{ marginTop: 24 }}>Статусы статей</h3>
      <ul>
        <li><strong>Кандидаты</strong> — новые найденные статьи, требующие рассмотрения</li>
        <li><strong>Отобранные</strong> — статьи, одобренные для включения в работу</li>
        <li><strong>Исключённые</strong> — статьи, не подходящие для работы</li>
        <li><strong>Корзина</strong> — удалённые статьи (можно восстановить)</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Дополнительные функции</h3>
      <ul>
        <li><strong>Перевод</strong> — автоматический перевод заголовков и аннотаций на русский язык</li>
        <li><strong>Crossref обогащение</strong> — получение дополнительных метаданных (DOI, журнал, цитирования)</li>
        <li><strong>AI детекция статистики</strong> — поиск P-value и статистических показателей в аннотациях</li>
        <li><strong>Подсветка статистики</strong> — цветовое выделение значимых результатов</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Формирование библиографии</h3>
      <p>
        Список литературы формируется автоматически из статей, которые вы цитируете в документах. 
        При вставке цитаты в документ статья получает номер, который используется в тексте [1], [2] и т.д.
      </p>
      <p>
        Нумерация обновляется динамически: если вы удалите цитату, номера пересчитаются 
        так, чтобы не было пропусков.
      </p>
    </div>
  );
}

function DocumentsSection() {
  return (
    <div className="doc-section">
      <h2>Документы</h2>
      
      <p className="doc-intro">
        Раздел «Документы» предназначен для написания глав вашей работы 
        с поддержкой цитирования, таблиц, графиков и форматирования.
      </p>

      <h3>Создание документа</h3>
      <p>
        Нажмите «Создать документ» и введите название главы. Документы можно перетаскивать 
        для изменения порядка — это влияет на структуру экспортируемого файла.
      </p>

      <h3 style={{ marginTop: 24 }}>Редактор документов</h3>
      <p>Редактор поддерживает:</p>
      <ul>
        <li><strong>Форматирование</strong> — жирный, курсив, подчёркивание, зачёркивание</li>
        <li><strong>Заголовки</strong> — H1, H2, H3 для структурирования текста</li>
        <li><strong>Списки</strong> — маркированные и нумерованные</li>
        <li><strong>Таблицы</strong> — создание и редактирование с настройкой ширины столбцов</li>
        <li><strong>Ссылки</strong> — вставка гиперссылок</li>
        <li><strong>Цитаты</strong> — блочные цитаты и код</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Вставка цитат</h3>
      <p>
        Нажмите кнопку «Цитата» в панели инструментов. Откроется окно выбора статьи 
        из отобранных в вашем проекте. После выбора в текст вставится ссылка [N], 
        а статья добавится в список литературы.
      </p>

      <h3 style={{ marginTop: 24 }}>Импорт статистики</h3>
      <p>
        Кнопка «Статистика» позволяет вставить в документ таблицу или график 
        из раздела «Статистика». При экспорте в Word таблицы сохраняют форматирование.
      </p>

      <h3 style={{ marginTop: 24 }}>Нумерация таблиц и рисунков</h3>
      <p>
        Таблицы и рисунки автоматически нумеруются в порядке добавления в документ. 
        Заголовок таблицы отображается над ней («Таблица 1 — Название»), 
        а подпись к рисунку — под ним («Рисунок 1 — Название»).
      </p>

      <h3 style={{ marginTop: 24 }}>Экспорт</h3>
      <ul>
        <li><strong>Word (главы)</strong> — выберите конкретные главы для экспорта с их списком литературы</li>
        <li><strong>Word (объединённый)</strong> — экспорт всех глав в один документ с общей библиографией</li>
        <li><strong>PDF</strong> — экспорт в PDF через диалог печати браузера</li>
      </ul>
    </div>
  );
}

function FilesSection() {
  return (
    <div className="doc-section">
      <h2>Файлы</h2>
      
      <p className="doc-intro">
        Раздел «Файлы» предназначен для хранения вспомогательных материалов: 
        изображений, PDF-файлов, таблиц Excel и других документов.
      </p>

      <h3>Загрузка файлов</h3>
      <p>
        Нажмите «Загрузить файл» и выберите файл на компьютере. 
        Поддерживаются следующие форматы:
      </p>
      <ul>
        <li><strong>Изображения</strong> — JPG, PNG, GIF, SVG, WebP</li>
        <li><strong>Документы</strong> — PDF, DOC, DOCX, XLS, XLSX</li>
        <li><strong>Видео</strong> — MP4, WebM</li>
        <li><strong>Аудио</strong> — MP3, WAV, OGG</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Вставка в документы</h3>
      <p>
        Загруженные изображения можно вставлять в документы через кнопку «Файл» 
        в панели инструментов редактора. При выборе изображения оно автоматически 
        получит подпись «Рисунок N — Название».
      </p>

      <h3 style={{ marginTop: 24 }}>Просмотр и скачивание</h3>
      <p>
        Кликните на файл для предпросмотра (доступен для изображений, видео, аудио и PDF). 
        Используйте кнопку скачивания для загрузки файла на компьютер.
      </p>
    </div>
  );
}

function StatisticsSection() {
  return (
    <div className="doc-section">
      <h2>Статистика</h2>
      
      <p className="doc-intro">
        Раздел «Статистика» позволяет создавать таблицы данных и визуализировать их 
        в виде различных типов графиков.
      </p>

      <h3>Создание статистики</h3>
      <p>
        Нажмите «Создать таблицу/график» для открытия редактора. 
        Введите данные в табличной форме, затем выберите тип визуализации.
      </p>

      <h3 style={{ marginTop: 24 }}>Типы графиков</h3>
      <ul>
        <li><strong>Столбчатая диаграмма</strong> — сравнение значений между категориями</li>
        <li><strong>Гистограмма</strong> — распределение непрерывных данных</li>
        <li><strong>Stacked Bar</strong> — составные столбцы для анализа структуры</li>
        <li><strong>Круговая диаграмма</strong> — доли от целого</li>
        <li><strong>Линейный график</strong> — динамика изменений во времени</li>
        <li><strong>Boxplot</strong> — распределение с медианой и квартилями</li>
        <li><strong>Scatter</strong> — точечная диаграмма для корреляций</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Настройка графиков</h3>
      <p>
        В редакторе можно настроить заголовок, подписи осей, выбрать колонки для визуализации 
        и цветовую схему. Изменения сохраняются автоматически.
      </p>

      <h3 style={{ marginTop: 24 }}>Вставка в документы</h3>
      <p>
        Используйте кнопку «Статистика» в редакторе документа для выбора и вставки 
        таблицы или графика. При экспорте в Word таблицы сохраняют структуру, 
        а графики вставляются как изображения.
      </p>
    </div>
  );
}

function GraphSection() {
  return (
    <div className="doc-section">
      <h2>Граф цитирований</h2>
      
      <p className="doc-intro">
        Граф цитирований визуализирует связи между статьями вашего проекта 
        и релевантными публикациями из научных баз данных.
      </p>

      <h3>Как это работает</h3>
      <ol>
        <li>Статьи из вашего проекта отображаются в центре графа</li>
        <li>Нажмите «Связи» для загрузки информации о ссылках и цитированиях из PubMed/Crossref</li>
        <li>Выберите глубину: «+Ссылки» показывает статьи, на которые ссылаются ваши публикации; 
            «+Цитирующие» добавляет статьи, которые цитируют ваши работы</li>
      </ol>

      <h3 style={{ marginTop: 24 }}>Цвета узлов</h3>
      <ul>
        <li><span style={{ color: '#22c55e' }}>■</span> <strong>Зелёный</strong> — отобранные статьи</li>
        <li><span style={{ color: '#3b82f6' }}>■</span> <strong>Синий</strong> — PubMed (кандидаты)</li>
        <li><span style={{ color: '#eab308' }}>■</span> <strong>Жёлтый</strong> — DOAJ</li>
        <li><span style={{ color: '#8b5cf6' }}>■</span> <strong>Фиолетовый</strong> — Wiley</li>
        <li><span style={{ color: '#ef4444' }}>■</span> <strong>Красный</strong> — исключённые</li>
        <li><span style={{ color: '#f97316' }}>■</span> <strong>Оранжевый</strong> — ссылки (references)</li>
        <li><span style={{ color: '#ec4899' }}>■</span> <strong>Розовый</strong> — статьи, цитирующие ваши работы</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>AI-ассистент</h3>
      <p>
        Нажмите кнопку «AI» для открытия панели поиска. Опишите, какие статьи вы ищете, 
        и AI найдёт подходящие публикации среди связанных работ. Примеры запросов:
      </p>
      <ul>
        <li>«Найди мета-анализы по эффективности лечения»</li>
        <li>«Статьи с высоким уровнем доказательности»</li>
        <li>«РКИ за последние 5 лет»</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Добавление статей</h3>
      <p>
        Кликните на интересующий узел для просмотра деталей. 
        Используйте кнопки «В Кандидаты» или «В Отобранные» для добавления статьи в проект.
      </p>

      <div className="doc-tip" style={{ padding: 16, background: 'rgba(251, 191, 36, 0.1)', borderRadius: 8, marginTop: 16 }}>
        <strong>Кнопка P-value:</strong> Если среди связанных статей есть публикации со значимыми результатами, 
        вы можете добавить их все одним кликом по кнопке «+ Добавить все» рядом со счётчиком P-value.
      </div>
    </div>
  );
}

function TeamSection() {
  return (
    <div className="doc-section">
      <h2>Команда</h2>
      
      <p className="doc-intro">
        Раздел «Команда» позволяет приглашать коллег для совместной работы над проектом.
      </p>

      <h3>Роли участников</h3>
      <ul>
        <li><strong>Владелец (Owner)</strong> — полный доступ, может удалить проект и изменять роли</li>
        <li><strong>Редактор (Editor)</strong> — может редактировать документы, статьи и настройки</li>
        <li><strong>Читатель (Viewer)</strong> — только просмотр без возможности редактирования</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Приглашение участников</h3>
      <p>
        Введите email коллеги и выберите роль. Если пользователь ещё не зарегистрирован, 
        он получит приглашение при первом входе в систему.
      </p>

      <h3 style={{ marginTop: 24 }}>Real-time синхронизация</h3>
      <p>
        Изменения в проекте синхронизируются в реальном времени через WebSocket. 
        Вы увидите зелёный индикатор «Live» когда соединение активно.
      </p>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="doc-section">
      <h2>Настройки проекта</h2>
      
      <p className="doc-intro">
        В настройках можно изменить название проекта, выбрать стиль библиографии, 
        указать тип исследования и включить AI-анализ.
      </p>

      <h3>Тип исследования</h3>
      <p>
        Выберите тип вашего исследования для получения релевантных рекомендаций:
      </p>
      <ul>
        <li><strong>Описательное наблюдательное</strong> — клинические случаи, серии случаев</li>
        <li><strong>Аналитическое наблюдательное</strong> — когортные, случай-контроль, поперечные</li>
        <li><strong>Экспериментальное</strong> — РКИ, квазиэксперименты</li>
        <li><strong>Исследование второго порядка</strong> — систематические обзоры, метаанализы</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Протокол исследования</h3>
      <p>
        Выберите стандарт отчётности для проверки структуры работы:
      </p>
      <ul>
        <li><strong>CARE</strong> — для клинических случаев</li>
        <li><strong>STROBE</strong> — для наблюдательных исследований</li>
        <li><strong>CONSORT</strong> — для рандомизированных исследований</li>
        <li><strong>PRISMA</strong> — для систематических обзоров</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>Стиль библиографии</h3>
      <ul>
        <li><strong>ГОСТ Р 7.0.5-2008</strong> — российский стандарт, шрифт 14pt, интервал 1.5</li>
        <li><strong>APA 7th Edition</strong> — международный стандарт психологии</li>
        <li><strong>Vancouver</strong> — медицинский стиль с нумерованными ссылками</li>
      </ul>

      <h3 style={{ marginTop: 24 }}>AI-анализ</h3>
      <p>
        Включите AI-функции для автоматической проверки:
      </p>
      <ul>
        <li><strong>Анализ ошибок I и II рода</strong> — проверка статистических выводов</li>
        <li><strong>Проверка соответствия протоколу</strong> — анализ структуры работы</li>
      </ul>
    </div>
  );
}

function ApiKeysSection() {
  return (
    <div className="doc-section">
      <h2>API ключи</h2>
      
      <p className="doc-intro">
        API ключи позволяют расширить возможности платформы, подключив внешние сервисы.
      </p>

      <h3>OpenRouter</h3>
      <p>
        OpenRouter — это сервис доступа к различным AI-моделям (GPT-4, Claude, и др.). 
        Ключ используется для:
      </p>
      <ul>
        <li>Перевода заголовков и аннотаций статей</li>
        <li>AI-детекции статистики в аннотациях</li>
        <li>AI-ассистента в графе цитирований</li>
        <li>Проверки соответствия протоколу исследования</li>
      </ul>

      <h4 style={{ marginTop: 16 }}>Как получить ключ OpenRouter:</h4>
      <ol>
        <li>Зарегистрируйтесь на <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">openrouter.ai</a></li>
        <li>Пополните баланс (минимум $5)</li>
        <li>Перейдите в раздел Keys и создайте новый ключ</li>
        <li>Скопируйте ключ и вставьте в настройках платформы</li>
      </ol>

      <div className="doc-tip" style={{ padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, marginTop: 16 }}>
        <strong>Безопасность:</strong> Ключи хранятся в зашифрованном виде и используются 
        только для запросов от вашего аккаунта.
      </div>

      <h3 style={{ marginTop: 24 }}>Другие API ключи</h3>
      <p>
        В будущих версиях будет добавлена поддержка дополнительных сервисов 
        для работы с научными базами данных.
      </p>
    </div>
  );
}
