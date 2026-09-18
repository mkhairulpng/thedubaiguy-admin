const crypto = require('crypto');

function b64(value) { return Buffer.from(value).toString('base64url'); }
function sign(payload, password) {
  return crypto.createHmac('sha256', password).update(payload).digest('base64url');
}

module.exports = async function login(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple admin authentication: only ADMIN_PASSWORD is required.
  // The same password is used to sign the short-lived HttpOnly session cookie,
  // so there is no second ADMIN_SESSION_SECRET to configure in Vercel.
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return res.status(503).json({ error: 'Admin password is not configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const supplied = String(body.password || '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(String(password));
  const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!matches) return res.status(401).json({ error: 'Incorrect password' });

  const payload = b64(JSON.stringify({ role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 }));
  const token = payload + '.' + sign(payload, String(password));
  const cookie = 'tdg_admin=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200';
  res.setHeader('Set-Cookie', cookie);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ authenticated: true });
};
