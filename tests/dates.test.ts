import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStay, longDay, nights, normaliseStay, parseIsoDate } from "../lib/dates.ts";

const TODAY = "2026-10-05"; // a Monday

test("parseIsoDate rejects impossible and malformed dates", () => {
  assert.equal(parseIsoDate("2026-02-30"), null);
  assert.equal(parseIsoDate("2026-13-01"), null);
  assert.equal(parseIsoDate("9 Oct"), null);
  assert.equal(parseIsoDate("2026-10-9"), null);
  assert.notEqual(parseIsoDate("2028-02-29"), null); // leap day
});

test("normaliseStay keeps a plausible stay", () => {
  assert.deepEqual(normaliseStay("2026-10-09", "2026-10-11", TODAY), { checkInDate: "2026-10-09", checkOutDate: "2026-10-11" });
});

test("normaliseStay drops arrivals in the past (the classic wrong-year bug)", () => {
  assert.deepEqual(normaliseStay("2025-10-09", "2025-10-11", TODAY), { checkInDate: "", checkOutDate: "" });
});

test("normaliseStay allows yesterday (time-zone slack) but not further back", () => {
  assert.equal(normaliseStay("2026-10-04", "", TODAY).checkInDate, "2026-10-04");
  assert.equal(normaliseStay("2026-10-03", "", TODAY).checkInDate, "");
});

test("normaliseStay drops departures not after arrival or absurdly long", () => {
  assert.deepEqual(normaliseStay("2026-10-09", "2026-10-09", TODAY), { checkInDate: "2026-10-09", checkOutDate: "" });
  assert.deepEqual(normaliseStay("2026-10-09", "2026-10-08", TODAY), { checkInDate: "2026-10-09", checkOutDate: "" });
  assert.deepEqual(normaliseStay("2026-10-09", "2027-03-01", TODAY), { checkInDate: "2026-10-09", checkOutDate: "" });
});

test("normaliseStay drops a departure without an arrival, and far-future arrivals", () => {
  assert.deepEqual(normaliseStay("", "2026-10-11", TODAY), { checkInDate: "", checkOutDate: "" });
  assert.deepEqual(normaliseStay("2030-01-01", "2030-01-03", TODAY), { checkInDate: "", checkOutDate: "" });
});

test("nights and formatting", () => {
  assert.equal(nights("2026-10-09", "2026-10-11"), 2);
  assert.equal(nights("2026-12-31", "2027-01-01"), 1);
  assert.equal(formatStay("2026-10-09", "2026-10-11"), "Fri 9 Oct 2026 → Sun 11 Oct 2026 · 2 nights");
  assert.equal(formatStay("2026-10-09", ""), "from Fri 9 Oct 2026");
  assert.equal(formatStay("", ""), "");
  assert.equal(longDay(TODAY), "Monday 5 October 2026");
});
