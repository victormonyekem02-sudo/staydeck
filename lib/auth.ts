import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "crypto";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

/* Defence in depth: proxy.ts blocks unauthenticated admin traffic, and
 * every admin page and API route checks again here. */

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Use at the top of admin server components. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Use at the top of admin API routes. Returns an error Response or null. */
export async function requireAdminApi(req: Request): Promise<Response | null> {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (req.method !== "GET" && !(await sameOrigin(req))) {
    return Response.json({ error: "Bad origin" }, { status: 403 });
  }
  return null;
}

/** CSRF guard for state-changing requests. */
export async function sameOrigin(req: Request): Promise<boolean> {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function startSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
