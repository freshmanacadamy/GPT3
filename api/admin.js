// Admin API
// - GET /api/admin?action=list
// - POST /api/admin?action=create
// - POST /api/admin?action=revoke

const { isAdmin } = require("./utils/verifyAdmin");
const { createNote, listNotes, revokeAndRegenerate } = require("./utils/db");
const { generateLinks } = require("./utils/generateLink");

module.exports = async (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const action = req.query.action || "list";

  if (req.method === "GET" && action === "list") {
    const notes = listNotes().map(n => {
      const links = generateLinks(n.id);
      return {
        id: n.id,
        title: n.title,
        description: n.description,
        active: n.active,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        telegramDeepLink: links.telegramDeepLink,
        webAppUrl: links.webAppUrl
      };
    });

    res.status(200).json({ notes });
    return;
  }

  if (req.method === "POST" && action === "create") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    const { html, title, description } = body;

    if (!html || !title) {
      res.status(400).json({ error: "Missing html or title" });
      return;
    }

    const note = createNote(html, title, description || "");
    const links = generateLinks(note.id);

    res.status(201).json({
      note,
      links
    });
    return;
  }

  if (req.method === "POST" && action === "revoke") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    const { noteId } = body;
    if (!noteId) {
      res.status(400).json({ error: "Missing noteId" });
      return;
    }

    const result = revokeAndRegenerate(noteId);
    if (!result) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const links = generateLinks(result.fresh.id);

    res.status(200).json({
      old: result.old,
      fresh: result.fresh,
      links
    });
    return;
  }

  res.status(405).json({ error: "Method not allowed or bad action" });
};
