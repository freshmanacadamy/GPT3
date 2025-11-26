module.exports = async (req, res) => {
  const path = req.url;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Route requests
  if (path === '/api/bot' && req.method === 'POST') {
    // Handle bot webhook
    return res.json({ ok: true, message: 'Bot webhook received' });
  }
  
  if (path.startsWith('/api/note')) {
    // Handle note requests
    return res.json({ ok: true, message: 'Note API' });
  }
  
  if (path.startsWith('/api/admin')) {
    // Handle admin requests
    return res.json({ ok: true, message: 'Admin API' });
  }
  
  // Default response
  return res.json({ 
    status: 'API is running',
    timestamp: new Date().toISOString(),
    path: path
  });
};
