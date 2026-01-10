-- Добавляем колонку для отслеживания последнего прогресса и возможности отмены
-- Выполнить для добавления функционала автоматической отмены при зависании

-- Колонка для отслеживания последнего обновления прогресса
ALTER TABLE graph_fetch_jobs ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMP;

-- Колонка для пометки отменённого задания
ALTER TABLE graph_fetch_jobs ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Колонка для причины отмены (stalled, user_cancelled, timeout)
ALTER TABLE graph_fetch_jobs ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Новый статус 'cancelled' для отменённых заданий
-- (статус уже хранится как TEXT, просто добавляем возможное значение)

-- Индекс для быстрого поиска зависших заданий
CREATE INDEX IF NOT EXISTS idx_graph_fetch_jobs_last_progress ON graph_fetch_jobs(last_progress_at)
  WHERE status = 'running';

-- Функция для автоматической отмены зависших заданий (вызывается из API)
-- Задание считается зависшим если:
-- 1. Статус 'running'
-- 2. last_progress_at старше 60 секунд
-- 3. started_at старше 2 минут (чтобы дать время на первый прогресс)
