# Telegram Mini App Bot + Admin Dashboard (Demo Project)

This project shows a complete example of a Telegram Mini App bot similar to *Aplus Tutorial Mini App*:

- Upload HTML notes (via bot or admin panel)
- Store notes in memory (for demo)
- Generate Telegram deep links and WebApp URLs
- Admin dashboard to manage notes
- Revoke old links and generate new ones
- Mini App page that opens the requested HTML note

> ⚠️ This is a **demo** implementation. For production, replace the in-memory database with a real database (Vercel Postgres, KV, etc.).

## Structure

- `api/bot.js` – Telegram webhook
- `api/note.js` – Returns raw HTML for a note id
- `api/admin.js` – Admin JSON API for creating/listing/revoking notes
- `api/utils/*` – Shared helper modules
- `public/index.html` – Mini App HTML viewer
- `public/admin/index.html` – Admin dashboard
- `public/styles.css` – Shared styles

## Environment Variables

Set these in Vercel:

- `BOT_TOKEN` – Telegram bot token
- `BOT_USERNAME` – Your bot username (without @)
- `WEBAPP_BASE_URL` – Public URL of this Vercel project (e.g. `https://your-app.vercel.app`)
- `ADMIN_SECRET` – Secret string for admin HTTP API
- `ADMIN_USER_ID` – Your Telegram numeric user id for the `/newnote` bot flow

## Deploy

1. Push this repo to GitHub
2. Import into Vercel
3. Set env vars
4. Set Telegram webhook:

   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://YOUR-APP.vercel.app/api/bot`

## Usage (Admin Dashboard)

Open:

`https://YOUR-APP.vercel.app/admin/`

- Enter `ADMIN_SECRET`
- Create a new note (title + HTML)
- Copy `Share link` (Telegram deep link) and paste in Telegram to send to groups/chats

## Usage (Mini App)

When someone opens the deep link:

`https://t.me/YOUR_BOT/start?startapp=note_xxxxxxxx`

Telegram opens the Mini App with the `tgWebAppStartParam` assigning that note id, and `public/index.html` loads and displays it.
