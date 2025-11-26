// GET /api/note?id=<noteId>
// Returns raw HTML for a note if active.

const { getNote } = require("./utils/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const note = getNote(id);

  if (!note || !note.active) {
    res.status(410).send("This link has been revoked or does not exist.");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(note.html || "");
};
