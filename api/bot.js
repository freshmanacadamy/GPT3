const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN);

// Simple storage
const notes = new Map();

module.exports = async (req, res) => {
  console.log('Received request:', req.method, req.url);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.json({ 
      status: 'Bot is running!',
      notes: Array.from(notes.keys())
    });
  }
  
  if (req.method === 'POST') {
    try {
      const update = req.body;
      console.log('Update:', update);
      
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        
        if (text === '/start') {
          await bot.sendMessage(chatId, '🤖 Bot is working! Use /test to check.');
        } else if (text === '/test') {
          await bot.sendMessage(chatId, '✅ Bot is responding correctly!');
        } else {
          await bot.sendMessage(chatId, 'Send /start to begin');
        }
      }
      
      return res.json({ ok: true });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
