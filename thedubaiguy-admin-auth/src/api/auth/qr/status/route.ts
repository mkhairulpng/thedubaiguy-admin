import { createSession, sessionCookie, tokenMatches } from "../../../../../auth";

export async function POST(request: Request, env: any) {
  try {
    const { id, pollToken } = await request.json() as any;
    if (!id || !pollToken) return Response.json({ error: "Invalid request" }, { status: 400 });
    const qr: any = await env.DB.prepare(`SELECT id, poll_token_hash AS pollTokenHash, user_id AS userId,
      status, next_path AS nextPath, expires_at AS expiresAt FROM qr_login_sessions WHERE id = ?`)
      .bind(String(id)).first();
    if (!qr || !(await tokenMatches(String(pollToken), qr.pollTokenHash))) {
      return Response.json({ error: "Invalid request" }, { status: 401 });
    }
    if (qr.expiresAt < Math.floor(Date.now() / 1000)) {
      return Response.json({ status: "expired" }, { status: 410, headers: { "Cache-Control": "no-store" } });
    }
    if (qr.status === "pending") {
      return Response.json({ status: "pending", expiresAt: qr.expiresAt }, { headers: { "Cache-Control": "no-store" } });
    }
    if (qr.status !== "approved" || !qr.userId) {
      return Response.json({ status: "used" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const changed = await env.DB.prepare(`UPDATE qr_login_sessions SET status = 'claimed', claimed_at = ?
      WHERE id = ? AND status = 'approved'`).bind(new Date().toISOString(), qr.id).run();
    if (!changed.meta?.changes) {
      return Response.json({ status: "used" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const session = await createSession(qr.userId, env.AUTH_SECRET);
    return new Response(JSON.stringify({ status: "approved", next: qr.nextPath }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": sessionCookie(session) },
    });
  } catch {
    return Response.json({ error: "Unable to check login" }, { status: 500 });
  }
}
