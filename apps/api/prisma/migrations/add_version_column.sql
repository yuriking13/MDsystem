-- Добавление версионирования для Optimistic Locking
-- Колонка version увеличивается при каждом обновлении

ALTER TABLE project_statistics 
ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Индекс для быстрой проверки версии
CREATE INDEX IF NOT EXISTS idx_project_statistics_version 
ON project_statistics(id, version);

-- Также добавим version для documents (для синхронизации редактирования)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_documents_version 
ON documents(id, version);
