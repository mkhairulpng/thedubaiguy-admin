const crypto = require('crypto');

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function getCookie(req) {
  const header = String((req.headers && req.headers.cookie) || '');
  const match = header.match(/(?:^|;\s*)tdg_admin=([^;]+)/);
  return match ? match[1] : '';
}

function isAdmin(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const token = getCookie(req);
  if (!secret || !token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    const expected = sign(payload, secret);
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.role === 'admin' && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

module.exports = async function me(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({ authenticated: isAdmin(req) });
};
