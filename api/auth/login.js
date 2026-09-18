const crypto = require('crypto');

function b64(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

module.exports = async function login(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    return res.status(503).json({ error: 'Admin authentication is not configured' });
  }

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
  const token = payload + '.' + sign(payload, secret);

  // URI encoding makes the cookie robust across Safari/Vercel response handling.
  const cookie = 'tdg_admin=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200';
  res.setHeader('Set-Cookie', cookie);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ authenticated: true });
};
