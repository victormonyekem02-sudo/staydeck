import { z } from "zod";
import { passwordMatches, sameOrigin, startSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return Response.json({ error: "Bad origin" }, { status: 403 });

  const rl = rateLimit(`login:${clientIp(req)}`, 5, 15 * 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} min.` },
      { status: 429 }
    );
  }

  const body = z.object({ password: z.string().max(200) }).safeParse(await req.json().catch(() => null));
  if (!body.success || !passwordMatches(body.data.password)) {
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  await startSession();
  return Response.json({ ok: true });
}
