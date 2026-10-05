import "server-only";
import nodemailer from "nodemailer";
import type { Business, Lead } from "./types";

/** Emails a new inquiry to the business owner. Never throws: the lead is
 *  already saved in the database, email is only a notification. */
export async function notifyOwner(business: Business, lead: Lead): Promise<void> {
  const to = business.profile.ownerEmail;
  if (!process.env.SMTP_HOST || !to) return;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    const line = (k: string, v: string | number | null) => (v ? `${k}: ${v}\n` : "");
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `New booking inquiry — ${lead.guestName || "guest"} (${lead.checkIn || "dates TBC"})`,
      text:
        `A guest asked to book at ${business.profile.name}.\n\n` +
        line("Name", lead.guestName) +
        line("Contact", lead.contact) +
        line("Check-in", lead.checkIn) +
        line("Check-out", lead.checkOut) +
        line("Guests", lead.guests) +
        line("Room", lead.roomPreference) +
        line("Notes", lead.notes) +
        `\nPlease confirm availability with the guest directly.\n`,
    });
  } catch (err) {
    console.error("[staydesk] owner email failed:", err);
  }
}
