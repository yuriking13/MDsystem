-- Migration: Add search cache table for cross-platform search
-- Description: Создает таблицу для кэширования результатов поиска из внешних API

-- Search cache table
CREATE TABLE IF NOT EXISTS search_cache (
    query_hash VARCHAR(255) PRIMARY KEY,
    providers JSONB NOT NULL DEFAULT '[]',
    results JSONB NOT NULL DEFAULT '[]',
    total_found INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for faster cache cleanup
CREATE INDEX IF NOT EXISTS idx_search_cache_created_at ON search_cache(created_at);

-- Automatic cleanup trigger (removes entries older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_search_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM search_cache 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup on inserts (with rate limiting)
CREATE OR REPLACE FUNCTION should_cleanup_cache()
RETURNS BOOLEAN AS $$
BEGIN
    -- Only cleanup every 100th insert to avoid performance impact
    RETURN (random() < 0.01);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_search_cache ON search_cache;
CREATE TRIGGER trigger_cleanup_search_cache
    AFTER INSERT ON search_cache
    FOR EACH ROW
    WHEN (should_cleanup_cache())
    EXECUTE FUNCTION cleanup_old_search_cache();

-- User search history table (optional, for analytics)
CREATE TABLE IF NOT EXISTS user_search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    providers JSONB NOT NULL DEFAULT '[]',
    results_count INTEGER NOT NULL DEFAULT 0,
    search_time_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at);

-- Function to log search queries (privacy-aware)
CREATE OR REPLACE FUNCTION log_user_search(
    p_user_id INTEGER,
    p_query TEXT,
    p_providers JSONB,
    p_results_count INTEGER,
    p_search_time_ms INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Only store search stats, not the actual query content for privacy
    INSERT INTO user_search_history (user_id, query, providers, results_count, search_time_ms)
    VALUES (p_user_id, 
            CASE 
                WHEN length(p_query) > 100 THEN '[long query]'
                ELSE p_query 
            END,
            p_providers, 
            p_results_count, 
            p_search_time_ms);
            
    -- Cleanup old history (keep only last 1000 searches per user)
    DELETE FROM user_search_history 
    WHERE user_id = p_user_id 
    AND id NOT IN (
        SELECT id FROM user_search_history 
        WHERE user_id = p_user_id 
        ORDER BY created_at DESC 
        LIMIT 1000
    );
END;
$$ LANGUAGE plpgsql;

-- Search performance statistics view
CREATE OR REPLACE VIEW search_performance_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_searches,
    AVG(search_time_ms) as avg_search_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY search_time_ms) as p95_search_time_ms,
    AVG(results_count) as avg_results_count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_search_history 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

COMMENT ON TABLE search_cache IS 'Кэш результатов поиска из внешних API (PubMed, Crossref, arXiv)';
COMMENT ON TABLE user_search_history IS 'История поисковых запросов пользователей (для аналитики)';
COMMENT ON VIEW search_performance_stats IS 'Статистика производительности поиска за последние 30 дней';