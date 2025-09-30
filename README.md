# IG → Telegram (Webhook, Render, Docker)

Бот принимает ссылку на Instagram и постит видео в тот же чат/канал.
Готов к деплою на Render (Docker).

## Деплой на Render (через GitHub)
1) Создай репозиторий на GitHub и залей эти файлы.
2) На https://dashboard.render.com → **New +** → **Web Service**.
3) Выбери **Build from a Git repository** и подключи свой репозиторий.
4) Render увидит `render.yaml` и предложит создать сервис.
   - Type: **Web Service**
   - Environment: **Docker**
   - Plan: **Free** (можно и другой план)
5) В **Environment** добавь переменные:
   - `BOT_TOKEN` — токен бота из @BotFather
   - `WEBHOOK_SECRET_PATH` — например `igbot-12345`
   - (необязательно) `WEBHOOK_URL` — можно не задавать на Render, код сам возьмёт `RENDER_EXTERNAL_URL`
6) Нажми **Create Web Service**. Дождись сборки и запуска.

После старта:
- Добавь бота в свой канал админом, или в группу (и отключи privacy в @BotFather для чтения ссылок).
- Отправь ссылку на публичный пост/Reels IG — бот скачает и опубликует видео в этот же чат.

### Обновление
Пуш в выбранную ветку GitHub → авто-деплой (если включён autoDeploy).

## Локальный запуск (опционально)
```bash
npm ci
export BOT_TOKEN="123:ABC"
export WEBHOOK_SECRET_PATH="igbot-local-123"
export WEBHOOK_URL="https://your-tunnel.example.com"
node index.js
```

## Замечания
- Работает с публичными постами/Reels.
- Уважай авторские права.
