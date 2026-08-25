import { NextResponse } from "next/server";
import { verifySession } from "./auth";

/** Protect admin pages and the dashboard API. Adjust matchers to your routes. */
export const config = { matcher: ["/admin/:path*", "/api/dashboard/:path*"] };

export async function middleware(req: any) {
  const token = req.cookies.get("tdg_session")?.value;
  const secret = (globalThis as any).process?.env?.AUTH_SECRET || (req as any).env?.AUTH_SECRET;
  const session = await verifySession(token, secret);
  if (session) return NextResponse.next();

  // API → 401 JSON; pages → redirect to /login
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
