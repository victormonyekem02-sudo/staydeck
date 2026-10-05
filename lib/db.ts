import "server-only";
import { createClient, type Client, type InValue } from "@libsql/client";
import { randomUUID } from "crypto";
import {
  ProfileSchema,
  type Business,
  type ChatMessage,
  type Conversation,
  type Lead,
  type LeadStatus,
  type Profile,
} from "./types";
import { seedProfile } from "./seed";

/* ─────────────────────────────────────────────────────────────────────
 * Storage. libSQL = SQLite locally (a file) and Turso in production,
 * same code either way. Unlike the old JSON-file approach, data survives
 * serverless redeploys once DATABASE_URL points at Turso.
 * ──────────────────────────────────────────────────────────────────── */

const globalForDb = globalThis as unknown as { __staydeskDb?: Client; __staydeskInit?: Promise<void> };

function client(): Client {
  if (!globalForDb.__staydeskDb) {
    globalForDb.__staydeskDb = createClient({
      url: process.env.DATABASE_URL || "file:staydesk.db",
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });
  }
  return globalForDb.__staydeskDb;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS businesses (
     id TEXT PRIMARY KEY,
     slug TEXT NOT NULL UNIQUE,
     active INTEGER NOT NULL DEFAULT 1,
     profile TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS conversations (
     id TEXT PRIMARY KEY,
     business_id TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     messages TEXT NOT NULL DEFAULT '[]',
     lead_captured INTEGER NOT NULL DEFAULT 0,
     input_tokens INTEGER NOT NULL DEFAULT 0,
     output_tokens INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS idx_conv_business ON conversations(business_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS leads (
     id TEXT PRIMARY KEY,
     business_id TEXT NOT NULL,
     conversation_id TEXT,
     created_at TEXT NOT NULL,
     guest_name TEXT NOT NULL DEFAULT '',
     contact TEXT NOT NULL DEFAULT '',
     check_in TEXT NOT NULL DEFAULT '',
     check_out TEXT NOT NULL DEFAULT '',
     guests INTEGER,
     room_preference TEXT NOT NULL DEFAULT '',
     notes TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'new'
   )`,
  `CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id, created_at)`,
];

async function db(): Promise<Client> {
  const c = client();
  if (!globalForDb.__staydeskInit) {
    globalForDb.__staydeskInit = (async () => {
      await c.batch(SCHEMA, "write");
      const { rows } = await c.execute("SELECT COUNT(*) AS n FROM businesses");
      if (Number(rows[0].n) === 0) {
        const now = new Date().toISOString();
        await c.execute({
          sql: "INSERT INTO businesses (id, slug, active, profile, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)",
          args: [randomUUID(), "stone-guest-house", JSON.stringify(seedProfile), now, now],
        });
      }
    })().catch((err) => {
      globalForDb.__staydeskInit = undefined; // retry on next call
      throw err;
    });
  }
  await globalForDb.__staydeskInit;
  return c;
}

const now = () => new Date().toISOString();
type Row = Record<string, unknown>;

/* ── Businesses ─────────────────────────────────────────────────────── */

function toBusiness(r: Row): Business {
  // Parse defensively so older rows pick up new default fields.
  const parsed = ProfileSchema.safeParse(JSON.parse(String(r.profile)));
  return {
    id: String(r.id),
    slug: String(r.slug),
    active: Number(r.active) === 1,
    profile: parsed.success ? parsed.data : ProfileSchema.parse({ name: "Untitled" }),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listBusinesses(): Promise<Business[]> {
  const c = await db();
  const { rows } = await c.execute("SELECT * FROM businesses ORDER BY created_at ASC");
  return rows.map((r) => toBusiness(r as Row));
}

export async function getBusiness(id: string): Promise<Business | null> {
  const c = await db();
  const { rows } = await c.execute({ sql: "SELECT * FROM businesses WHERE id = ?", args: [id] });
  return rows[0] ? toBusiness(rows[0] as Row) : null;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const c = await db();
  const { rows } = await c.execute({ sql: "SELECT * FROM businesses WHERE slug = ?", args: [slug] });
  return rows[0] ? toBusiness(rows[0] as Row) : null;
}

export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const c = await db();
  const { rows } = await c.execute({
    sql: "SELECT id FROM businesses WHERE slug = ? AND id != ?",
    args: [slug, exceptId ?? ""],
  });
  return rows.length > 0;
}

export async function createBusiness(slug: string, profile: Profile): Promise<Business> {
  const c = await db();
  const id = randomUUID();
  const t = now();
  await c.execute({
    sql: "INSERT INTO businesses (id, slug, active, profile, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)",
    args: [id, slug, JSON.stringify(profile), t, t],
  });
  return (await getBusiness(id))!;
}

export async function updateBusiness(
  id: string,
  patch: { slug?: string; active?: boolean; profile?: Profile }
): Promise<Business | null> {
  const existing = await getBusiness(id);
  if (!existing) return null;
  const c = await db();
  await c.execute({
    sql: "UPDATE businesses SET slug = ?, active = ?, profile = ?, updated_at = ? WHERE id = ?",
    args: [
      patch.slug ?? existing.slug,
      (patch.active ?? existing.active) ? 1 : 0,
      JSON.stringify(patch.profile ?? existing.profile),
      now(),
      id,
    ],
  });
  return getBusiness(id);
}

export async function deleteBusiness(id: string): Promise<void> {
  const c = await db();
  await c.batch(
    [
      { sql: "DELETE FROM leads WHERE business_id = ?", args: [id] },
      { sql: "DELETE FROM conversations WHERE business_id = ?", args: [id] },
      { sql: "DELETE FROM businesses WHERE id = ?", args: [id] },
    ],
    "write"
  );
}

/* ── Conversations ──────────────────────────────────────────────────── */

function toConversation(r: Row): Conversation {
  return {
    id: String(r.id),
    businessId: String(r.business_id),
    businessName: r.business_name ? String(r.business_name) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    messages: JSON.parse(String(r.messages)) as ChatMessage[],
    leadCaptured: Number(r.lead_captured) === 1,
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
  };
}

export async function getConversation(id: string, businessId: string): Promise<Conversation | null> {
  const c = await db();
  const { rows } = await c.execute({
    sql: "SELECT * FROM conversations WHERE id = ? AND business_id = ?",
    args: [id, businessId],
  });
  return rows[0] ? toConversation(rows[0] as Row) : null;
}

export async function saveConversation(conv: {
  id?: string;
  businessId: string;
  messages: ChatMessage[];
  leadCaptured: boolean;
  addInputTokens: number;
  addOutputTokens: number;
}): Promise<string> {
  const c = await db();
  const t = now();
  if (conv.id) {
    await c.execute({
      sql: `UPDATE conversations
            SET messages = ?, lead_captured = MAX(lead_captured, ?), updated_at = ?,
                input_tokens = input_tokens + ?, output_tokens = output_tokens + ?
            WHERE id = ? AND business_id = ?`,
      args: [
        JSON.stringify(conv.messages), conv.leadCaptured ? 1 : 0, t,
        conv.addInputTokens, conv.addOutputTokens, conv.id, conv.businessId,
      ],
    });
    return conv.id;
  }
  const id = randomUUID();
  await c.execute({
    sql: `INSERT INTO conversations
          (id, business_id, created_at, updated_at, messages, lead_captured, input_tokens, output_tokens)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, conv.businessId, t, t, JSON.stringify(conv.messages),
      conv.leadCaptured ? 1 : 0, conv.addInputTokens, conv.addOutputTokens,
    ],
  });
  return id;
}

export async function listConversations(opts: { businessId?: string; limit?: number } = {}): Promise<Conversation[]> {
  const c = await db();
  const where = opts.businessId ? "WHERE c.business_id = ?" : "";
  const args: InValue[] = opts.businessId ? [opts.businessId] : [];
  const { rows } = await c.execute({
    sql: `SELECT c.*, b.profile AS business_profile FROM conversations c
          LEFT JOIN businesses b ON b.id = c.business_id
          ${where} ORDER BY c.updated_at DESC LIMIT ${Math.min(opts.limit ?? 100, 500)}`,
    args,
  });
  return rows.map((r) => {
    const row = r as Row;
    return toConversation({ ...row, business_name: nameFromProfile(row.business_profile) });
  });
}

/* ── Leads ──────────────────────────────────────────────────────────── */

function nameFromProfile(p: unknown): string | undefined {
  try {
    return p ? String(JSON.parse(String(p)).name) : undefined;
  } catch {
    return undefined;
  }
}

function toLead(r: Row): Lead {
  return {
    id: String(r.id),
    businessId: String(r.business_id),
    businessName: nameFromProfile(r.business_profile),
    createdAt: String(r.created_at),
    guestName: String(r.guest_name),
    contact: String(r.contact),
    checkIn: String(r.check_in),
    checkOut: String(r.check_out),
    guests: r.guests === null || r.guests === undefined ? null : Number(r.guests),
    roomPreference: String(r.room_preference),
    notes: String(r.notes),
    status: String(r.status) as LeadStatus,
    conversationId: r.conversation_id ? String(r.conversation_id) : null,
  };
}

export async function createLead(
  lead: Omit<Lead, "id" | "createdAt" | "status" | "businessName">
): Promise<Lead> {
  const c = await db();
  const id = randomUUID();
  await c.execute({
    sql: `INSERT INTO leads (id, business_id, conversation_id, created_at, guest_name, contact,
          check_in, check_out, guests, room_preference, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    args: [
      id, lead.businessId, lead.conversationId, now(), lead.guestName, lead.contact,
      lead.checkIn, lead.checkOut, lead.guests, lead.roomPreference, lead.notes,
    ],
  });
  return { ...lead, id, createdAt: now(), status: "new" };
}

export async function listLeads(opts: { businessId?: string; status?: LeadStatus; limit?: number } = {}): Promise<Lead[]> {
  const c = await db();
  const clauses: string[] = [];
  const args: InValue[] = [];
  if (opts.businessId) { clauses.push("l.business_id = ?"); args.push(opts.businessId); }
  if (opts.status) { clauses.push("l.status = ?"); args.push(opts.status); }
  const { rows } = await c.execute({
    sql: `SELECT l.*, b.profile AS business_profile FROM leads l
          LEFT JOIN businesses b ON b.id = l.business_id
          ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""}
          ORDER BY l.created_at DESC LIMIT ${Math.min(opts.limit ?? 200, 1000)}`,
    args,
  });
  return rows.map((r) => toLead(r as Row));
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const c = await db();
  await c.execute({ sql: "UPDATE leads SET status = ? WHERE id = ?", args: [status, id] });
}

export async function deleteLead(id: string): Promise<void> {
  const c = await db();
  await c.execute({ sql: "DELETE FROM leads WHERE id = ?", args: [id] });
}

/* ── Stats ──────────────────────────────────────────────────────────── */

export type BusinessStats = {
  conversations: number;
  leads: number;
  booked: number;
  inputTokens: number;
  outputTokens: number;
};

/** Per-business stats since a given ISO date. */
export async function statsSince(sinceIso: string): Promise<Record<string, BusinessStats>> {
  const c = await db();
  const [conv, leads] = await c.batch(
    [
      {
        sql: `SELECT business_id, COUNT(*) AS n, SUM(input_tokens) AS i, SUM(output_tokens) AS o
              FROM conversations WHERE created_at >= ? GROUP BY business_id`,
        args: [sinceIso],
      },
      {
        sql: `SELECT business_id, COUNT(*) AS n, SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) AS booked
              FROM leads WHERE created_at >= ? GROUP BY business_id`,
        args: [sinceIso],
      },
    ],
    "read"
  );
  const out: Record<string, BusinessStats> = {};
  const get = (id: string) =>
    (out[id] ??= { conversations: 0, leads: 0, booked: 0, inputTokens: 0, outputTokens: 0 });
  for (const r of conv.rows) {
    const s = get(String(r.business_id));
    s.conversations = Number(r.n);
    s.inputTokens = Number(r.i ?? 0);
    s.outputTokens = Number(r.o ?? 0);
  }
  for (const r of leads.rows) {
    const s = get(String(r.business_id));
    s.leads = Number(r.n);
    s.booked = Number(r.booked ?? 0);
  }
  return out;
}

/** Daily conversation and lead counts for the last N days (all businesses or one). */
export async function dailySeries(days: number, businessId?: string) {
  const c = await db();
  const since = new Date(Date.now() - (days - 1) * 86400000);
  since.setUTCHours(0, 0, 0, 0);
  const filter = businessId ? "AND business_id = ?" : "";
  const args: InValue[] = businessId ? [since.toISOString(), businessId] : [since.toISOString()];
  const [conv, leads] = await c.batch(
    [
      { sql: `SELECT substr(created_at,1,10) AS d, COUNT(*) AS n FROM conversations WHERE created_at >= ? ${filter} GROUP BY d`, args },
      { sql: `SELECT substr(created_at,1,10) AS d, COUNT(*) AS n FROM leads WHERE created_at >= ? ${filter} GROUP BY d`, args },
    ],
    "read"
  );
  const cm = new Map(conv.rows.map((r) => [String(r.d), Number(r.n)]));
  const lm = new Map(leads.rows.map((r) => [String(r.d), Number(r.n)]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
    return { date: d, conversations: cm.get(d) ?? 0, leads: lm.get(d) ?? 0 };
  });
}
