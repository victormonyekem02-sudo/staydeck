import { endSession, sameOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return Response.json({ error: "Bad origin" }, { status: 403 });
  await endSession();
  return Response.json({ ok: true });
}
