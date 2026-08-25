import { eq, or } from "drizzle-orm";
import { getDb } from "../../../../db/client";
import { adminUsers } from "../../../../db/auth-schema";
import { readSessionToken, tokenMatches, verifyPassword, verifySession } from "../../../../../auth";

export async function POST(request: Request, env: any) {
  try {
    const { id, token, identifier, email, password } = await request.json() as any;
    if (!id || !token) return Response.json({ error: "Invalid QR request" }, { status: 400 });

    const db = getDb(env.DB);
    const qr: any = await env.DB.prepare(`SELECT id, scan_token_hash AS scanTokenHash, status, expires_at AS expiresAt
      FROM qr_login_sessions WHERE id = ?`).bind(String(id)).first();
    if (!qr || qr.status !== "pending" || qr.expiresAt < Math.floor(Date.now() / 1000)) {
      return Response.json({ error: "This QR code has expired" }, { status: 410 });
    }
    if (!(await tokenMatches(String(token), qr.scanTokenHash))) {
      return Response.json({ error: "Invalid QR code" }, { status: 401 });
    }

    let userId: number | null = null;
    const current = await verifySession(readSessionToken(request), env.AUTH_SECRET);
    if (current) userId = Number(current.uid);

    if (!userId) {
      const login = String(identifier || email || "").trim().toLowerCase();
      if (!login || !password) return Response.json({ error: "Enter your active account details" }, { status: 401 });
      const [user] = await db.select().from(adminUsers)
        .where(or(eq(adminUsers.email, login), eq(adminUsers.username, login))).limit(1);
      const ok = user
        ? await verifyPassword(String(password), user.passwordHash)
        : await verifyPassword(String(password), "pbkdf2$100000$00$00");
      if (!user || !ok) return Response.json({ error: "Invalid email or password" }, { status: 401 });
      userId = user.id;
    }

    const result = await env.DB.prepare(`UPDATE qr_login_sessions SET user_id = ?, status = 'approved', approved_at = ?
      WHERE id = ? AND status = 'pending'`).bind(userId, new Date().toISOString(), qr.id).run();
    if (!result.meta?.changes) return Response.json({ error: "This QR code was already used" }, { status: 409 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to approve login" }, { status: 500 });
  }
}
