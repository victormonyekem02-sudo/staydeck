import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, Check, Clock, Mail, MapPin, MessageCircle, Phone, Users } from "lucide-react";
import { ChatWidget } from "@/components/chat-widget";
import { getBusinessBySlug } from "@/lib/db";
import { onColor } from "@/lib/color";
import { baseUrl, money } from "@/lib/format";
import type { Business } from "@/lib/types";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBusinessBySlug((await params).slug);
  if (!b) return { title: "Not found" };
  const p = b.profile;
  const description = (p.tagline || p.about || `Rooms and rates at ${p.name}.`).slice(0, 155);
  return {
    title: { absolute: `${p.name}${p.city ? ` · ${p.city}` : ""}` },
    description,
    alternates: { canonical: `/${b.slug}` },
    // A paused site shows a placeholder page; keep it out of search results.
    robots: b.active ? undefined : { index: false, follow: false },
    // og:image comes from ./opengraph-image.tsx (a branded card for every business).
    openGraph: { type: "website", title: p.name, description, url: `/${b.slug}` },
    twitter: { card: "summary_large_image", title: p.name, description },
  };
}

export default async function BusinessSite({ params }: Props) {
  const b = await getBusinessBySlug((await params).slug);
  if (!b) notFound();
  const p = b.profile;
  const fg = onColor(p.brandColor);
  const wa = (text: string) => `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(text)}`;

  if (!b.active) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-3xl font-semibold">{p.name}</h1>
          <p className="mt-2 text-ink-soft">This page is temporarily unavailable.</p>
          {p.phone && <p className="mt-4 text-sm">Call us: <a className="underline" href={`tel:${p.phone}`}>{p.phone}</a></p>}
        </div>
      </main>
    );
  }

  const lowest = p.rooms.length ? Math.min(...p.rooms.map((r) => r.rate)) : null;

  return (
    <div className="bg-[#fbfaf7] text-ink" style={{ ["--brand" as string]: p.brandColor }}>
      <a href="#main" className="skip-link">Skip to content</a>
      <script
        type="application/ld+json"
        // "<" is escaped so profile text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingSchema(b, lowest)).replace(/</g, "\\u003c") }}
      />
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#fbfaf7]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="font-display text-xl font-semibold tracking-tight">{p.name}</a>
          <nav className="hidden items-center gap-7 text-sm text-ink-soft md:flex" aria-label="Sections">
            {p.rooms.length > 0 && <a href="#rooms" className="hover:text-ink">Rooms</a>}
            {p.amenities.length > 0 && <a href="#amenities" className="hover:text-ink">Amenities</a>}
            <a href="#location" className="hover:text-ink">Location</a>
            {p.faqs.length > 0 && <a href="#faq" className="hover:text-ink">FAQ</a>}
          </nav>
          {p.whatsapp ? (
            <a href={wa(`Hi ${p.name}, I'd like to ask about a stay.`)} target="_blank" rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
              style={{ background: p.brandColor, color: fg }}>
              <MessageCircle className="h-4 w-4" aria-hidden /> Book now
            </a>
          ) : p.bookingUrl ? (
            <a href={p.bookingUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium" style={{ background: p.brandColor, color: fg }}>Book now</a>
          ) : null}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="scroll-mt-16 focus:outline-none">
        <span id="top" />
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          {p.heroImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.heroImageUrl} alt="" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
            </>
          ) : (
            <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(120% 120% at 0% 0%, ${p.brandColor} 0%, ${p.brandColor}dd 45%, #1c1b18 100%)` }} />
          )}
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 text-white sm:px-6 sm:pb-28 sm:pt-40">
            {p.city && <p className="animate-rise mb-4 flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4" aria-hidden />{p.city}</p>}
            <h1 className="animate-rise max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "50ms" }}>
              {p.name}
            </h1>
            {p.tagline && <p className="animate-rise mt-5 max-w-xl text-lg text-white/85" style={{ animationDelay: "100ms" }}>{p.tagline}</p>}
            <div className="animate-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "150ms" }}>
              {p.rooms.length > 0 && (
                <a href="#rooms" className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">
                  See rooms{lowest !== null && ` from ${money(p.currency, lowest)}`}
                </a>
              )}
              <span className="text-sm text-white/75">Questions? Our assistant answers instantly, bottom right.</span>
            </div>
          </div>
        </section>

        {p.about && (
          <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <p className="font-display text-2xl leading-relaxed text-ink sm:text-3xl">{p.about}</p>
          </section>
        )}

        {p.rooms.length > 0 && (
          <section id="rooms" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
            <SectionTitle eyebrow="Stay" title="Rooms & rates" color={p.brandColor} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {p.rooms.map((r) => (
                <article key={r.name} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-lg">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt={`${r.name} at ${p.name}`} loading="lazy" decoding="async" width={800} height={600} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center" style={{ background: `${p.brandColor}14` }}>
                      <BedDouble className="h-10 w-10" style={{ color: p.brandColor }} aria-hidden />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl font-semibold">{r.name}</h3>
                      <p className="shrink-0 text-right">
                        <span className="font-semibold">{money(p.currency, r.rate)}</span>
                        <span className="block text-xs text-muted">per night</span>
                      </p>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft"><Users className="h-4 w-4" aria-hidden /> Sleeps {r.sleeps}</p>
                    {r.description && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{r.description}</p>}
                    {p.whatsapp && (
                      <a href={wa(`Hi ${p.name}, I'm interested in the ${r.name}. My dates are: `)} target="_blank" rel="noreferrer"
                        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-medium transition-colors"
                        style={{ border: `1.5px solid ${p.brandColor}`, color: p.brandColor }}>
                        Ask about this room
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(p.amenities.length > 0 || p.policies.length > 0) && (
          <section id="amenities" className="scroll-mt-20 bg-white py-16">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
              {p.amenities.length > 0 && (
                <div>
                  <SectionTitle eyebrow="Comfort" title="Amenities" color={p.brandColor} />
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {p.amenities.map((a) => (
                      <li key={a} className="flex items-start gap-3 text-ink-soft">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: `${p.brandColor}1f`, color: p.brandColor }}>
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <SectionTitle eyebrow="Good to know" title="Policies" color={p.brandColor} />
                <p className="mb-4 flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4" aria-hidden /> Check-in from {p.checkIn} · Check-out by {p.checkOut}</p>
                <ul className="space-y-2 text-sm leading-relaxed text-ink-soft">
                  {p.policies.map((x) => <li key={x} className="border-l-2 pl-3" style={{ borderColor: `${p.brandColor}55` }}>{x}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section id="location" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <SectionTitle eyebrow="Find us" title="Location & contact" color={p.brandColor} />
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="flex items-start gap-2 font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{[p.address, p.city].filter(Boolean).join(", ") || "Ask us for directions"}</p>
              {p.directions && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.directions}</p>}
              {p.mapUrl && <a href={p.mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-medium underline underline-offset-4" style={{ color: p.brandColor }}>Open in Google Maps</a>}
            </div>
            <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 text-sm">
              {p.whatsapp && <a href={wa(`Hi ${p.name}`)} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp +{p.whatsapp}</a>}
              {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 hover:underline"><Phone className="h-4 w-4" aria-hidden /> {p.phone}</a>}
              {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-3 hover:underline"><Mail className="h-4 w-4" aria-hidden /> {p.email}</a>}
              {!p.whatsapp && !p.phone && !p.email && <p className="text-ink-soft">Use the chat to reach us.</p>}
            </div>
          </div>
        </section>

        {p.faqs.length > 0 && (
          <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 pt-8 sm:px-6">
            <SectionTitle eyebrow="Questions" title="FAQ" color={p.brandColor} />
            <div className="divide-y divide-black/10 rounded-3xl bg-white px-6 shadow-sm ring-1 ring-black/5">
              {p.faqs.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="text-xl transition-transform group-open:rotate-45" style={{ color: p.brandColor }} aria-hidden>+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-black/5 py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} {p.name} · Assistant by StayDesk
      </footer>

      <ChatWidget slug={b.slug} name={p.name} brandColor={p.brandColor} greeting={p.greeting} whatsapp={p.whatsapp} />
    </div>
  );
}

function SectionTitle({ eyebrow, title, color }: { eyebrow: string; title: string; color: string }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color }}>{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}

/** schema.org LodgingBusiness: lets search engines show name, location,
 *  contact and price range. Only facts the owner entered are included. */
function lodgingSchema(b: Business, lowest: number | null) {
  const p = b.profile;
  const url = `${baseUrl()}/${b.slug}`;
  const highest = p.rooms.length ? Math.max(...p.rooms.map((r) => r.rate)) : null;
  const clean = (o: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)));
  return clean({
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": url,
    url,
    name: p.name,
    description: p.tagline || p.about || undefined,
    image: p.heroImageUrl || `${url}/opengraph-image`,
    telephone: p.phone || (p.whatsapp ? `+${p.whatsapp}` : undefined),
    email: p.email || undefined,
    address: p.address || p.city
      ? clean({ "@type": "PostalAddress", streetAddress: p.address || undefined, addressLocality: p.city || undefined })
      : undefined,
    hasMap: p.mapUrl || undefined,
    checkinTime: p.checkIn || undefined,
    checkoutTime: p.checkOut || undefined,
    priceRange: lowest !== null ? `${money(p.currency, lowest)}–${money(p.currency, highest ?? lowest)} per night` : undefined,
    amenityFeature: p.amenities.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
  });
}
