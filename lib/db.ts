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
import { lastNDates, localMidnightUtc, tzOffsetMinutes } from "./stats";
import { TIME_ZONE } from "./format";

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
     check_in_date TEXT NOT NULL DEFAULT '',
     check_out_date TEXT NOT NULL DEFAULT '',
     guests INTEGER,
     room_preference TEXT NOT NULL DEFAULT '',
     notes TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'new'
   )`,
  `CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_conversation ON leads(conversation_id)`,
  // Token usage per business per local day, for the daily spend cap.
  `CREATE TABLE IF NOT EXISTS usage_daily (
     business_id TEXT NOT NULL,
     day TEXT NOT NULL,
     input_tokens INTEGER NOT NULL DEFAULT 0,
     output_tokens INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (business_id, day)
   )`,
];

async function db(): Promise<Client> {
  const c = client();
  if (!globalForDb.__staydeskInit) {
    globalForDb.__staydeskInit = (async () => {
      await c.batch(SCHEMA, "write");
      // Migrations for databases created before a column existed.
      const leadCols = new Set((await c.execute("PRAGMA table_info(leads)")).rows.map((r) => String(r.name)));
      for (const col of ["check_in_date", "check_out_date"]) {
        if (!leadCols.has(col)) await c.execute(`ALTER TABLE leads ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
      }
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

function parseMessages(raw: unknown): ChatMessage[] {
  try {
    const v = JSON.parse(String(raw));
    return Array.isArray(v) ? (v as ChatMessage[]) : [];
  } catch {
    return []; // one corrupt row must not break the whole list
  }
}

function toConversation(r: Row): Conversation {
  return {
    id: String(r.id),
    businessId: String(r.business_id),
    businessName: r.business_name ? String(r.business_name) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    messages: parseMessages(r.messages),
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
    sql: `SELECT c.*, json_extract(b.profile, '$.name') AS business_name FROM conversations c
          LEFT JOIN businesses b ON b.id = c.business_id
          ${where} ORDER BY c.updated_at DESC LIMIT ${Math.min(opts.limit ?? 100, 500)}`,
    args,
  });
  return rows.map((r) => toConversation(r as Row));
}

/* ── Leads ──────────────────────────────────────────────────────────── */

function toLead(r: Row): Lead {
  return {
    id: String(r.id),
    businessId: String(r.business_id),
    businessName: r.business_name ? String(r.business_name) : undefined,
    createdAt: String(r.created_at),
    guestName: String(r.guest_name),
    contact: String(r.contact),
    checkIn: String(r.check_in),
    checkOut: String(r.check_out),
    checkInDate: String(r.check_in_date ?? ""),
    checkOutDate: String(r.check_out_date ?? ""),
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
  const createdAt = now();
  await c.execute({
    sql: `INSERT INTO leads (id, business_id, conversation_id, created_at, guest_name, contact,
          check_in, check_out, check_in_date, check_out_date, guests, room_preference, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    args: [
      id, lead.businessId, lead.conversationId, createdAt, lead.guestName, lead.contact,
      lead.checkIn, lead.checkOut, lead.checkInDate, lead.checkOutDate, lead.guests, lead.roomPreference, lead.notes,
    ],
  });
  return { ...lead, id, createdAt, status: "new" };
}

/** The inquiry already captured in a conversation, if any. */
export async function getLeadByConversation(conversationId: string): Promise<Lead | null> {
  const c = await db();
  const { rows } = await c.execute({
    sql: "SELECT * FROM leads WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 1",
    args: [conversationId],
  });
  return rows[0] ? toLead(rows[0] as Row) : null;
}

/** Overwrites the guest-supplied fields of an inquiry; keeps id, status and created_at. */
export async function updateLeadDetails(
  id: string,
  d: Pick<Lead, "guestName" | "contact" | "checkIn" | "checkOut" | "checkInDate" | "checkOutDate" | "guests" | "roomPreference" | "notes">
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `UPDATE leads SET guest_name = ?, contact = ?, check_in = ?, check_out = ?,
          check_in_date = ?, check_out_date = ?, guests = ?,
          room_preference = ?, notes = ? WHERE id = ?`,
    args: [d.guestName, d.contact, d.checkIn, d.checkOut, d.checkInDate, d.checkOutDate, d.guests, d.roomPreference, d.notes, id],
  });
}

export async function listLeads(opts: { businessId?: string; status?: LeadStatus; limit?: number } = {}): Promise<Lead[]> {
  const c = await db();
  const clauses: string[] = [];
  const args: InValue[] = [];
  if (opts.businessId) { clauses.push("l.business_id = ?"); args.push(opts.businessId); }
  if (opts.status) { clauses.push("l.status = ?"); args.push(opts.status); }
  const { rows } = await c.execute({
    sql: `SELECT l.*, json_extract(b.profile, '$.name') AS business_name FROM leads l
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

/* ── Daily usage (spend cap) ────────────────────────────────────────── */

export async function addDailyUsage(businessId: string, day: string, input: number, output: number): Promise<void> {
  if (input === 0 && output === 0) return;
  const c = await db();
  await c.execute({
    sql: `INSERT INTO usage_daily (business_id, day, input_tokens, output_tokens) VALUES (?, ?, ?, ?)
          ON CONFLICT (business_id, day) DO UPDATE SET
            input_tokens = input_tokens + excluded.input_tokens,
            output_tokens = output_tokens + excluded.output_tokens`,
    args: [businessId, day, input, output],
  });
}

/** Tokens used on `day` by one business and by all businesses together. */
export async function dailyUsage(businessId: string, day: string) {
  const c = await db();
  const { rows } = await c.execute({
    sql: `SELECT COALESCE(SUM(CASE WHEN business_id = ? THEN input_tokens END), 0) AS bi,
                 COALESCE(SUM(CASE WHEN business_id = ? THEN output_tokens END), 0) AS bo,
                 COALESCE(SUM(input_tokens), 0) AS ti, COALESCE(SUM(output_tokens), 0) AS tout
          FROM usage_daily WHERE day = ?`,
    args: [businessId, businessId, day],
  });
  const r = rows[0];
  return {
    business: { input: Number(r.bi), output: Number(r.bo) },
    total: { input: Number(r.ti), output: Number(r.tout) },
  };
}

/* ── Stats ──────────────────────────────────────────────────────────── */

export type BusinessStats = {
  conversations: number;
  /** Conversations (started in the period) that have at least one inquiry. */
  conversationsWithInquiry: number;
  /** Inquiries created in the period (a conversation normally has at most one). */
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
        // EXISTS (not lead_captured) so deleting a spam inquiry removes it from the rate.
        sql: `SELECT business_id, COUNT(*) AS n, SUM(input_tokens) AS i, SUM(output_tokens) AS o,
                     SUM(EXISTS (SELECT 1 FROM leads l WHERE l.conversation_id = c.id)) AS k
              FROM conversations c WHERE created_at >= ? GROUP BY business_id`,
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
    (out[id] ??= { conversations: 0, conversationsWithInquiry: 0, leads: 0, booked: 0, inputTokens: 0, outputTokens: 0 });
  for (const r of conv.rows) {
    const s = get(String(r.business_id));
    s.conversations = Number(r.n);
    s.conversationsWithInquiry = Number(r.k ?? 0);
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

/**
 * Daily conversations, bucketed by the local calendar day they started
 * (TIME_ZONE), and how many of those conversations produced an inquiry.
 * Both counts come from the same cohort, so withInquiry ≤ conversations.
 */
export async function dailySeries(days: number, businessId?: string) {
  const c = await db();
  const dates = lastNDates(days, TIME_ZONE);
  const since = localMidnightUtc(dates[0], TIME_ZONE).toISOString();
  // One offset for the whole window: exact for zones without DST (e.g. SAST).
  const off = tzOffsetMinutes(new Date(), TIME_ZONE);
  const shift = `${off >= 0 ? "+" : ""}${off} minutes`;
  const filter = businessId ? "AND c.business_id = ?" : "";
  const args: InValue[] = businessId ? [shift, since, businessId] : [shift, since];
  const { rows } = await c.execute({
    sql: `SELECT substr(datetime(c.created_at, ?), 1, 10) AS d, COUNT(*) AS n,
                 SUM(EXISTS (SELECT 1 FROM leads l WHERE l.conversation_id = c.id)) AS k
          FROM conversations c WHERE c.created_at >= ? ${filter} GROUP BY d`,
    args,
  });
  const byDay = new Map(rows.map((r) => [String(r.d), { n: Number(r.n), k: Number(r.k ?? 0) }]));
  return dates.map((date) => ({
    date,
    conversations: byDay.get(date)?.n ?? 0,
    withInquiry: byDay.get(date)?.k ?? 0,
  }));
}
