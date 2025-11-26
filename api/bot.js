// Telegram bot webhook for Mini App + admin-style sharing.
//
// Set these env vars on Vercel:
// - BOT_TOKEN
// - WEBAPP_BASE_URL
// - BOT_USERNAME
// - ADMIN_USER_ID (your Telegram numeric user id, for /newnote flow)

const fetch = require("node-fetch");
const { createNote } = require("./utils/db");
const { generateLinks } = require("./utils/generateLink");

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID
  ? parseInt(process.env.ADMIN_USER_ID, 10)
  : 0;

// simple in-memory state: userId -> step + temp data
const globalAny = global;
if (!globalAny.__BOT_STATE__) {
  globalAny.__BOT_STATE__ = {};
}
const states = globalAny.__BOT_STATE__;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }

  const update = req.body;

  try {
    if (update.message) {
      await handleMessage(update.message);
    }
  } catch (e) {
    console.error("Bot error:", e);
  }

  res.status(200).send("OK");
};

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || "";

  // Only allow /newnote flow from admin user
  const isAdmin = ADMIN_USER_ID && userId === ADMIN_USER_ID;
  const state = states[userId] || {};

  // /start
  if (text === "/start") {
    return sendMessage(
      chatId,
      "Welcome to your Mini App bot!\n\n" +
        "If you are the admin, use /newnote to upload a new HTML note."
    );
  }

  // /newnote
  if (text === "/newnote") {
    if (!isAdmin) {
      return sendMessage(chatId, "Only the admin can create notes.");
    }
    states[userId] = { step: "waiting_for_html" };
    return sendMessage(
      chatId,
      "Please send me the HTML file (.html) for this note."
    );
  }

  // waiting for HTML file
  if (isAdmin && state.step === "waiting_for_html" && msg.document) {
    const fileId = msg.document.file_id;
    const html = await downloadFile(fileId);
    states[userId] = { step: "waiting_for_title", html };
    return sendMessage(
      chatId,
      "Got the file! Now send me a *title* for this note.",
      { parse_mode: "Markdown" }
    );
  }

  // waiting for title
  if (isAdmin && state.step === "waiting_for_title" && text) {
    const title = text.trim();
    states[userId] = { ...state, step: "waiting_for_description", title };
    return sendMessage(
      chatId,
      "Optional: send a description for this note, or type '-' to skip."
    );
  }

  // waiting for description
  if (isAdmin && state.step === "waiting_for_description" && text) {
    const description = text === "-" ? "" : text.trim();
    const { html, title } = state;

    const note = createNote(html, title, description);
    const links = generateLinks(note.id);

    const messageText =
      `📘 ${note.title}\n\n` +
      (note.description ? `${note.description}\n\n` : "") +
      `You can forward this message to your group.`;

    await sendMessage(chatId, messageText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open",
              web_app: { url: links.webAppUrl }
            }
          ]
        ]
      }
    });

    delete states[userId];
    return;
  }

  // Fallback for non-admin or unexpected messages
  if (!text.startsWith("/")) {
    return; // ignore
  }
}

async function sendMessage(chatId, text, extra) {
  const payload = { chat_id: chatId, text, ...extra };

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function downloadFile(fileId) {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();

  if (!data.ok) {
    throw new Error("Failed to get file info from Telegram");
  }

  const filePath = data.result.file_path;
  const fileRes = await fetch(`${FILE_API}/${filePath}`);
  const html = await fileRes.text();
  return html;
}
