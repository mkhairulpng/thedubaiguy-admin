/**
 * TheDubaiGuy admin auth — core helpers (no secrets in code).
 * - Passwords hashed with PBKDF2-SHA256 (Web Crypto; works on Cloudflare Workers/Edge).
 * - Sessions are HMAC-signed tokens stored in an HttpOnly, Secure cookie.
 * Env required:  AUTH_SECRET  (a long random string; set as an encrypted Worker secret)
 */

const enc = new TextEncoder();
const COOKIE = "tdg_session";
const SESSION_TTL = 60 * 60 * 8; // 8 hours

/* ---------- password hashing ---------- */
function toHex(b: Uint8Array) { return [...b].map(x => x.toString(16).padStart(2, "0")).join(""); }
function fromHex(h: string) { const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = new Uint8Array(salt).buffer;
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

/** Create a storable hash: `pbkdf2$<iter>$<saltHex>$<hashHex>` */
export async function hashPassword(password: string, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterStr, saltHex, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const got = await pbkdf2(password, fromHex(saltHex), Number(iterStr));
  const want = fromHex(hashHex);
  if (got.length !== want.length) return false;
  let diff = 0; for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0; // constant-time-ish compare
}

/* ---------- session tokens ---------- */
function b64url(bytes: Uint8Array) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const bin = atob(s + "=".repeat(pad)); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a;
}
async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

export async function createSession(userId: number | string, secret: string, ttl = SESSION_TTL) {
  const payload = b64url(enc.encode(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + ttl })));
  const sig = b64url(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<{ uid: string | number } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(await hmac(secret, payload));
  if (expected.length !== sig.length) return null;
  let diff = 0; for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: data.uid };
  } catch { return null; }
}

/* ---------- cookie helpers ---------- */
export function sessionCookie(token: string, ttl = SESSION_TTL) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ttl}`;
}
export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
export function readSessionToken(request: Request) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  return m ? m[1] : undefined;
}

/** Guard for admin API routes. Returns the session or throws a 401 Response. */
export async function requireAuth(request: Request, env: any) {
  const s = await verifySession(readSessionToken(request), env.AUTH_SECRET);
  if (!s) throw new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  return s;
}

export const AUTH = { COOKIE, SESSION_TTL };

export function randomToken(byteLength = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return toHex(new Uint8Array(digest));
}

export async function tokenMatches(token: string, expectedHash: string) {
  const actual = await hashToken(token);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}
