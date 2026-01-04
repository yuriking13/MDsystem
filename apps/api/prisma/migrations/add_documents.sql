-- Документы (главы/разделы диссертации)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT, -- JSON от TipTap
  order_index INT NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- для вложенности
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_order ON documents(project_id, order_index);

-- Цитаты в документах (связь документ <-> статья)
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0, -- порядок в списке литературы
  inline_number INT, -- номер в тексте [1], [2], etc.
  page_range VARCHAR(50), -- с. 15-20
  note TEXT, -- примечание к цитате
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citations_document ON citations(document_id);
CREATE INDEX IF NOT EXISTS idx_citations_article ON citations(article_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_citations_unique ON citations(document_id, article_id);

-- Настройки библиографии проекта
ALTER TABLE projects ADD COLUMN IF NOT EXISTS citation_style VARCHAR(50) DEFAULT 'gost';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ru';
