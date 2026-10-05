import { z } from "zod";
import { runReceptionist } from "@/lib/ai";
import { createLead, getBusinessBySlug, getConversation, saveConversation } from "@/lib/db";
import { notifyOwner } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(1000),
});

const MAX_TURNS = 30;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip = clientIp(req);
  const rl = rateLimit(`chat:${ip}`, 15, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: "You're sending messages quickly. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid message." }, { status: 400 });

  const business = await getBusinessBySlug(slug);
  if (!business || !business.active) return Response.json({ error: "Not found." }, { status: 404 });

  // History comes from the database, never from the browser, so guests
  // can't forge earlier assistant turns.
  let history: ChatMessage[] = [];
  let conversationId = parsed.data.conversationId ?? undefined;
  if (conversationId) {
    const existing = await getConversation(conversationId, business.id);
    if (existing) history = existing.messages;
    else conversationId = undefined;
  }

  if (history.filter((m) => m.role === "user").length >= MAX_TURNS) {
    return Response.json({
      conversationId,
      reply: "We've chatted a lot! Please contact the team directly so they can help you further.",
      done: true,
    });
  }

  history = [...history, { role: "user", content: parsed.data.message }];

  // Reserve the conversation id up front so a captured lead can link to it.
  if (!conversationId) {
    conversationId = await saveConversation({
      businessId: business.id, messages: history, leadCaptured: false, addInputTokens: 0, addOutputTokens: 0,
    });
  }
  const convId = conversationId;

  try {
    const result = await runReceptionist(business, history, async (inq) => {
      const lead = await createLead({
        businessId: business.id,
        conversationId: convId,
        guestName: inq.guestName,
        contact: inq.contact,
        checkIn: inq.checkIn,
        checkOut: inq.checkOut,
        guests: inq.guests ?? null,
        roomPreference: inq.roomPreference,
        notes: inq.notes,
      });
      await notifyOwner(business, lead);
    });

    history = [...history, { role: "assistant", content: result.reply }];
    await saveConversation({
      id: convId,
      businessId: business.id,
      messages: history,
      leadCaptured: !!result.inquiry,
      addInputTokens: result.inputTokens,
      addOutputTokens: result.outputTokens,
    });

    return Response.json({ conversationId: convId, reply: result.reply, leadCaptured: !!result.inquiry });
  } catch (err) {
    console.error("[staydesk] chat error:", err);
    const p = business.profile;
    const fallback = p.whatsapp
      ? `Sorry, I'm having trouble right now. Please message us on WhatsApp: +${p.whatsapp}.`
      : "Sorry, I'm having trouble right now. Please contact the team directly.";
    return Response.json({ conversationId: convId, reply: fallback, error: true }, { status: 200 });
  }
}
