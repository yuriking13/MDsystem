-- Миграция для таблицы user_api_keys
-- Хранит зашифрованные API ключи пользователей для внешних сервисов

CREATE TABLE IF NOT EXISTS user_api_keys (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_api_keys_unique UNIQUE (user_id, provider),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- Комментарии
COMMENT ON TABLE user_api_keys IS 'Зашифрованные API ключи пользователей для внешних провайдеров';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'Формат: v1:<iv_base64>:<cipher_base64>:<tag_base64> (AES-256-GCM)';
COMMENT ON COLUMN user_api_keys.provider IS 'Провайдер API (pubmed, wiley, openrouter и т.д.)';
