// Share the global storage
const notes = global.notes || new Map();

// Environment variables
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BOT_USERNAME = process.env.BOT_USERNAME;
const WEBAPP_BASE_URL = process.env.WEBAPP_BASE_URL;

// Generate unique ID for notes
function generateNoteId() {
  return 'note_' + Math.random().toString(36).substr(2, 9);
}

// Generate links for a note
function generateNoteLinks(noteId) {
  const telegramDeepLink = `https://t.me/${BOT_USERNAME}/start?startapp=${noteId}`;
  const webAppUrl = `${WEBAPP_BASE_URL}/?note=${noteId}`;
  
  return {
    telegramDeepLink,
    webAppUrl,
    directLink: `${WEBAPP_BASE_URL}/api/note?id=${noteId}`
  };
}

// Verify admin secret
function verifyAdminSecret(secret) {
  return secret === ADMIN_SECRET;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const adminSecret = req.query.admin_secret;
    const action = req.query.action;
    
    // Verify admin secret for all actions except health check
    if (action !== 'health' && !verifyAdminSecret(adminSecret)) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid admin secret' 
      });
    }
    
    if (req.method === 'GET') {
      switch (action) {
        case 'list':
          // List all notes with their links
          const notesArray = Array.from(notes.entries()).map(([id, note]) => ({
            id,
            title: note.title,
            description: note.description,
            html: note.html,
            active: note.active,
            creator: note.creator,
            createdAt: note.createdAt,
            ...generateNoteLinks(id)
          }));
          
          return res.json({ 
            success: true,
            notes: notesArray,
            total: notesArray.length,
            active: notesArray.filter(n => n.active).length
          });
          
        case 'health':
          // Health check endpoint
          return res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            notes_count: notes.size,
            active_notes: Array.from(notes.values()).filter(n => n.active).length
          });
          
        default:
          return res.status(400).json({ 
            error: 'Invalid action',
            available_actions: ['list', 'health']
          });
      }
    }
    
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      switch (action) {
        case 'create':
          // Create a new note
          const { title, description, html } = body;
          
          if (!title || !html) {
            return res.status(400).json({ 
              error: 'Validation failed',
              message: 'Title and HTML content are required'
            });
          }
          
          const noteId = generateNoteId();
          const note = {
            title: title.trim(),
            description: (description || '').trim(),
            html: html,
            active: true,
            creator: 'Admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          notes.set(noteId, note);
          const links = generateNoteLinks(noteId);
          
          console.log(`✅ New note created: ${noteId} - "${title}"`);
          
          return res.json({
            success: true,
            message: 'Note created successfully',
            note: {
              id: noteId,
              title: note.title,
              description: note.description,
              ...links
            },
            links
          });
          
        case 'revoke':
          // Revoke a note (mark as inactive and generate new ID)
          const { noteId: oldNoteId } = body;
          
          if (!notes.has(oldNoteId)) {
            return res.status(404).json({ 
              error: 'Not found',
              message: 'Note not found' 
            });
          }
          
          const oldNote = notes.get(oldNoteId);
          const newNoteId = generateNoteId();
          
          // Create new note with same content
          const newNote = {
            ...oldNote,
            updatedAt: new Date().toISOString()
          };
          
          // Deactivate old note and create new one
          oldNote.active = false;
          notes.set(oldNoteId, oldNote);
          notes.set(newNoteId, newNote);
          
          const newLinks = generateNoteLinks(newNoteId);
          
          console.log(`🔄 Note revoked: ${oldNoteId} -> ${newNoteId}`);
          
          return res.json({
            success: true,
            message: 'Note revoked and new link generated',
            oldNoteId,
            newNoteId,
            links: newLinks
          });
          
        case 'update':
          // Update note content
          const { noteId: updateNoteId, title: newTitle, description: newDescription, html: newHtml } = body;
          
          if (!notes.has(updateNoteId)) {
            return res.status(404).json({ 
              error: 'Not found',
              message: 'Note not found' 
            });
          }
          
          const existingNote = notes.get(updateNoteId);
          existingNote.title = newTitle || existingNote.title;
          existingNote.description = newDescription !== undefined ? newDescription : existingNote.description;
          existingNote.html = newHtml || existingNote.html;
          existingNote.updatedAt = new Date().toISOString();
          
          notes.set(updateNoteId, existingNote);
          
          return res.json({
            success: true,
            message: 'Note updated successfully',
            note: {
              id: updateNoteId,
              title: existingNote.title,
              description: existingNote.description,
              ...generateNoteLinks(updateNoteId)
            }
          });
          
        case 'delete':
          // Delete a note permanently
          const { noteId: deleteNoteId } = body;
          
          if (!notes.has(deleteNoteId)) {
            return res.status(404).json({ 
              error: 'Not found',
              message: 'Note not found' 
            });
          }
          
          notes.delete(deleteNoteId);
          
          console.log(`🗑️ Note deleted: ${deleteNoteId}`);
          
          return res.json({
            success: true,
            message: 'Note deleted permanently'
          });
          
        default:
          return res.status(400).json({ 
            error: 'Invalid action',
            available_actions: ['create', 'revoke', 'update', 'delete']
          });
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
