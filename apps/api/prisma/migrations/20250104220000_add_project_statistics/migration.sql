-- Таблица для хранения статистических элементов проекта (графики и таблицы)

CREATE TABLE IF NOT EXISTS project_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Тип элемента
  type VARCHAR(20) NOT NULL CHECK (type IN ('chart', 'table')),
  
  -- Название и описание
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Конфигурация (JSON с данными графика или таблицы)
  config JSONB NOT NULL,
  
  -- Исходные данные таблицы (если есть)
  table_data JSONB,
  
  -- Классификация данных
  data_classification JSONB,
  
  -- Метаданные для поиска и фильтрации
  chart_type VARCHAR(50), -- bar, histogram, stacked, pie, line, boxplot, scatter
  
  -- Ссылки на использование в документах
  used_in_documents UUID[], -- список ID документов, где используется
  
  -- Порядок сортировки
  order_index INTEGER DEFAULT 0,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_project_statistics_project ON project_statistics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_statistics_type ON project_statistics(type);
CREATE INDEX IF NOT EXISTS idx_project_statistics_chart_type ON project_statistics(chart_type);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_project_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_statistics_updated ON project_statistics;
CREATE TRIGGER trg_project_statistics_updated
  BEFORE UPDATE ON project_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_project_statistics_updated_at();
