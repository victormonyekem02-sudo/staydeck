import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { deleteLead, setLeadStatus } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const body = z.object({ status: z.enum(LEAD_STATUSES) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid status" }, { status: 400 });
  await setLeadStatus((await params).id, body.data.status);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  await deleteLead((await params).id);
  return Response.json({ ok: true });
}
