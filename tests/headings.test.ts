import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema, sectionHeading } from "../lib/types.ts";

test("profiles saved before headings existed still load, with defaults", () => {
  const p = ProfileSchema.parse({ name: "Old Lodge" }); // no "headings" key at all
  assert.deepEqual(sectionHeading(p.headings, "rooms"), { eyebrow: "Stay", title: "Rooms & rates", menu: "Rooms" });
});

test("the owner's wording wins; empty fields fall back to the default", () => {
  const p = ProfileSchema.parse({ name: "X", headings: { faq: { title: "Lipotso", eyebrow: "", menu: "Lipotso" } } });
  assert.deepEqual(sectionHeading(p.headings, "faq"), { eyebrow: "Questions", title: "Lipotso", menu: "Lipotso" });
  assert.equal(sectionHeading(p.headings, "location").title, "Location & contact");
});

test("over-long headings are rejected", () => {
  assert.equal(ProfileSchema.safeParse({ name: "X", headings: { rooms: { title: "x".repeat(81) } } }).success, false);
});
