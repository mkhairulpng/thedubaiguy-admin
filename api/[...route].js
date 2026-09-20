const fs = require('fs');
const path = require('path');

module.exports.config = { api: { bodyParser: false } };

function routeParts(req) {
  let r = req.query && req.query.route;
  if (Array.isArray(r)) return r.map(String).filter(Boolean);
  if (typeof r === 'string' && r) return r.split('/').filter(Boolean);
  const pathname = String(req.url || '').split('?')[0];
  return pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function prepareBody(req, rawNeeded) {
  if (req.body !== undefined) return;
  const raw = await readRaw(req);
  req.rawBody = raw;
  if (rawNeeded) return;
  const text = raw.toString('utf8').trim();
  if (!text) { req.body = {}; return; }
  try { req.body = JSON.parse(text); }
  catch { req.body = {}; }
}

function load(name) {
  return require(path.join(process.cwd(), 'server', 'api', name));
}

module.exports = async function handler(req, res) {
  const parts = routeParts(req);
  const key = parts.join('/');
  const rawNeeded = key === 'stripe/webhook';
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      await prepareBody(req, rawNeeded);
    }
    let fn;
    switch (key) {
      case 'health': fn = load('health.js'); break;
      case 'dashboard': fn = load('dashboard.js'); break;
      case 'products': fn = load('products.js'); break;
      case 'orders': fn = load('orders.js'); break;
      case 'customers': fn = load('customers.js'); break;
      case 'aura': fn = load('aura.js'); break;
      case 'sync': fn = load('sync.js'); break;
      case 'analytics': fn = load('analytics.js'); break;
      case 'live': fn = load('live.js'); break;
      case 'pos': fn = load('pos.js'); break;
      case 'auth/login': fn = load('auth/login.js'); break;
      case 'auth/logout': fn = load('auth/logout.js'); break;
      case 'auth/me': fn = load('auth/me.js'); break;
      case 'data/config': fn = load('data/config.js'); break;
      case 'lalamove/order': fn = load('lalamove/order.js'); break;
      case 'lalamove/quote': fn = load('lalamove/quote.js'); break;
      case 'lalamove/status': fn = load('lalamove/status.js'); break;
      case 'lalamove/webhook': fn = load('lalamove/webhook.js'); break;
      case 'stripe/webhook': fn = load('stripe/webhook.js'); break;
      default:
        if (parts[0] === 'stripe') {
          req.query = Object.assign({}, req.query, { route: parts.slice(1).join('/') });
          fn = load('stripe/[...route].js');
        }
    }
    if (!fn) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Unknown API route', route: key }));
    }
    return await fn(req, res);
  } catch (e) {
    res.statusCode = e.statusCode || 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: e.message || 'Internal server error' }));
  }
};
