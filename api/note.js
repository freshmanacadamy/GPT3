// Share the global storage
const notes = global.notes || new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    try {
      const noteId = req.query.id;
      
      if (!noteId) {
        return res.status(400).send(`
          <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
              <div style="max-width: 500px; margin: 50px auto; padding: 20px; background: white; border-radius: 10px; text-align: center;">
                <h2 style="color: #e74c3c;">❌ Missing Note ID</h2>
                <p>Please provide a note ID to view the content.</p>
                <p><small>Example: /api/note?id=note_abc123</small></p>
              </div>
            </body>
          </html>
        `);
      }
      
      const note = notes.get(noteId);
      
      if (!note) {
        return res.status(404).send(`
          <html>
            <head><title>Note Not Found</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
              <div style="max-width: 500px; margin: 50px auto; padding: 20px; background: white; border-radius: 10px; text-align: center;">
                <h2 style="color: #e74c3c;">❌ Note Not Found</h2>
                <p>The requested note does not exist or has been removed.</p>
                <p><small>Note ID: ${noteId}</small></p>
              </div>
            </body>
          </html>
        `);
      }
      
      if (!note.active) {
        return res.status(410).send(`
          <html>
            <head><title>Note Unavailable</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
              <div style="max-width: 500px; margin: 50px auto; padding: 20px; background: white; border-radius: 10px; text-align: center;">
                <h2 style="color: #f39c12;">⚠️ Note Unavailable</h2>
                <p>This note is no longer available. The link may have been revoked.</p>
                <p><small>Note ID: ${noteId}</small></p>
              </div>
            </body>
          </html>
        `);
      }
      
      // Return the HTML content
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache');
      
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${note.title}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
              }
              .note-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                overflow: hidden;
              }
              .note-header {
                background: linear-gradient(135deg, #2c3e50, #34495e);
                color: white;
                padding: 20px;
                text-align: center;
              }
              .note-title {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
              }
              .note-description {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
              }
              .note-content {
                padding: 30px;
                background: white;
              }
              .note-meta {
                background: #f8f9fa;
                padding: 15px 30px;
                border-top: 1px solid #e9ecef;
                font-size: 14px;
                color: #6c757d;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              @media (max-width: 600px) {
                body { padding: 10px; }
                .note-content { padding: 20px; }
                .note-meta { flex-direction: column; align-items: flex-start; gap: 5px; }
              }
            </style>
          </head>
          <body>
            <div class="note-container">
              <div class="note-header">
                <h1 class="note-title">${note.title}</h1>
                ${note.description ? `<p class="note-description">${note.description}</p>` : ''}
              </div>
              <div class="note-content">
                ${note.html}
              </div>
              <div class="note-meta">
                <span>📅 Created: ${new Date(note.createdAt).toLocaleDateString()}</span>
                <span>👤 By: ${note.creator || 'Admin'}</span>
              </div>
            </div>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Note retrieval error:', error);
      return res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 500px; margin: 50px auto; padding: 20px; background: white; border-radius: 10px; text-align: center;">
              <h2 style="color: #e74c3c;">❌ Server Error</h2>
              <p>An error occurred while loading the note. Please try again later.</p>
            </div>
          </body>
        </html>
      `);
    }
  }
  
  return res.status(405).send('Method not allowed');
};
