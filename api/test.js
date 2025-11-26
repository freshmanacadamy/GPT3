module.exports = async (req, res) => {
  return res.json({ 
    message: '✅ API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url
  });
};
