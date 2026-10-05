import "server-only";

/* Best-effort fixed-window limiter kept in memory. On serverless it is
 * per-instance, which is still enough to stop casual abuse of the chat
 * (and your API bill) and password guessing. */

type Bucket = { count: number; resetAt: number };
const store = (globalThis as unknown as { __sdRate?: Map<string, Bucket> }).__sdRate ?? new Map<string, Bucket>();
(globalThis as unknown as { __sdRate?: Map<string, Bucket> }).__sdRate = store;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const t = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt <= t) {
    store.set(key, { count: 1, resetAt: t + windowMs });
    if (store.size > 10_000) {
      for (const [k, v] of store) if (v.resetAt <= t) store.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - t) / 1000) };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
