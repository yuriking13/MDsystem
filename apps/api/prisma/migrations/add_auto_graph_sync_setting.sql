-- Добавляет настройку автоподготовки графа после поиска статей
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS auto_graph_sync_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN projects.auto_graph_sync_enabled IS
'Если true, после поиска статей автоматически запускается pipeline: связи + семантическое ядро + кластеры + gaps';
