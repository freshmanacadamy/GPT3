// Very simple admin auth using a shared secret.
// Set ADMIN_SECRET in Vercel env vars and pass it as ?admin_secret=... or header.

function isAdmin(req) {
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret) return false;

  const fromQuery = (req.query && req.query.admin_secret) || "";
  const fromHeader = (req.headers && req.headers["x-admin-secret"]) || "";

  return fromQuery === secret || fromHeader === secret;
}

module.exports = { isAdmin };
