function json(res, status, body, extraHeaders = {}) {
  const origin = process.env.STOREFRONT_ORIGIN || "https://www.thedubaiguy.shop";
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Stripe-Signature");
  Object.entries(extraHeaders).forEach(([k,v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}
function method(req) { return String(req.method || "GET").toUpperCase(); }
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
function cors(req, res) {
  const origin = req.headers?.origin || "";
  const allowed = process.env.STOREFRONT_ORIGIN || "https://www.thedubaiguy.shop";
  if (!origin || origin === allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Stripe-Signature");
}
module.exports = { json, method, requireEnv, cors };
