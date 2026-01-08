# Настройка Yandex Object Storage для хранения файлов проекта

## Обзор

Система использует Yandex Object Storage (S3-совместимое хранилище) для хранения файлов проекта:
- PDF документы и статьи
- Microsoft Word (.doc, .docx) и Excel (.xls, .xlsx)
- Изображения (JPEG, PNG, GIF, SVG, WebP)
- Видео (MP4, WebM)
- Аудио (MP3, WAV, OGG)

Максимальный размер файла: **50 MB**

---

## Шаг 1: Создание бакета в Yandex Cloud

### 1.1 Войдите в консоль Yandex Cloud

Перейдите на [console.yandex.cloud](https://console.yandex.cloud/)

### 1.2 Создайте сервисный аккаунт

1. Перейдите в **IAM → Сервисные аккаунты**
2. Нажмите **Создать сервисный аккаунт**
3. Укажите имя: `thesis-storage-service`
4. Нажмите **Создать**
5. После создания нажмите на аккаунт
6. Перейдите во вкладку **Роли**
7. Добавьте роли:
   - `storage.editor` (для загрузки/удаления файлов)
   - `storage.viewer` (для чтения файлов)

### 1.3 Создайте статический ключ доступа

1. На странице сервисного аккаунта перейдите во вкладку **Ключи доступа**
2. Нажмите **Создать новый ключ → Статический ключ доступа**
3. Добавьте описание: `thesis-api-s3-access`
4. Нажмите **Создать**
5. **ВАЖНО**: Сохраните оба значения:
   - `Идентификатор ключа` → это `S3_ACCESS_KEY_ID`
   - `Секретный ключ` → это `S3_SECRET_ACCESS_KEY`
   
   ⚠️ Секретный ключ показывается только один раз!

### 1.4 Создайте бакет

1. Перейдите в **Object Storage → Бакеты**
2. Нажмите **Создать бакет**
3. Укажите настройки:
   - **Имя бакета**: `thesis-project-files` (или любое уникальное имя)
   - **Макс. размер**: `10 GB` (или по потребности)
   - **Доступ на чтение**: `Ограниченный`
   - **Доступ к списку объектов**: `Ограниченный`
   - **Класс хранилища**: `Стандартное`
4. Нажмите **Создать бакет**

---

## Шаг 2: Переменные окружения

### Для локальной разработки

Добавьте в `apps/api/.env` (или системные переменные):

```env
# Yandex Object Storage (S3-compatible)
S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1
S3_ACCESS_KEY_ID=ваш_идентификатор_ключа
S3_SECRET_ACCESS_KEY=ваш_секретный_ключ
S3_BUCKET_NAME=thesis-project-files
```

### Для production (systemd)

Добавьте в `/etc/systemd/system/thesis-api.service.d/override.conf`:

```ini
[Service]
Environment="S3_ENDPOINT=https://storage.yandexcloud.net"
Environment="S3_REGION=ru-central1"
Environment="S3_ACCESS_KEY_ID=ваш_идентификатор_ключа"
Environment="S3_SECRET_ACCESS_KEY=ваш_секретный_ключ"
Environment="S3_BUCKET_NAME=thesis-project-files"
```

После изменения:
```bash
sudo systemctl daemon-reload
sudo systemctl restart thesis-api
```

---

## Шаг 3: GitHub Secrets (для CI/CD)

Добавьте следующие секреты в настройках репозитория:

| Имя секрета | Описание |
|-------------|----------|
| `S3_ENDPOINT` | `https://storage.yandexcloud.net` |
| `S3_REGION` | `ru-central1` |
| `S3_ACCESS_KEY_ID` | Идентификатор ключа от сервисного аккаунта |
| `S3_SECRET_ACCESS_KEY` | Секретный ключ (показывается только при создании) |
| `S3_BUCKET_NAME` | Имя созданного бакета |

### Как добавить секреты:

1. Перейдите в репозиторий на GitHub
2. **Settings → Secrets and variables → Actions**
3. Нажмите **New repository secret**
4. Добавьте каждый секрет по очереди

---

## Шаг 4: Обновление deploy workflow

Если используете GitHub Actions для деплоя, обновите `.github/workflows/deploy.yml`:

```yaml
env:
  S3_ENDPOINT: ${{ secrets.S3_ENDPOINT }}
  S3_REGION: ${{ secrets.S3_REGION }}
  S3_ACCESS_KEY_ID: ${{ secrets.S3_ACCESS_KEY_ID }}
  S3_SECRET_ACCESS_KEY: ${{ secrets.S3_SECRET_ACCESS_KEY }}
  S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
```

Или передавайте при запуске API сервиса.

---

## Шаг 5: Применение миграции базы данных

После деплоя примените миграцию для создания таблицы `project_files`:

```bash
cd apps/api
psql $DATABASE_URL -f prisma/migrations/add_project_files.sql
```

Или через Prisma:
```bash
pnpm prisma migrate deploy
```

---

## Проверка работоспособности

### Через API

```bash
# Проверка статуса хранилища
curl -H "Authorization: Bearer <token>" \
  https://your-api/api/storage/status

# Ответ если настроено:
{
  "configured": true,
  "maxFileSize": 52428800,
  "maxFileSizeFormatted": "50.0 MB",
  "allowedTypes": ["application/pdf", "image/jpeg", ...]
}
```

### Через UI

1. Откройте любой проект
2. Перейдите во вкладку **Файлы**
3. Если видите кнопку "Загрузить файл" — всё работает
4. Если видите сообщение "Хранилище не настроено" — проверьте переменные окружения

---

## Структура хранения файлов

Файлы сохраняются по пути:
```
{bucket}/projects/{projectId}/{uuid}.{ext}
```

Например:
```
thesis-project-files/projects/abc123/550e8400-e29b-41d4-a716-446655440000.pdf
```

---

## Безопасность

1. **Никогда** не коммитьте секретные ключи в репозиторий
2. Используйте разные сервисные аккаунты для dev/staging/production
3. Регулярно ротируйте ключи доступа
4. Настройте lifecycle rules в бакете для автоудаления старых файлов

---

## Поддерживаемые форматы файлов

| Категория | Расширения | MIME-типы |
|-----------|------------|-----------|
| Документы | .pdf, .doc, .docx, .xls, .xlsx | application/pdf, application/msword, ... |
| Изображения | .jpg, .jpeg, .png, .gif, .svg, .webp | image/jpeg, image/png, ... |
| Видео | .mp4, .webm | video/mp4, video/webm |
| Аудио | .mp3, .wav, .ogg | audio/mpeg, audio/wav, audio/ogg |

---

## Troubleshooting

### Ошибка "File storage is not configured"

Проверьте что все переменные окружения установлены:
```bash
echo $S3_ENDPOINT
echo $S3_REGION
echo $S3_ACCESS_KEY_ID
echo $S3_BUCKET_NAME
# S3_SECRET_ACCESS_KEY не выводите в логи!
```

### Ошибка "Access Denied" при загрузке

1. Проверьте права сервисного аккаунта (нужна роль `storage.editor`)
2. Убедитесь что ключи принадлежат правильному сервисному аккаунту
3. Проверьте имя бакета

### Ошибка "Bucket not found"

1. Проверьте существование бакета в консоли Yandex Cloud
2. Убедитесь в правильности имени бакета в `S3_BUCKET_NAME`
3. Проверьте что бакет находится в правильном каталоге
