const crypto = require('crypto');

function b64(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

module.exports = async function login(req, res) {
  res.setHeader('Cache-Control', 'no-store');

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
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    try { body = JSON.parse(Buffer.from(body).toString('utf8') || '{}'); }
    catch { body = {}; }
  }

  const supplied = String(body.password || '');
  const expected = String(password);
  const a = Buffer.from(supplied, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const payload = b64(JSON.stringify({
    role: 'admin',
    exp: Date.now() + 12 * 60 * 60 * 1000
  }));
  const token = payload + '.' + sign(payload, secret);

  // token is base64url + '.', so it contains only cookie-safe characters.
  // Do not URI-encode it; this also avoids Safari rejecting the Set-Cookie header.
  res.setHeader(
    'Set-Cookie',
    'tdg_admin=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200'
  );

  return res.status(200).json({ authenticated: true });
};
