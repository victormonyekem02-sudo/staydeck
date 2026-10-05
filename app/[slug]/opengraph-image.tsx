import { ImageResponse } from "next/og";
import { getBusinessBySlug } from "@/lib/db";
import { onColor } from "@/lib/color";
import { money } from "@/lib/format";

export const runtime = "nodejs";
export const alt = "Guest house";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* The preview card shown when a business link is shared on WhatsApp,
 * Facebook, etc. Drawn from the profile instead of fetching the hero photo,
 * so the server never downloads an arbitrary URL (no SSRF) and every
 * business gets a preview even without photos. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBusinessBySlug((await params).slug);
  const p = b?.profile;
  const bg = p?.brandColor ?? "#1f4d3a";
  const fg = onColor(bg);
  const lowest = p?.rooms.length ? Math.min(...p.rooms.map((r) => r.rate)) : null;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: bg, color: fg }}>
        <div style={{ fontSize: 30, opacity: 0.8, display: "flex" }}>{p?.city || "Guest house"}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>{p?.name ?? "StayDesk"}</div>
          {p?.tagline ? <div style={{ fontSize: 36, marginTop: 20, opacity: 0.85 }}>{p.tagline.slice(0, 90)}</div> : null}
        </div>
        <div style={{ fontSize: 30, display: "flex" }}>
          {lowest !== null && p ? `Rooms from ${money(p.currency, lowest)} per night · Ask our assistant 24/7` : "Ask our assistant 24/7"}
        </div>
      </div>
    ),
    size
  );
}
