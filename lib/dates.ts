/* Booking dates. The model turns "next Friday for two nights" into ISO
 * dates using today's date from the prompt; everything it returns is
 * checked here before it is stored, because a wrong date in an inquiry is
 * worse than no date (the owner would confirm the wrong night). */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Parses YYYY-MM-DD as a real calendar date (rejects 2026-02-30). UTC midnight, or null. */
export function parseIsoDate(s: string): number | null {
  const m = ISO.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? t : null;
}

export const MAX_NIGHTS = 90;
const MAX_DAYS_AHEAD = 2 * 366;

/**
 * Keeps a model-supplied stay only if it is plausible: real dates, arrival
 * no earlier than yesterday (time-zone slack) and within ~2 years, departure
 * after arrival and at most MAX_NIGHTS later. Anything else becomes "", so
 * the owner falls back to the guest's own words instead of a wrong date.
 * A lone arrival date is kept; a lone departure date is not.
 */
export function normaliseStay(
  checkInDate: string,
  checkOutDate: string,
  today: string
): { checkInDate: string; checkOutDate: string } {
  const none = { checkInDate: "", checkOutDate: "" };
  const t0 = parseIsoDate(today);
  const ci = parseIsoDate(checkInDate);
  if (t0 === null || ci === null) return none;
  if (ci < t0 - DAY_MS || ci > t0 + MAX_DAYS_AHEAD * DAY_MS) return none;
  const co = parseIsoDate(checkOutDate);
  const coOk = co !== null && co > ci && co - ci <= MAX_NIGHTS * DAY_MS;
  return { checkInDate: checkInDate.trim(), checkOutDate: coOk ? checkOutDate.trim() : "" };
}

export function nights(checkInDate: string, checkOutDate: string): number | null {
  const ci = parseIsoDate(checkInDate);
  const co = parseIsoDate(checkOutDate);
  return ci !== null && co !== null && co > ci ? Math.round((co - ci) / DAY_MS) : null;
}

/* Formatted by hand, not with Intl: locale output differs between Node and
 * browser ICU versions ("Fri, 9 Oct" vs "Fri 9 Oct"), which would make the
 * server- and client-rendered inquiries table disagree. */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Fri 9 Oct 2026" */
export function formatDay(iso: string): string {
  const t = parseIsoDate(iso);
  if (t === null) return iso;
  const d = new Date(t);
  return `${DAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/** "Fri 9 Oct 2026 → Sun 11 Oct 2026 · 2 nights", or "" when there is no usable arrival date. */
export function formatStay(checkInDate: string, checkOutDate: string): string {
  if (parseIsoDate(checkInDate) === null) return "";
  if (parseIsoDate(checkOutDate) === null) return `from ${formatDay(checkInDate)}`;
  const n = nights(checkInDate, checkOutDate);
  return `${formatDay(checkInDate)} → ${formatDay(checkOutDate)}${n ? ` · ${n} night${n > 1 ? "s" : ""}` : ""}`;
}

/** "Monday 5 October 2026" for the system prompt. */
export function longDay(iso: string): string {
  const t = parseIsoDate(iso);
  if (t === null) return iso;
  const d = new Date(t);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
