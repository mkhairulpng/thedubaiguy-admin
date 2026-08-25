import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { adminUsers } from "../../../db/auth-schema";
import { verifySession, readSessionToken } from "../../../../auth";

// GET → { user } if logged in, else 401
export async function GET(request: Request, env: any) {
  const s = await verifySession(readSessionToken(request), env.AUTH_SECRET);
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [user] = await getDb(env.DB).select().from(adminUsers).where(eq(adminUsers.id, Number(s.uid))).limit(1);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user: { id: user.id, username: user.username, email: user.email, name: user.name } });
}
