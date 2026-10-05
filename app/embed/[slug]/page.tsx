import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";
import { getBusinessBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Chat-only page, loaded in an iframe by widget.js and the admin preview. */
export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBusinessBySlug((await params).slug);
  if (!b || !b.active) notFound();
  const p = b.profile;
  return (
    <div className="h-dvh">
      <ChatWidget mode="inline" slug={b.slug} name={p.name} brandColor={p.brandColor} greeting={p.greeting} whatsapp={p.whatsapp} />
    </div>
  );
}
