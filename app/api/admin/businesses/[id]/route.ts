import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { deleteBusiness, getBusiness, slugTaken, updateBusiness } from "@/lib/db";
import { ProfileSchema, RESERVED_SLUGS, SlugSchema } from "@/lib/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const business = await getBusiness((await params).id);
  return business ? Response.json({ business }) : Response.json({ error: "Not found" }, { status: 404 });
}

const PutBody = z.object({
  slug: SlugSchema.optional(),
  active: z.boolean().optional(),
  profile: ProfileSchema.optional(),
});

export async function PUT(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  const { id } = await params;

  const parsed = PutBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.filter((p) => typeof p !== "number").slice(-1)[0];
    return Response.json(
      { error: `${where ? `${String(where)}: ` : ""}${issue?.message ?? "Invalid input"}`, path: issue?.path },
      { status: 400 }
    );
  }
  const { slug } = parsed.data;
  if (slug) {
    if (RESERVED_SLUGS.has(slug)) return Response.json({ error: "That web address is reserved." }, { status: 400 });
    if (await slugTaken(slug, id)) return Response.json({ error: "That web address is already used." }, { status: 409 });
  }

  const business = await updateBusiness(id, parsed.data);
  return business ? Response.json({ business }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  await deleteBusiness((await params).id);
  return Response.json({ ok: true });
}
