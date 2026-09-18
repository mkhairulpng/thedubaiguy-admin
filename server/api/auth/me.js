const crypto = require('crypto');

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function getCookie(req, name) {
  const header = String((req.headers && req.headers.cookie) || '');
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1));
  }
  return '';
}

module.exports = async function me(req, res) {
  const secret = process.env.ADMIN_PASSWORD;
  const token = getCookie(req, 'tdg_admin');
  if (!secret || !token) return res.status(200).json({ authenticated: false });

  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature || sign(payload, secret) !== signature) {
      return res.status(200).json({ authenticated: false });
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return res.status(200).json({ authenticated: data.role === 'admin' && data.exp > Date.now() });
  } catch {
    return res.status(200).json({ authenticated: false });
  }
};
