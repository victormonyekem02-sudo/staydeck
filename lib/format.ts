export function money(currency: string, amount: number): string {
  const n = Number.isInteger(amount) ? amount.toLocaleString("en-ZA") : amount.toFixed(2);
  return `${currency}${n}`;
}

/** Estimated API cost in USD from token counts, using env pricing. */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const pin = Number(process.env.PRICE_INPUT_PER_MTOK ?? 1);
  const pout = Number(process.env.PRICE_OUTPUT_PER_MTOK ?? 5);
  return (inputTokens / 1e6) * pin + (outputTokens / 1e6) * pout;
}

export function usd(n: number): string {
  return n < 0.01 && n > 0 ? "<$0.01" : `$${n.toFixed(2)}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

export function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}
