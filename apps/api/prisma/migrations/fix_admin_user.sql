-- Скрипт для исправления админ-пользователя
-- Выполните на сервере: psql $DATABASE_URL -f fix_admin_user.sql

-- Сбросить пароль на 12345678 и установить is_admin = true
UPDATE users 
SET 
  is_admin = true,
  password_hash = '$argon2id$v=19$m=65536,t=3,p=4$YAYeD/40lWegtzYh2IUHQw$2ioW0cCy0orQDoMxKwBzsjFLs03qUm44HTxwoOJpxYY'
WHERE email = 'yuri-tolstihin@yandex.ru';

-- Проверить результат
SELECT id, email, is_admin, 
       LEFT(password_hash, 30) as password_hash_preview,
       created_at, last_login_at 
FROM users 
WHERE email = 'yuri-tolstihin@yandex.ru';
