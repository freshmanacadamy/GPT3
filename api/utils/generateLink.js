/**
 * Generate Telegram deep link and web app URL for a note.
 * BOT_USERNAME and WEBAPP_BASE_URL must be set in env vars.
 */
function generateLinks(noteId) {
  const botUsername = process.env.BOT_USERNAME || "YOUR_BOT_USERNAME";
  const webBase = process.env.WEBAPP_BASE_URL || "https://your-vercel-app.vercel.app";

  // Deep link that can be shared in Telegram
  const telegramDeepLink = `https://t.me/${botUsername}/start?startapp=${noteId}`;

  // URL that Telegram will open for the web_app button
  const webAppUrl = `${webBase}/?tgWebAppStartParam=${encodeURIComponent(noteId)}`;

  return { telegramDeepLink, webAppUrl };
}

module.exports = { generateLinks };
