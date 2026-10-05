"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown, ArrowUp, Bot, Heading, Building2, Check, Copy, ExternalLink, Globe, MapPin, Palette, Plus, Trash2, BedDouble, ListChecks,
} from "lucide-react";
import { Badge, Button, Card, Field, Input, Textarea, api, cn, useToast } from "./ui";
import { slugify } from "@/lib/slug";
import { DEFAULT_HEADINGS, type Business, type Faq, type HeadingSection, type Headings, type Profile, type Room } from "@/lib/types";

const TABS = [
  { id: "brand", label: "Brand", icon: Palette },
  { id: "contact", label: "Contact & location", icon: MapPin },
  { id: "rooms", label: "Rooms & rates", icon: BedDouble },
  { id: "stay", label: "Amenities & policies", icon: ListChecks },
  { id: "headings", label: "Page headings", icon: Heading },
  { id: "ai", label: "AI receptionist", icon: Bot },
  { id: "publish", label: "Publish & embed", icon: Globe },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function BusinessEditor({ initial, baseUrl }: { initial: Business; baseUrl: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [b, setB] = useState(initial);
  const [tab, setTab] = useState<TabId>("brand");
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => JSON.stringify(b) !== JSON.stringify(saved), [b, saved]);

  useEffect(() => {
    if (search.get("created")) toast("success", "Business created. Fill in the details and save.");
  }, [search, toast]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const p = b.profile;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setB((cur) => ({ ...cur, profile: { ...cur.profile, [key]: value } }));

  async function save() {
    setSaving(true);
    try {
      const { business } = await api<{ business: Business }>(`/api/admin/businesses/${b.id}`, {
        method: "PUT",
        json: { slug: slugify(b.slug), active: b.active, profile: b.profile },
      });
      setSaved(business);
      setB(business);
      toast("success", "Saved. The website and AI receptionist are updated.");
      router.refresh();
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const typed = window.prompt(
      `This permanently deletes ${p.name}, its inquiries and conversations.\n\nType the web address "${saved.slug}" to confirm.`
    );
    if (typed !== saved.slug) return;
    try {
      await api(`/api/admin/businesses/${b.id}`, { method: "DELETE" });
      window.location.href = "/admin/businesses";
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-xs text-muted">/{saved.slug}</p>
          <h1 className="flex items-center gap-3 font-display text-3xl font-semibold tracking-tight">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: p.brandColor }} aria-hidden />
            <span className="truncate">{p.name || "Untitled"}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <a href={`/${saved.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-card px-4 text-sm hover:bg-paper">
            <ExternalLink className="h-4 w-4" aria-hidden /> View site
          </a>
          <Button onClick={save} loading={saving} disabled={!dirty}>
            {dirty ? "Save changes" : <><Check className="h-4 w-4" aria-hidden /> Saved</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" role="tablist" aria-label="Sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 cursor-pointer",
                tab === id ? "bg-card font-medium text-ink shadow-sm ring-1 ring-line" : "text-ink-soft hover:bg-black/5"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <div role="tabpanel" key={tab} className="animate-rise min-w-0 space-y-6">
          {tab === "brand" && (
            <Card className="space-y-5 p-6">
              <Field label="Business name" htmlFor="name">
                <Input id="name" value={p.name} maxLength={100} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Tagline" htmlFor="tagline" hint="One line shown under the name on the website.">
                <Input id="tagline" value={p.tagline} maxLength={160} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
              <Field label="About" htmlFor="about" hint="A short paragraph for the website. The AI also reads this.">
                <Textarea id="about" value={p.about} maxLength={1500} onChange={(e) => set("about", e.target.value)} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Brand colour" htmlFor="color" hint="Buttons, accents and the chat widget use this.">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      aria-label="Pick brand colour"
                      value={p.brandColor}
                      onChange={(e) => set("brandColor", e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-line-strong bg-card p-1"
                    />
                    <Input id="color" value={p.brandColor} maxLength={7} className="font-mono" onChange={(e) => set("brandColor", e.target.value)} />
                  </div>
                </Field>
                <Field label="Currency symbol" htmlFor="currency" hint='e.g. "M", "R", "$"'>
                  <Input id="currency" value={p.currency} maxLength={8} onChange={(e) => set("currency", e.target.value)} />
                </Field>
              </div>
              <Field label="Hero image URL" htmlFor="hero" hint="A wide photo of the property. Leave empty for a colour banner.">
                <Input id="hero" type="url" value={p.heroImageUrl} placeholder="https://…" onChange={(e) => set("heroImageUrl", e.target.value)} />
              </Field>
              {p.heroImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.heroImageUrl} alt="Hero preview" className="h-40 w-full rounded-xl object-cover" />
              )}
            </Card>
          )}

          {tab === "contact" && (
            <Card className="space-y-5 p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="WhatsApp number" htmlFor="wa" hint="Digits only with country code, e.g. 26658000000">
                  <Input id="wa" inputMode="numeric" value={p.whatsapp} maxLength={15} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" value={p.phone} maxLength={40} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label="Guest-facing email" htmlFor="email">
                  <Input id="email" type="email" value={p.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Owner email (inquiries sent here)" htmlFor="owner" hint="Requires SMTP to be configured.">
                  <Input id="owner" type="email" value={p.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City" htmlFor="city">
                  <Input id="city" value={p.city} maxLength={100} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Street address" htmlFor="addr">
                  <Input id="addr" value={p.address} maxLength={200} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
              <Field label="Directions" htmlFor="dir">
                <Textarea id="dir" value={p.directions} maxLength={800} onChange={(e) => set("directions", e.target.value)} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Google Maps link" htmlFor="map">
                  <Input id="map" type="url" value={p.mapUrl} placeholder="https://maps.app.goo.gl/…" onChange={(e) => set("mapUrl", e.target.value)} />
                </Field>
                <Field label="External booking link" htmlFor="bk" hint="Booking.com, Airbnb, etc. Optional.">
                  <Input id="bk" type="url" value={p.bookingUrl} onChange={(e) => set("bookingUrl", e.target.value)} />
                </Field>
              </div>
            </Card>
          )}

          {tab === "rooms" && (
            <>
              <Card className="grid gap-5 p-6 sm:grid-cols-2">
                <Field label="Check-in from" htmlFor="ci">
                  <Input id="ci" value={p.checkIn} maxLength={20} onChange={(e) => set("checkIn", e.target.value)} />
                </Field>
                <Field label="Check-out by" htmlFor="co">
                  <Input id="co" value={p.checkOut} maxLength={20} onChange={(e) => set("checkOut", e.target.value)} />
                </Field>
              </Card>
              <RoomsEditor rooms={p.rooms} currency={p.currency} onChange={(r) => set("rooms", r)} />
            </>
          )}

          {tab === "stay" && (
            <>
              <ListEditor
                title="Amenities"
                hint="Short items, e.g. “Free WiFi”, “Backup power”."
                items={p.amenities}
                max={40}
                maxLength={80}
                onChange={(v) => set("amenities", v)}
              />
              <ListEditor
                title="Policies"
                hint="Deposit, cancellation, smoking, children, pets…"
                items={p.policies}
                max={30}
                maxLength={300}
                multiline
                onChange={(v) => set("policies", v)}
              />
            </>
          )}

          {tab === "headings" && <HeadingsEditor headings={p.headings} onChange={(v) => set("headings", v)} />}

          {tab === "ai" && (
            <>
              <Card className="space-y-5 p-6">
                <Field label="Chat greeting" htmlFor="greet" hint="The first message guests see in the chat.">
                  <Input id="greet" value={p.greeting} maxLength={300} onChange={(e) => set("greeting", e.target.value)} />
                </Field>
                <Field
                  label="Notes for the AI"
                  htmlFor="notes"
                  hint="Tone, who the guests are, things to mention or avoid. The AI only states facts you've entered."
                >
                  <Textarea id="notes" value={p.aiNotes} maxLength={2000} onChange={(e) => set("aiNotes", e.target.value)} />
                </Field>
              </Card>
              <FaqEditor faqs={p.faqs} onChange={(f) => set("faqs", f)} />
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <h3 className="font-medium">Test the receptionist</h3>
                  {dirty ? <Badge tone="warn">Save to test latest changes</Badge> : <Badge tone="success">Up to date</Badge>}
                </div>
                {saved.active ? (
                  <iframe key={saved.updatedAt} src={`/embed/${saved.slug}?inline=1`} title="Chat preview" className="h-[460px] w-full bg-paper" />
                ) : (
                  <p className="p-5 text-sm text-ink-soft">This business is paused. Turn it on under Publish & embed to test the chat.</p>
                )}
              </Card>
            </>
          )}

          {tab === "publish" && (
            <>
              <Card className="space-y-5 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">Status</h3>
                    <p className="text-sm text-ink-soft">Paused businesses show a closed page and the chat stops answering.</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={b.active}
                    aria-label="Business live"
                    onClick={() => setB((cur) => ({ ...cur, active: !cur.active }))}
                    className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer", b.active ? "bg-accent" : "bg-line-strong")}
                  >
                    <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", b.active ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>
                <Field label="Web address" htmlFor="slug" hint="Changing this breaks old links and embed codes.">
                  <div className="flex items-center rounded-lg border border-line-strong bg-paper focus-within:border-accent">
                    <span className="pl-3 font-mono text-sm text-muted">{baseUrl.replace(/^https?:\/\//, "")}/</span>
                    <input
                      id="slug"
                      value={b.slug}
                      maxLength={48}
                      onChange={(e) => setB((cur) => ({ ...cur, slug: slugify(e.target.value, { trim: false }) }))}
                      onBlur={() => setB((cur) => ({ ...cur, slug: slugify(cur.slug) }))}
                      className="h-10 w-full bg-transparent px-1 font-mono text-sm focus:outline-none"
                    />
                  </div>
                </Field>
              </Card>

              <Card className="space-y-4 p-6">
                <div>
                  <h3 className="font-medium">Add the chat to their existing website</h3>
                  <p className="text-sm text-ink-soft">Paste this before the closing &lt;/body&gt; tag. A chat button appears bottom-right.</p>
                </div>
                <CopyBlock text={`<script src="${baseUrl}/widget.js" data-business="${saved.slug}" async></script>`} />
                <p className="text-sm text-ink-soft">Or link directly to their StayDesk website:</p>
                <CopyBlock text={`${baseUrl}/${saved.slug}`} />
              </Card>

              <Card className="flex flex-col gap-4 border-danger/30 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-medium text-danger">Delete business</h3>
                  <p className="text-sm text-ink-soft">Removes the site, inquiries and conversations. This can’t be undone.</p>
                </div>
                <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" aria-hidden /> Delete</Button>
              </Card>
            </>
          )}
        </div>
      </div>

      {dirty && (
        <div className="animate-rise fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-white shadow-xl lg:left-[260px]">
          <span className="text-sm">You have unsaved changes</span>
          <div className="flex gap-2">
            <button className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:text-white cursor-pointer" onClick={() => setB(saved)}>Discard</button>
            <button
              onClick={save}
              disabled={saving}
              className="h-8 rounded-lg bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-white/90 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-editors ────────────────────────────────────────────────────── */

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowControls({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button variant="ghost" size="icon" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label={`Move ${label} down`} disabled={i === n - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label={`Remove ${label}`} onClick={onRemove} className="hover:text-danger"><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function RoomsEditor({ rooms, currency, onChange }: { rooms: Room[]; currency: string; onChange: (r: Room[]) => void }) {
  const update = (i: number, patch: Partial<Room>) => onChange(rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-4">
      {rooms.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink-soft">
          <Building2 className="mx-auto mb-2 h-6 w-6 text-muted" aria-hidden />
          No rooms yet. Add the first one below.
        </Card>
      )}
      {rooms.map((r, i) => (
        <Card key={i} className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted">Room {i + 1}</span>
            <RowControls i={i} n={rooms.length} label={r.name || "room"} onMove={(d) => onChange(move(rooms, i, d))} onRemove={() => onChange(rooms.filter((_, j) => j !== i))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <Field label="Name" htmlFor={`rn${i}`}>
              <Input id={`rn${i}`} value={r.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} />
            </Field>
            <Field label="Sleeps" htmlFor={`rs${i}`}>
              <Input id={`rs${i}`} type="number" min={1} max={50} value={r.sleeps} onChange={(e) => update(i, { sleeps: Number(e.target.value) })} />
            </Field>
            <Field label={`Rate (${currency}/night)`} htmlFor={`rr${i}`}>
              <Input id={`rr${i}`} type="number" min={0} step="any" value={r.rate} onChange={(e) => update(i, { rate: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Description" htmlFor={`rd${i}`}>
              <Input id={`rd${i}`} value={r.description} maxLength={400} onChange={(e) => update(i, { description: e.target.value })} />
            </Field>
            <Field label="Photo URL" htmlFor={`ri${i}`}>
              <Input id={`ri${i}`} type="url" value={r.imageUrl} placeholder="https://…" onChange={(e) => update(i, { imageUrl: e.target.value })} />
            </Field>
          </div>
        </Card>
      ))}
      <Button
        variant="secondary"
        disabled={rooms.length >= 40}
        onClick={() => onChange([...rooms, { name: "", sleeps: 2, rate: 0, description: "", imageUrl: "" }])}
      >
        <Plus className="h-4 w-4" aria-hidden /> Add room
      </Button>
    </div>
  );
}

function ListEditor({
  title, hint, items, max, maxLength, multiline, onChange,
}: { title: string; hint: string; items: string[]; max: number; maxLength: number; multiline?: boolean; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.length >= max) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <Card className="p-6">
      <h3 className="font-medium">{title}</h3>
      <p className="mb-4 text-sm text-ink-soft">{hint}</p>
      <ul className="mb-4 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            {multiline ? (
              <Textarea aria-label={`${title} ${i + 1}`} value={item} maxLength={maxLength} className="min-h-10" rows={1}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            ) : (
              <Input aria-label={`${title} ${i + 1}`} value={item} maxLength={maxLength}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            )}
            <RowControls i={i} n={items.length} label={item || title} onMove={(d) => onChange(move(items, i, d))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          aria-label={`New ${title.toLowerCase()} item`}
          placeholder={`Add to ${title.toLowerCase()}…`}
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button variant="secondary" onClick={add} disabled={!draft.trim() || items.length >= max}>Add</Button>
      </div>
    </Card>
  );
}

function FaqEditor({ faqs, onChange }: { faqs: Faq[]; onChange: (f: Faq[]) => void }) {
  const update = (i: number, patch: Partial<Faq>) => onChange(faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <Card className="p-6">
      <h3 className="font-medium">Frequently asked questions</h3>
      <p className="mb-4 text-sm text-ink-soft">The questions guests ask most. These are the AI’s best source of truth.</p>
      <div className="space-y-4">
        {faqs.map((f, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-muted">FAQ {i + 1}</span>
              <RowControls i={i} n={faqs.length} label="FAQ" onMove={(d) => onChange(move(faqs, i, d))} onRemove={() => onChange(faqs.filter((_, j) => j !== i))} />
            </div>
            <div className="space-y-3">
              <Input aria-label={`Question ${i + 1}`} placeholder="Question" value={f.q} maxLength={200} onChange={(e) => update(i, { q: e.target.value })} />
              <Textarea aria-label={`Answer ${i + 1}`} placeholder="Answer" value={f.a} maxLength={1000} className="min-h-20" onChange={(e) => update(i, { a: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="mt-4" disabled={faqs.length >= 40} onClick={() => onChange([...faqs, { q: "", a: "" }])}>
        <Plus className="h-4 w-4" aria-hidden /> Add FAQ
      </Button>
    </Card>
  );
}

const HEADING_ROWS: { key: HeadingSection; label: string }[] = [
  { key: "rooms", label: "Rooms section" },
  { key: "amenities", label: "Amenities section" },
  { key: "policies", label: "Policies section" },
  { key: "location", label: "Location section" },
  { key: "faq", label: "FAQ section" },
];

function HeadingsEditor({ headings, onChange }: { headings: Headings; onChange: (h: Headings) => void }) {
  const update = (key: HeadingSection, field: "eyebrow" | "title" | "menu", value: string) =>
    onChange({ ...headings, [key]: { ...headings[key], [field]: value } });
  return (
    <Card className="space-y-6 p-6">
      <div>
        <h3 className="font-medium">Website headings</h3>
        <p className="text-sm text-ink-soft">
          Rename the sections of this business&apos;s website, for example in Sesotho. Leave a box empty to use the
          default shown in grey. The small line appears above the heading; the menu word appears in the top menu.
        </p>
      </div>
      {HEADING_ROWS.map(({ key, label }) => {
        const d = DEFAULT_HEADINGS[key];
        return (
          <fieldset key={key} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-medium">{label}</legend>
            <Field label="Small line" htmlFor={`h-${key}-e`}>
              <Input id={`h-${key}-e`} value={headings[key].eyebrow} placeholder={d.eyebrow} maxLength={40}
                onChange={(e) => update(key, "eyebrow", e.target.value)} />
            </Field>
            <Field label="Heading" htmlFor={`h-${key}-t`}>
              <Input id={`h-${key}-t`} value={headings[key].title} placeholder={d.title} maxLength={80}
                onChange={(e) => update(key, "title", e.target.value)} />
            </Field>
            {d.menu ? (
              <Field label="Menu word" htmlFor={`h-${key}-m`}>
                <Input id={`h-${key}-m`} value={headings[key].menu} placeholder={d.menu} maxLength={24}
                  onChange={(e) => update(key, "menu", e.target.value)} />
              </Field>
            ) : (
              <p className="self-end pb-2 text-xs text-muted">Not in the top menu.</p>
            )}
          </fieldset>
        );
      })}
    </Card>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-line-strong">
      <code className="flex-1 overflow-x-auto whitespace-nowrap bg-paper px-3 py-2.5 font-mono text-xs">{text}</code>
      <button
        onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="flex items-center gap-1.5 border-l border-line-strong bg-card px-3 text-sm hover:bg-paper cursor-pointer"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
