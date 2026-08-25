import { eq, or } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { adminUsers } from "../../../db/auth-schema";
import { verifyPassword, createSession, sessionCookie } from "../../../../auth";

// POST { identifier, password } → username or email; sets HttpOnly session cookie on success.
export async function POST(request: Request, env: any) {
  try {
    const { identifier, email, password } = await request.json() as any;
    const login = String(identifier || email || "").trim().toLowerCase();
    if (!login || !password) return Response.json({ error: "Missing credentials" }, { status: 400 });

    const [user] = await getDb(env.DB).select().from(adminUsers)
      .where(or(eq(adminUsers.email, login), eq(adminUsers.username, login))).limit(1);
    // Always run a verify to reduce timing signal, even if user not found.
    const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "pbkdf2$100000$00$00");
    if (!user || !ok) return Response.json({ error: "Invalid email or password" }, { status: 401 });

    const token = await createSession(user.id, env.AUTH_SECRET);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) } });
  } catch {
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
