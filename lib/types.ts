import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────
 * The business profile. Everything the website and the AI receptionist
 * know about a guest house lives in this one object, stored as JSON in
 * the database and edited from /admin. Cloning a business = copying it.
 * ──────────────────────────────────────────────────────────────────── */

const str = (max: number) => z.string().trim().max(max);
/** Empty, or an http(s) URL — blocks javascript: and data: links. */
const url = () =>
  z.string().trim().max(500)
    .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Must start with http:// or https://")
    .default("");

export const RoomSchema = z.object({
  name: str(80).min(1, "Room name is required"),
  sleeps: z.coerce.number().int().min(1).max(50),
  rate: z.coerce.number().min(0).max(1_000_000),
  description: str(400).default(""),
  imageUrl: url(),
});

export const FaqSchema = z.object({
  q: str(200).min(1, "Question is required"),
  a: str(1000).min(1, "Answer is required"),
});

export const ProfileSchema = z.object({
  // Identity & brand
  name: str(100).min(1, "Business name is required"),
  tagline: str(160).default(""),
  about: str(1500).default(""),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #8a5a2b")
    .default("#8a5a2b"),
  heroImageUrl: url(),
  currency: str(8).default("M"),

  // Location & contact
  city: str(100).default(""),
  address: str(200).default(""),
  directions: str(800).default(""),
  mapUrl: url(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{0,15}$/, "Digits only, with country code, e.g. 26658000000")
    .default(""),
  phone: str(40).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Invalid email")]).default(""),
  ownerEmail: z.union([z.literal(""), z.string().trim().email("Invalid email")]).default(""),
  bookingUrl: url(),

  // Stay details
  checkIn: str(20).default("14:00"),
  checkOut: str(20).default("10:00"),
  rooms: z.array(RoomSchema).max(40).default([]),
  amenities: z.array(str(80).min(1)).max(40).default([]),
  policies: z.array(str(300).min(1)).max(30).default([]),

  // AI knowledge
  faqs: z.array(FaqSchema).max(40).default([]),
  aiNotes: str(2000).default(""),
  greeting: str(300).default(""),
});

export type Room = z.infer<typeof RoomSchema>;
export type Faq = z.infer<typeof FaqSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "At least 2 characters")
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

export const RESERVED_SLUGS = new Set([
  "admin", "api", "embed", "widget", "widget.js", "_next", "static", "public",
  "login", "logout", "favicon.ico", "robots.txt", "sitemap.xml", "opengraph-image", "llms.txt",
]);

export type Business = {
  id: string;
  slug: string;
  active: boolean;
  profile: Profile;
  createdAt: string;
  updatedAt: string;
};

export const LEAD_STATUSES = ["new", "contacted", "booked", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  businessId: string;
  businessName?: string;
  createdAt: string;
  guestName: string;
  contact: string;
  checkIn: string;
  checkOut: string;
  /** YYYY-MM-DD worked out by the model and validated (lib/dates.ts), or "". */
  checkInDate: string;
  checkOutDate: string;
  guests: number | null;
  roomPreference: string;
  notes: string;
  status: LeadStatus;
  conversationId: string | null;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Conversation = {
  id: string;
  businessId: string;
  businessName?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  leadCaptured: boolean;
  inputTokens: number;
  outputTokens: number;
};

export function emptyProfile(name = "New Guest House"): Profile {
  return ProfileSchema.parse({ name });
}
