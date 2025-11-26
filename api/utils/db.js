// Simple in-memory 'database' for demo use only.
// NOTE: On real production, replace this with Vercel Postgres, KV, or another database.

const globalAny = global;

if (!globalAny.__NOTES_DB__) {
  globalAny.__NOTES_DB__ = {};
}

const notes = globalAny.__NOTES_DB__;

/**
 * Create a new note entry.
 * @param {string} html - Raw HTML content.
 * @param {string} title
 * @param {string} description
 * @returns {{id: string, title: string, description: string, active: boolean}}
 */
function createNote(html, title, description) {
  const id = generateId();
  const now = new Date().toISOString();

  notes[id] = {
    id,
    html,
    title,
    description,
    active: true,
    createdAt: now,
    updatedAt: now
  };

  return notes[id];
}

/**
 * Get a single note by id.
 */
function getNote(id) {
  return notes[id] || null;
}

/**
 * List all notes (including revoked).
 */
function listNotes() {
  return Object.values(notes).sort((a, b) => {
    if (a.createdAt < b.createdAt) return 1;
    if (a.createdAt > b.createdAt) return -1;
    return 0;
  });
}

/**
 * Revoke a note id and create a new id pointing to the same HTML.
 * Old id becomes inactive; new id is active.
 */
function revokeAndRegenerate(id) {
  const old = notes[id];
  if (!old) return null;

  old.active = false;
  old.updatedAt = new Date().toISOString();

  const now = new Date().toISOString();
  const newId = generateId();

  const fresh = {
    ...old,
    id: newId,
    active: true,
    createdAt: now,
    updatedAt: now
  };

  notes[newId] = fresh;

  return { old, fresh };
}

/**
 * Internal id generator.
 */
function generateId() {
  return 'note_' + Math.random().toString(36).slice(2, 10);
}

module.exports = {
  createNote,
  getNote,
  listNotes,
  revokeAndRegenerate
};
