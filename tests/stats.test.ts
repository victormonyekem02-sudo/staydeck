import { test } from "node:test";
import assert from "node:assert/strict";
import { lastNDates, localDate, localMidnightUtc, tzOffsetMinutes, wilson } from "../lib/stats.ts";
import { slugify } from "../lib/slug.ts";

const close = (a: number, b: number, tol = 5e-4) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test("wilson: README example, 2 of 20 → ≈ 2.8%–30.1%", () => {
  const ci = wilson(2, 20)!;
  close(ci.lower, 0.0279);
  close(ci.upper, 0.3010);
});

test("wilson: k = 0 still has a non-zero upper bound (Wald would give 0–0)", () => {
  const ci = wilson(0, 10)!;
  assert.equal(ci.lower, 0);
  close(ci.upper, 0.2775);
});

test("wilson: k = n is symmetric to k = 0", () => {
  const a = wilson(0, 10)!;
  const b = wilson(10, 10)!;
  close(b.lower, 1 - a.upper);
  assert.equal(b.upper, 1);
});

test("wilson: undefined for n = 0 or impossible k", () => {
  assert.equal(wilson(0, 0), null);
  assert.equal(wilson(3, 2), null);
  assert.equal(wilson(-1, 2), null);
});

test("wilson: interval narrows roughly with 1/√n", () => {
  const w = (n: number) => { const c = wilson(n / 10, n)!; return c.upper - c.lower; };
  const ratio = w(100) / w(400);
  assert.ok(ratio > 1.8 && ratio < 2.2, `ratio ${ratio}`);
});

test("time zone: 23:30 UTC on 31 Jan is 1 Feb in Johannesburg (UTC+2)", () => {
  const at = new Date("2026-01-31T23:30:00Z");
  assert.equal(tzOffsetMinutes(at, "Africa/Johannesburg"), 120);
  assert.equal(localDate(at, "Africa/Johannesburg"), "2026-02-01");
  assert.equal(localMidnightUtc("2026-02-01", "Africa/Johannesburg").toISOString(), "2026-01-31T22:00:00.000Z");
});

test("time zone: negative offsets work too", () => {
  assert.equal(localMidnightUtc("2026-01-15", "America/New_York").toISOString(), "2026-01-15T05:00:00.000Z");
});

test("lastNDates: consecutive local days ending today, across a month end", () => {
  const d = lastNDates(3, "Africa/Johannesburg", new Date("2026-03-01T21:59:00Z"));
  assert.deepEqual(d, ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

test("slugify: strips accents instead of splitting words", () => {
  assert.equal(slugify("Résidence du Lac"), "residence-du-lac");
  assert.equal(slugify("Café Ñandú"), "cafe-nandu");
});

test("slugify: keeps a trailing dash while typing, trims when done", () => {
  assert.equal(slugify("stone-", { trim: false }), "stone-");
  assert.equal(slugify("stone-"), "stone");
  assert.equal(slugify("  --Stone  Guest House!! "), "stone-guest-house");
});
