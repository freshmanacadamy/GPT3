const TelegramBot = require('node-telegram-bot-api');

// Global storage (in production, use a real database)
global.notes = new Map();
global.userStates = new Map();

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME;
const WEBAPP_BASE_URL = process.env.WEBAPP_BASE_URL;
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID);

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN);

// Generate unique ID for notes
function generateNoteId() {
  return 'note_' + Math.random().toString(36).substr(2, 9);
}

// Generate Telegram deep link
function generateTelegramLink(noteId) {
  return `https://t.me/${BOT_USERNAME}/start?startapp=${noteId}`;
}

// Handle /start command
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const startParam = text.split(' ')[1]; // Get startapp parameter

  if (startParam && startParam.startsWith('note_')) {
    // User opened via deep link
    const noteId = startParam;
    const note = global.notes.get(noteId);
    
    if (note && note.active) {
      const webAppUrl = `${WEBAPP_BASE_URL}/?note=${noteId}`;
      
      await bot.sendMessage(chatId,
        `📚 *${note.title}*\n\n` +
        `${note.description || 'No description provided.'}\n\n` +
        `👤 *Created by:* ${note.creator || 'Admin'}\n` +
        `📅 *Date:* ${new Date(note.createdAt).toLocaleDateString()}\n\n` +
        `[👉 Open Note in Mini App](${webAppUrl})`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📖 Open Note', web_app: { url: webAppUrl } }],
              [{ text: '📋 View All Notes', callback_data: 'view_all_notes' }]
            ]
          }
        }
      );
    } else {
      await bot.sendMessage(chatId, 
        '❌ *Note Not Available*\n\n' +
        'This note has been removed or the link has expired.\n\n' +
        'Contact the admin for more information.',
        { parse_mode: 'Markdown' }
      );
    }
  } else {
    // Regular start command
    await bot.sendMessage(chatId,
      `🤖 *Welcome to ${BOT_USERNAME}!* 📚\n\n` +
      'I help you share and view HTML notes through Telegram Mini Apps.\n\n' +
      '*✨ Features:*\n' +
      '• View beautiful HTML notes\n' +
      '• Mobile-optimized reading experience\n' +
      '• Secure note sharing\n' +
      '• Instant access in Telegram\n\n' +
      '*👨‍💻 Admin Commands:*\n' +
      '/newnote - Create a new note\n' +
      '/mynotes - View your notes\n' +
      '/stats - Bot statistics\n\n' +
      `[📱 Open Web App](${WEBAPP_BASE_URL})`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '📚 Browse Notes', web_app: { url: WEBAPP_BASE_URL } }],
            [{ text: '👨‍💻 Admin Panel', web_app: { url: `${WEBAPP_BASE_URL}/admin` } }]
          ],
          resize_keyboard: true
        }
      }
    );
  }
}

// Handle /newnote command (admin only)
async function handleNewNote(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_USER_ID) {
    await bot.sendMessage(chatId, 
      '❌ *Admin Access Required*\n\n' +
      'This command is only available for administrators.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  await bot.sendMessage(chatId,
    `📝 *Create New Note*\n\n` +
    `To create a new HTML note, please use our web dashboard:\n\n` +
    `[👨‍💻 Open Admin Dashboard](${WEBAPP_BASE_URL}/admin)\n\n` +
    `*Features:*\n` +
    `• Rich HTML editor\n` +
    `• Preview before publishing\n` +
    `• Link management\n` +
    `• Analytics tracking`,
    { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Open Admin Dashboard', web_app: { url: `${WEBAPP_BASE_URL}/admin` } }]
        ]
      }
    }
  );
}

// Handle /stats command
async function handleStats(msg) {
  const chatId = msg.chat.id;
  const totalNotes = global.notes.size;
  const activeNotes = Array.from(global.notes.values()).filter(note => note.active).length;
  
  await bot.sendMessage(chatId,
    `📊 *Bot Statistics*\n\n` +
    `📚 Total Notes: ${totalNotes}\n` +
    `✅ Active Notes: ${activeNotes}\n` +
    `❌ Inactive Notes: ${totalNotes - activeNotes}\n\n` +
    `🌐 Web App: ${WEBAPP_BASE_URL}\n` +
    `🤖 Bot: @${BOT_USERNAME}`,
    { parse_mode: 'Markdown' }
  );
}

// Handle callback queries
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  try {
    if (data === 'view_all_notes') {
      await bot.sendMessage(chatId,
        `📚 *All Available Notes*\n\n` +
        `Browse all notes in our web app:\n\n` +
        `[📱 Open Notes Gallery](${WEBAPP_BASE_URL})`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📖 Browse All Notes', web_app: { url: WEBAPP_BASE_URL } }]
            ]
          }
        }
      );
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Callback error:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error processing request' });
  }
}

// Main webhook handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      message: 'Telegram Mini App Bot is running!',
      timestamp: new Date().toISOString(),
      stats: {
        total_notes: global.notes.size,
        active_notes: Array.from(global.notes.values()).filter(note => note.active).length
      }
    });
  }
  
  // Handle POST requests (Telegram webhook)
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        const msg = update.message;
        const text = msg.text || '';
        
        if (text.startsWith('/start')) {
          await handleStart(msg);
        } else if (text.startsWith('/newnote')) {
          await handleNewNote(msg);
        } else if (text.startsWith('/stats')) {
          await handleStats(msg);
        } else if (text.startsWith('/mynotes')) {
          await bot.sendMessage(msg.chat.id, 
            'Open the admin dashboard to view your notes:\n\n' +
            `${WEBAPP_BASE_URL}/admin`,
            { parse_mode: 'Markdown' }
          );
        } else if (text) {
          // Handle other messages
          await bot.sendMessage(msg.chat.id,
            '🤖 Hello! Use /start to begin or /newnote to create notes (admin only).',
            { parse_mode: 'Markdown' }
          );
        }
      } else if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
      }
      
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};

console.log('✅ Telegram Mini App Bot initialized!');
