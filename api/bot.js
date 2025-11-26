const TelegramBot = require('node-telegram-bot-api');

// Get bot token from environment
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN);

// Simple storage for testing
const notes = new Map();

module.exports = async (req, res) => {
  console.log('🔔 Webhook received:', req.method, new Date().toISOString());
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET requests (health check)
  if (req.method === 'GET') {
    return res.json({
      status: 'Bot webhook is running!',
      timestamp: new Date().toISOString(),
      notes_count: notes.size
    });
  }
  
  // Handle POST requests (Telegram updates)
  if (req.method === 'POST') {
    try {
      const update = req.body;
      console.log('📨 Update received:', JSON.stringify(update, null, 2));
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        const userName = update.message.from.first_name || 'User';
        
        console.log(`💬 Message from ${userName}: ${text}`);
        
        // Handle commands
        if (text === '/start' || text === '/start@' + process.env.BOT_USERNAME) {
          await bot.sendMessage(chatId,
            `👋 Hello ${userName}! Welcome to the Note Sharing Bot! 📚\n\n` +
            `I can help you share HTML notes through Telegram Mini Apps.\n\n` +
            `*Available Commands:*\n` +
            `/start - Show this welcome message\n` +
            `/test - Test if bot is working\n` +
            `/help - Get help information\n\n` +
            `Try sending /test to check if everything works!`,
            { parse_mode: 'Markdown' }
          );
          
        } else if (text === '/test') {
          await bot.sendMessage(chatId,
            `✅ *Bot is working perfectly!* 🎉\n\n` +
            `🤖 Bot: @${process.env.BOT_USERNAME}\n` +
            `🌐 Web App: ${process.env.WEBAPP_BASE_URL}\n` +
            `📊 Notes: ${notes.size} stored\n` +
            `🕐 Time: ${new Date().toLocaleTimeString()}`,
            { parse_mode: 'Markdown' }
          );
          
        } else if (text === '/help') {
          await bot.sendMessage(chatId,
            `📖 *Help Guide*\n\n` +
            `This bot allows you to share HTML notes via Telegram Mini Apps.\n\n` +
            `*For Admins:*\n` +
            `- Use the web dashboard to create notes\n` +
            `- Generate shareable Telegram links\n` +
            `- Manage your notes\n\n` +
            `*For Users:*\n` +
            `- Click on shared note links\n` +
            `- View notes in the Mini App\n` +
            `- Enjoy beautiful formatting\n\n` +
            `Web Dashboard: ${process.env.WEBAPP_BASE_URL}/admin`,
            { parse_mode: 'Markdown' }
          );
          
        } else {
          // Handle unknown messages
          await bot.sendMessage(chatId,
            `🤖 I received your message: "${text}"\n\n` +
            `Try these commands:\n` +
            `/start - Welcome message\n` +
            `/test - Check bot status\n` +
            `/help - Get help\n\n` +
            `Or visit the web app: ${process.env.WEBAPP_BASE_URL}`,
            { parse_mode: 'Markdown' }
          );
        }
        
        console.log(`✅ Response sent to ${userName}`);
      }
      
      // Always return 200 to Telegram
      return res.status(200).json({ ok: true });
      
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return res.status(200).json({ ok: false, error: error.message });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
};

console.log('🤖 Bot webhook handler initialized');
