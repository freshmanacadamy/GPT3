const TelegramBot = require('node-telegram-bot-api');

// 🛡️ GLOBAL ERROR HANDLER
process.on('unhandledRejection', (error) => {
  console.error('🔴 Unhandled Promise Rejection:', error);
});
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
});

// Get environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_BASE_URL = process.env.WEBAPP_BASE_URL;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN environment variable is required');
}

// Create bot instance (without polling)
const bot = new TelegramBot(BOT_TOKEN);

// ========== DATABASE (In-Memory) ========== //
const users = new Map();
const notes = new Map();
const userStates = new Map();
let noteIdCounter = 1;

// ========== MAIN MENU ========== //
const showMainMenu = async (chatId) => {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '📚 Browse Notes' }, { text: '➕ Create Note' }],
        [{ text: '📋 My Notes' }, { text: '🛠️ Admin Panel' }],
        [{ text: 'ℹ️ Help' }]
      ],
      resize_keyboard: true
    }
  };
  
  await bot.sendMessage(chatId,
    `📝 *HTML Notes Sharing Bot*\n\n` +
    `Create and share beautiful HTML notes via Telegram!\n\n` +
    `Choose an option below:`,
    { parse_mode: 'Markdown', ...options }
  );
};

// ========== START COMMAND ========== //
const handleStart = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const startParam = msg.text.split(' ')[1]; // Get startapp parameter

  // Register user
  if (!users.has(userId)) {
    users.set(userId, {
      telegramId: userId,
      username: msg.from.username || '',
      firstName: msg.from.first_name,
      joinedAt: new Date()
    });
  }

  // Handle deep link (note sharing)
  if (startParam && startParam.startsWith('note_')) {
    const noteId = startParam;
    const note = notes.get(noteId);
    
    if (note && note.active) {
      const webAppUrl = `${WEBAPP_BASE_URL}/?note=${noteId}`;
      
      await bot.sendMessage(chatId,
        `📚 *${note.title}*\n\n` +
        `${note.description || 'No description provided.'}\n\n` +
        `[👉 Open Note in Mini App](${webAppUrl})`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📖 Open Note', web_app: { url: webAppUrl } }],
              [{ text: '📚 Browse All Notes', callback_data: 'browse_all' }]
            ]
          }
        }
      );
    } else {
      await bot.sendMessage(chatId, '❌ Note not found or link revoked.');
    }
    return;
  }

  // Regular start command
  await bot.sendMessage(chatId,
    `🤖 *Welcome to HTML Notes Bot!* 📚\n\n` +
    `Create and share beautiful HTML notes through Telegram Mini Apps!\n\n` +
    `✨ *Features:*\n` +
    `• Create HTML notes with rich formatting\n` +
    `• Share via Telegram deep links\n` +
    `• Mobile-optimized reading experience\n` +
    `• Secure note sharing with link revocation\n\n` +
    `Start by browsing notes or creating your own!`,
    { parse_mode: 'Markdown' }
  );
  
  await showMainMenu(chatId);
};

// ========== BROWSE NOTES ========== //
const handleBrowse = async (msg) => {
  const chatId = msg.chat.id;
  const activeNotes = Array.from(notes.values())
    .filter(note => note.active)
    .slice(0, 10);

  if (activeNotes.length === 0) {
    await bot.sendMessage(chatId,
      `📚 *Browse Notes*\n\n` +
      `No notes available yet.\n\n` +
      `Be the first to create a note! 💫\n` +
      `Use "➕ Create Note" to get started.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await bot.sendMessage(chatId,
    `📚 *Available Notes (${activeNotes.length})*\n\n` +
    `Latest shared notes:`,
    { parse_mode: 'Markdown' }
  );

  // Send each note
  for (const note of activeNotes) {
    const creator = users.get(note.creatorId);
    const webAppUrl = `${WEBAPP_BASE_URL}/?note=${note.id}`;
    
    const browseKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📖 Read Note', web_app: { url: webAppUrl } },
            { text: '📤 Share', callback_data: `share_${note.id}` }
          ]
        ]
      }
    };

    await bot.sendMessage(chatId,
      `📝 *${note.title}*\n\n` +
      `📋 *Description:* ${note.description || 'No description'}\n` +
      `👤 *Author:* ${creator?.firstName || 'Anonymous'}\n` +
      `📅 *Created:* ${new Date(note.createdAt).toLocaleDateString()}\n\n` +
      `Read this beautiful HTML note!`,
      {
        parse_mode: 'Markdown',
        reply_markup: browseKeyboard.reply_markup
      }
    );

    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

// ========== CREATE NOTE ========== //
const handleCreateNote = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check if user is admin
  if (userId !== ADMIN_USER_ID) {
    await bot.sendMessage(chatId,
      `❌ *Admin Access Required*\n\n` +
      `Note creation is currently limited to administrators.\n\n` +
      `Use the web dashboard instead:\n` +
      `${WEBAPP_BASE_URL}/admin`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  userStates.set(userId, {
    state: 'awaiting_note_title',
    noteData: {}
  });

  await bot.sendMessage(chatId,
    `📝 *Create New Note - Step 1/3*\n\n` +
    `✏️ *Enter Note Title*\n\n` +
    `Please send the title for your note:`,
    { parse_mode: 'Markdown' }
  );
};

// ========== HELP COMMAND ========== //
const handleHelp = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isAdmin = userId === ADMIN_USER_ID;

  let helpMessage = `ℹ️ *HTML Notes Bot Help*\n\n` +
    `*How to Read Notes:*\n` +
    `1. Click "📚 Browse Notes"\n` +
    `2. View available notes\n` +
    `3. Click "📖 Read Note" to open in Mini App\n` +
    `4. Enjoy beautiful HTML formatting\n\n` +
    `*How Notes Work:*\n` +
    `• Notes are created as HTML content\n` +
    `• Open in Telegram Mini App for best experience\n` +
    `• Mobile-optimized and responsive\n` +
    `• Secure sharing with unique links\n\n` +
    `*User Commands:*\n` +
    `/start - Start the bot\n` +
    `/help - Show this help\n` +
    `/browse - Browse available notes\n` +
    `/mynotes - View your notes (admin)\n` +
    `/status - Check bot statistics\n`;

  if (isAdmin) {
    helpMessage += `\n*⚡ Admin Commands:*\n` +
      `/createnote - Create a new HTML note\n` +
      `/admin - Admin panel\n` +
      `/stats - Detailed statistics\n` +
      `\n*🌐 Web Dashboard:*\n` +
      `${WEBAPP_BASE_URL}/admin`;
  }

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
};

// ========== MY NOTES ========== //
const handleMyNotes = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const userNotes = Array.from(notes.values())
    .filter(note => note.creatorId === userId);

  if (userNotes.length === 0) {
    await bot.sendMessage(chatId,
      `📋 *My Notes*\n\n` +
      `You haven't created any notes yet.\n\n` +
      `Use "➕ Create Note" to start sharing! 💫`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  let message = `📋 *Your Notes (${userNotes.length})*\n\n`;
  
  userNotes.forEach((note, index) => {
    const statusIcon = note.active ? '✅' : '❌';
    message += `${index + 1}. ${statusIcon} *${note.title}*\n`;
    message += `   📅 ${new Date(note.createdAt).toLocaleDateString()}\n\n`;
  });

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

// ========== ADMIN PANEL ========== //
const handleAdmin = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    await bot.sendMessage(chatId, '❌ Admin access required.');
    return;
  }

  const totalNotes = notes.size;
  const activeNotes = Array.from(notes.values()).filter(note => note.active).length;
  const totalUsers = users.size;

  await bot.sendMessage(chatId,
    `🛠️ *Admin Panel*\n\n` +
    `📊 *Statistics:*\n` +
    `👥 Users: ${totalUsers}\n` +
    `📝 Notes: ${totalNotes}\n` +
    `✅ Active: ${activeNotes}\n` +
    `❌ Inactive: ${totalNotes - activeNotes}\n\n` +
    `🌐 *Web Dashboard:*\n` +
    `${WEBAPP_BASE_URL}/admin\n\n` +
    `Use the web dashboard for full control!`,
    { parse_mode: 'Markdown' }
  );
};

// ========== STATUS COMMAND ========== //
const handleStatus = async (msg) => {
  const chatId = msg.chat.id;
  const totalNotes = notes.size;
  const activeNotes = Array.from(notes.values()).filter(note => note.active).length;
  const totalUsers = users.size;

  await bot.sendMessage(chatId,
    `📊 *Bot Status*\n\n` +
    `👥 Users: ${totalUsers}\n` +
    `📝 Notes: ${totalNotes}\n` +
    `✅ Active: ${activeNotes}\n` +
    `🌐 Web App: ${WEBAPP_BASE_URL}\n\n` +
    `🤖 HTML Notes Bot - Running Perfectly! 🚀`,
    { parse_mode: 'Markdown' }
  );
};

// ========== MESSAGE HANDLER ========== //
const handleMessage = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text) return;

  // Handle commands
  if (text.startsWith('/')) {
    switch (text) {
      case '/start':
        await handleStart(msg);
        break;
      case '/help':
      case 'ℹ️ Help':
        await handleHelp(msg);
        break;
      case '/browse':
      case '📚 Browse Notes':
        await handleBrowse(msg);
        break;
      case '/createnote':
      case '➕ Create Note':
        await handleCreateNote(msg);
        break;
      case '/mynotes':
      case '📋 My Notes':
        await handleMyNotes(msg);
        break;
      case '/admin':
      case '🛠️ Admin Panel':
        await handleAdmin(msg);
        break;
      case '/status':
        await handleStatus(msg);
        break;
      default:
        await showMainMenu(chatId);
    }
  } else {
    // Handle regular messages (note creation flow)
    await handleRegularMessage(msg);
  }
};

// ========== CALLBACK QUERY HANDLER ========== //
const handleCallbackQuery = async (callbackQuery) => {
  const message = callbackQuery.message;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const chatId = message.chat.id;

  try {
    // Handle different callback types
    if (data.startsWith('share_')) {
      const noteId = data.replace('share_', '');
      await handleShareNote(chatId, userId, noteId, callbackQuery.id);
    } else if (data === 'browse_all') {
      await handleBrowse({ chatId, from: { id: userId } });
    }

    // Answer callback query
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Callback error:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error processing request' });
  }
};

// ========== REGULAR MESSAGE HANDLER ========== //
const handleRegularMessage = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  const userState = userStates.get(userId);

  if (!userState) {
    // If no active state, show main menu
    await showMainMenu(chatId);
    return;
  }

  if (userState.state === 'awaiting_note_title') {
    userState.noteData.title = text;
    userState.state = 'awaiting_note_description';
    userStates.set(userId, userState);

    await bot.sendMessage(chatId,
      `📝 *Create New Note - Step 2/3*\n\n` +
      `📋 *Enter Note Description*\n\n` +
      `Please send a description for your note (optional):\n\n` +
      `Type "skip" to continue without description.`,
      { parse_mode: 'Markdown' }
    );

  } else if (userState.state === 'awaiting_note_description') {
    if (text.toLowerCase() !== 'skip') {
      userState.noteData.description = text;
    }
    userState.state = 'awaiting_note_html';
    userStates.set(userId, userState);

    await bot.sendMessage(chatId,
      `📝 *Create New Note - Step 3/3*\n\n` +
      `🖋️ *Enter HTML Content*\n\n` +
      `Please send the HTML content for your note:\n\n` +
      `Example:\n` +
      `<h1>My Note</h1>\n` +
      `<p>This is my content...</p>`,
      { parse_mode: 'Markdown' }
    );

  } else if (userState.state === 'awaiting_note_html') {
    userState.noteData.html = text;
    userState.state = 'complete';
    userStates.set(userId, userState);

    // Create the note
    const noteId = `note_${noteIdCounter++}`;
    const note = {
      id: noteId,
      title: userState.noteData.title,
      description: userState.noteData.description || '',
      html: userState.noteData.html,
      creatorId: userId,
      active: true,
      createdAt: new Date()
    };

    notes.set(noteId, note);

    const telegramDeepLink = `https://t.me/${bot.options.username}/start?startapp=${noteId}`;
    const webAppUrl = `${WEBAPP_BASE_URL}/?note=${noteId}`;

    await bot.sendMessage(chatId,
      `🎉 *Note Created Successfully!*\n\n` +
      `📝 *Title:* ${note.title}\n` +
      `📋 *Description:* ${note.description || 'None'}\n` +
      `🆔 *Note ID:* ${noteId}\n\n` +
      `🔗 *Telegram Share Link:*\n` +
      `\`${telegramDeepLink}\`\n\n` +
      `🌐 *Web App URL:*\n` +
      `${webAppUrl}\n\n` +
      `Share the Telegram link with others!`,
      { parse_mode: 'Markdown' }
    );

    // Clear user state
    userStates.delete(userId);
  }
};

// ========== SHARE NOTE HANDLER ========== //
const handleShareNote = async (chatId, userId, noteId, callbackQueryId) => {
  const note = notes.get(noteId);
  
  if (!note) {
    await bot.answerCallbackQuery(callbackQueryId, { text: '❌ Note not found' });
    return;
  }

  const telegramDeepLink = `https://t.me/${bot.options.username}/start?startapp=${noteId}`;
  
  await bot.sendMessage(chatId,
    `📤 *Share This Note*\n\n` +
    `📝 *${note.title}*\n\n` +
    `🔗 *Share Link:*\n` +
    `\`${telegramDeepLink}\`\n\n` +
    `Copy this link and share it with others!\n\n` +
    `*Preview:* ${WEBAPP_BASE_URL}/?note=${noteId}`,
    { parse_mode: 'Markdown' }
  );
};

// ========== MINIAPP API ENDPOINTS ========== //

// Handle note retrieval for MiniApp
const handleGetNote = async (req, res) => {
  const noteId = req.query.id;
  
  if (!noteId) {
    return res.status(400).json({ error: 'Note ID required' });
  }
  
  const note = notes.get(noteId);
  
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  
  if (!note.active) {
    return res.status(410).json({ error: 'Note link has been revoked' });
  }
  
  // Return HTML content for MiniApp
  res.setHeader('Content-Type', 'text/html');
  return res.send(note.html);
};

// Handle admin API requests
const handleAdminAPI = async (req, res) => {
  const adminSecret = req.query.admin_secret;
  const action = req.query.action;
  
  // Verify admin secret
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }
  
  if (action === 'create' && req.method === 'POST') {
    try {
      const { title, description, html } = req.body;
      
      if (!title || !html) {
        return res.status(400).json({ error: 'Title and HTML are required' });
      }
      
      const noteId = `note_${noteIdCounter++}`;
      const note = {
        id: noteId,
        title: title.trim(),
        description: (description || '').trim(),
        html: html,
        creatorId: ADMIN_USER_ID,
        active: true,
        createdAt: new Date()
      };
      
      notes.set(noteId, note);
      
      const telegramDeepLink = `https://t.me/${bot.options.username}/start?startapp=${noteId}`;
      const webAppUrl = `${WEBAPP_BASE_URL}/?note=${noteId}`;
      
      return res.json({
        success: true,
        note: {
          id: noteId,
          title: note.title,
          description: note.description
        },
        links: {
          telegramDeepLink,
          webAppUrl
        }
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create note' });
    }
  }
  
  if (action === 'list' && req.method === 'GET') {
    // List all notes for admin
    const notesArray = Array.from(notes.entries()).map(([id, note]) => ({
      id,
      title: note.title,
      description: note.description,
      active: note.active,
      createdAt: note.createdAt,
      telegramDeepLink: `https://t.me/${bot.options.username}/start?startapp=${id}`,
      webAppUrl: `${WEBAPP_BASE_URL}/?note=${id}`
    }));
    
    return res.json({ 
      success: true,
      notes: notesArray 
    });
  }
  
  if (action === 'revoke' && req.method === 'POST') {
    try {
      const { noteId } = req.body;
      
      if (!notes.has(noteId)) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      // Deactivate the note
      const note = notes.get(noteId);
      note.active = false;
      notes.set(noteId, note);
      
      return res.json({
        success: true,
        message: 'Note link revoked successfully'
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to revoke note' });
    }
  }
  
  return res.status(400).json({ error: 'Invalid action' });
};

// ========== VERCEL HANDLER ========== //
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle API routes for MiniApp
  if (req.url.startsWith('/api/note')) {
    return handleGetNote(req, res);
  }
  
  if (req.url.startsWith('/api/admin')) {
    return handleAdminAPI(req, res);
  }

  // Handle GET requests (for webhook setup and health checks)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      message: 'HTML Notes Bot is running on Vercel!',
      timestamp: new Date().toISOString(),
      stats: {
        users: users.size,
        notes: notes.size,
        active_notes: Array.from(notes.values()).filter(note => note.active).length
      },
      endpoints: {
        web_app: WEBAPP_BASE_URL,
        admin_dashboard: `${WEBAPP_BASE_URL}/admin`,
        api_note: `${WEBAPP_BASE_URL}/api/note`,
        api_admin: `${WEBAPP_BASE_URL}/api/admin`
      }
    });
  }

  // Handle POST requests (Telegram webhook updates)
  if (req.method === 'POST') {
    try {
      const update = req.body;

      // Handle different update types
      if (update.message) {
        await handleMessage(update.message);
      } else if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error processing update:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
};

console.log('✅ HTML Notes Bot configured for Vercel!');
console.log(`🌐 Web App URL: ${WEBAPP_BASE_URL}`);
console.log(`🛠️ Admin Dashboard: ${WEBAPP_BASE_URL}/admin`);
