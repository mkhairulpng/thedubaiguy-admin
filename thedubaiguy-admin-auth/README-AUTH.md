# TheDubaiGuy — Admin authentication

Secure, secrets-free auth for the dashboard (Cloudflare Workers / Next.js / D1 / Drizzle).
Passwords are PBKDF2-hashed; sessions are HMAC-signed HttpOnly cookies. **No passwords or
secrets are in this code** — you create the admin user and set `AUTH_SECRET` yourself.

## Files
- `auth.ts`                       core: hashPassword / verifyPassword / createSession / verifySession / requireAuth
- `middleware.ts`                 protects `/admin/*` and `/api/dashboard/*` (redirects to /login or 401)
- `src/app/login/page.tsx`        login page
- `src/components/LoginForm.tsx`  login form (posts to /api/auth/login)
- `src/components/LogoutButton.tsx`
- `src/api/auth/login/route.ts`   POST username/email + password → sets session cookie
- `src/api/auth/logout/route.ts`  POST → clears cookie
- `src/api/auth/me/route.ts`      GET  → current admin (or 401)
- `src/api/auth/qr/start/route.ts` creates a 90-second desktop QR request
- `src/api/auth/qr/approve/route.ts` verifies the active account on the scanned iPhone
- `src/api/auth/qr/status/route.ts` gives the approved desktop its one-time session
- `src/app/qr-login/page.tsx`      mobile approval page opened by the QR
- `src/db/auth-schema.ts`         `admin_users` table (username/email + password HASH only)
- `migrations/0002_qr_login_sessions.sql` D1 migration required by QR login
- `scripts/hash-password.mjs`     make a password hash locally

## Setup
1. Merge these files into your admin repo (paths already match your structure).
2. Add the `admin_users` and `qr_login_sessions` tables to your migrations (Drizzle) and push to D1.
3. Set a secret:  `wrangler secret put AUTH_SECRET`  (use `openssl rand -hex 32`).
4. Create your admin login (password is hashed, never stored plain):
   ```bash
   node scripts/hash-password.mjs "YourStrongPassword"
   # → pbkdf2$100000$....  copy this
   # then insert the row (username, email and hash) into D1:
   wrangler d1 execute thedubaiguy --command \
     "INSERT INTO admin_users (username, email, password_hash, name, created_at) VALUES ('khail_tdg','you@thedubaiguy.com','pbkdf2$100000$...','Khail', datetime('now'));"
   ```
5. Protect admin API handlers by calling `requireAuth(request, env)` at the top (it throws a 401 Response if not logged in). Middleware also guards the routes in `config.matcher`.

## Desktop QR login
- Open `/login` on the desktop and select **QR CODE**.
- The QR expires after 90 seconds and contains a single-use approval URL, never a password.
- Scan it with the iPhone camera. Enter the same active-account username/email and password to approve the desktop.
- The desktop polls with a separate secret. After approval it receives its own HttpOnly session cookie and the QR request becomes unusable.
- Apply rate limiting to `/api/auth/qr/start` and `/api/auth/qr/approve` in Cloudflare before production deployment.

## Security notes
- Cookies are `HttpOnly; Secure; SameSite=Lax` — not readable by JS, sent only over HTTPS.
- Never store plaintext passwords; only the `pbkdf2$…` hash goes in the DB.
- Rotate `AUTH_SECRET` to invalidate all sessions. Add rate-limiting on `/api/auth/login` for production.
