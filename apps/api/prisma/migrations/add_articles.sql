-- Таблицы для статей
-- Применить ОДИН РАЗ на сервере

-- Глобальная таблица статей (дедупликация по DOI/PMID)
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Идентификаторы (для дедупликации)
  doi VARCHAR(255) UNIQUE,
  pmid VARCHAR(50) UNIQUE,
  
  -- Оригинальные данные (английский)
  title_en TEXT NOT NULL,
  abstract_en TEXT,
  
  -- Переведённые данные (русский) - заполняется позже
  title_ru TEXT,
  abstract_ru TEXT,
  
  -- Метаданные
  authors TEXT[], -- массив авторов
  year SMALLINT,
  journal VARCHAR(500),
  publication_type VARCHAR(100), -- systematic review, RCT, meta-analysis, etc.
  url TEXT,
  
  -- Источник данных
  source VARCHAR(50) NOT NULL, -- pubmed, crossref, wiley
  
  -- Статистика в абстракте
  has_stats BOOLEAN DEFAULT false, -- есть ли p, CI, OR, RR, HR и т.д.
  stats_json JSONB, -- извлечённая статистика: {"p": ["0.05"], "ci": ["95%"], ...}
  
  -- Оригинальный ответ API
  raw_json JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Связь проекта со статьями
CREATE TABLE IF NOT EXISTS project_articles (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  
  -- Статус в проекте
  status VARCHAR(20) NOT NULL DEFAULT 'candidate' 
    CHECK (status IN ('candidate', 'selected', 'excluded')),
  
  -- Заметки пользователя
  notes TEXT,
  tags TEXT[], -- теги пользователя
  
  -- Кто добавил
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (project_id, article_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_articles_doi ON articles(doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_pmid ON articles(pmid) WHERE pmid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_year ON articles(year);
CREATE INDEX IF NOT EXISTS idx_articles_has_stats ON articles(has_stats) WHERE has_stats = true;
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);

CREATE INDEX IF NOT EXISTS idx_project_articles_status ON project_articles(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_articles_article ON project_articles(article_id);

-- Полнотекстовый поиск по заголовкам
CREATE INDEX IF NOT EXISTS idx_articles_title_en_gin ON articles USING gin(to_tsvector('english', title_en));
