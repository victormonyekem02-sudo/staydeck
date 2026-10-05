import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createBusiness, getBusiness, listBusinesses, slugTaken } from "@/lib/db";
import { RESERVED_SLUGS, SlugSchema, emptyProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  return Response.json({ businesses: await listBusinesses() });
}

const CreateBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: SlugSchema,
  cloneFrom: z.string().uuid().optional(),
});

/** Create a blank business, or clone an existing one's full profile. */
export async function POST(req: Request) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, slug, cloneFrom } = parsed.data;
  if (RESERVED_SLUGS.has(slug)) return Response.json({ error: "That web address is reserved." }, { status: 400 });
  if (await slugTaken(slug)) return Response.json({ error: "That web address is already used." }, { status: 409 });

  let profile = emptyProfile(name);
  if (cloneFrom) {
    const source = await getBusiness(cloneFrom);
    if (!source) return Response.json({ error: "Business to clone not found." }, { status: 404 });
    // Keep structure, rooms, policies and FAQs; clear anything that
    // identifies the original business.
    profile = {
      ...structuredClone(source.profile),
      name,
      whatsapp: "",
      phone: "",
      email: "",
      ownerEmail: "",
      address: "",
      mapUrl: "",
      bookingUrl: "",
      heroImageUrl: "",
    };
  }

  const business = await createBusiness(slug, profile);
  return Response.json({ business }, { status: 201 });
}
