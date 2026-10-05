/* Pure helpers for the dashboard numbers. No imports, so they can be
 * unit-tested directly (tests/stats.test.ts). */

export type Interval = { lower: number; upper: number };

/**
 * Wilson score interval for a binomial proportion k/n.
 *
 * Preferred over the Wald interval (p ± z·√(p(1−p)/n)), which collapses to
 * zero width at k = 0 or k = n and under-covers badly for small n, which is
 * exactly the regime of a guest house with a few dozen chats a month.
 * Returns null when n = 0 (the proportion is undefined, not 0%).
 */
export function wilson(k: number, n: number, z = 1.96): Interval | null {
  if (!(n > 0) || k < 0 || k > n) return null;
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { lower: Math.max(0, centre - half), upper: Math.min(1, centre + half) };
}

export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/* ── Time zones ────────────────────────────────────────────────────────
 * Stored timestamps are UTC ISO strings. "This month" and "per day" must be
 * counted in the business's local calendar, otherwise chats between local
 * midnight and UTC midnight land in the wrong day (or month). */

/** Minutes to add to UTC to get local time in `timeZone` at instant `at`. */
export function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at)) parts[p.type] = p.value;
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** Local calendar date (YYYY-MM-DD) of instant `at` in `timeZone`. */
export function localDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** UTC instant of local midnight at the start of `ymd` (YYYY-MM-DD) in `timeZone`. */
export function localMidnightUtc(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - tzOffsetMinutes(new Date(guess), timeZone) * 60_000);
}

/** The `days` local calendar dates ending today, oldest first. */
export function lastNDates(days: number, timeZone: string, now = new Date()): string[] {
  const [y, m, d] = localDate(now, timeZone).split("-").map(Number);
  return Array.from({ length: days }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (days - 1) + i)).toISOString().slice(0, 10)
  );
}
