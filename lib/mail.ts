import "server-only";
import nodemailer from "nodemailer";
import { formatStay } from "./dates";
import type { Business, Lead } from "./types";

/** Emails a new inquiry to the business owner. Never throws: the lead is
 *  already saved in the database, email is only a notification. */
export async function notifyOwner(business: Business, lead: Lead, opts: { updated?: boolean } = {}): Promise<void> {
  const to = business.profile.ownerEmail;
  if (!process.env.SMTP_HOST || !to) return;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      // Nodemailer's defaults are minutes long; fail fast instead.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    // Guest-supplied text: keep it on one line in the subject header.
    const oneLine = (v: string) => v.replace(/[\r\n\t]+/g, " ").slice(0, 80);
    const line = (k: string, v: string | number | null) => (v ? `${k}: ${v}\n` : "");
    const stay = formatStay(lead.checkInDate, lead.checkOutDate);
    const said = [lead.checkIn, lead.checkOut].filter(Boolean).join(" → ");
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `${opts.updated ? "Updated" : "New"} booking inquiry — ${oneLine(lead.guestName || "guest")} (${oneLine(stay || lead.checkIn || "dates TBC")})`,
      text:
        `A guest ${opts.updated ? "updated their booking request" : "asked to book"} at ${business.profile.name}.\n\n` +
        line("Name", lead.guestName) +
        line("Contact", lead.contact) +
        line("Stay", stay) +
        line(stay ? "Guest wrote" : "Dates", said) +
        line("Guests", lead.guests) +
        line("Room", lead.roomPreference) +
        line("Notes", lead.notes) +
        `\nPlease confirm availability with the guest directly.\n`,
    });
  } catch (err) {
    console.error("[staydesk] owner email failed:", err);
  }
}
