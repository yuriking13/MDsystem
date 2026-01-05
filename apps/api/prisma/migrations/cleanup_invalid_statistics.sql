-- Удаление статистик с невалидными UUID (временными ID типа table_TIMESTAMP)
-- Эти записи были созданы ошибочно и не могут быть использованы через API

DELETE FROM project_statistics
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Проверка результата (должно вернуть пустой список)
SELECT id, title, created_at 
FROM project_statistics 
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
