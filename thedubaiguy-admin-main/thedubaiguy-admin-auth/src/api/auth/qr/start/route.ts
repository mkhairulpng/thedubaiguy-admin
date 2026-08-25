import { hashToken, randomToken } from "../../../../../auth";

const QR_TTL_SECONDS = 90;

function safeNext(value: unknown) {
  const next = typeof value === "string" ? value : "/admin";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

export async function POST(request: Request, env: any) {
  const body = await request.json().catch(() => ({})) as any;
  const id = crypto.randomUUID();
  const scanToken = randomToken();
  const pollToken = randomToken();
  const expiresAt = Math.floor(Date.now() / 1000) + QR_TTL_SECONDS;
  const nextPath = safeNext(body.next);

  await env.DB.prepare(`INSERT INTO qr_login_sessions
    (id, scan_token_hash, poll_token_hash, status, next_path, expires_at, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)`)
    .bind(id, await hashToken(scanToken), await hashToken(pollToken), nextPath, expiresAt, new Date().toISOString()).run();

  const origin = new URL(request.url).origin;
  const approveUrl = `${origin}/qr-login?id=${encodeURIComponent(id)}&token=${encodeURIComponent(scanToken)}`;
  return Response.json({ id, pollToken, approveUrl, expiresAt }, { headers: { "Cache-Control": "no-store" } });
}
