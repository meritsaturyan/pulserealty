# Railway Deployment Setup

## Необходимые переменные окружения в Railway

В настройках вашего Railway проекта (Settings → Variables) нужно добавить следующие переменные:

### База данных
- `DATABASE_URL` - Railway автоматически создаёт PostgreSQL и устанавливает эту переменную, но проверьте, что она есть

### Порт (автоматически)
- `PORT` - Railway автоматически устанавливает эту переменную, не нужно добавлять вручную

### Опциональные переменные
- `NODE_ENV=production`
- `CORS_ORIGIN` - список разрешённых доменов через запятую (например: `https://yoursite.com,https://www.yoursite.com`)
- `SOCKET_PATH=/socket.io` - путь для WebSocket (по умолчанию `/socket.io`)
- `JSON_LIMIT=20mb` - лимит размера JSON запросов

## Настройка в Railway Dashboard

1. Откройте ваш проект в Railway
2. Перейдите в Settings → Service
3. Убедитесь, что:
   - **Root Directory** не установлен (или оставьте пустым)
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`

4. Добавьте PostgreSQL базу данных:
   - Нажмите "+ New" → "Database" → "Add PostgreSQL"
   - Railway автоматически установит переменную `DATABASE_URL`

## Проверка деплоя

После деплоя проверьте логи в Railway. Успешный запуск должен показывать:
- `[DB] connected`
- `HTTP listening on http://0.0.0.0:PORT`

Если видите ошибки подключения к БД, проверьте переменную `DATABASE_URL`.

