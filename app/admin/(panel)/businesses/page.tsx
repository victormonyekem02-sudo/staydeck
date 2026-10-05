import Link from "next/link";
import { Copy, ExternalLink, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { listBusinesses } from "@/lib/db";

export default async function BusinessesPage() {
  await requireAdminPage();
  const businesses = await listBusinesses();

  return (
    <>
      <PageHeader
        title="Businesses"
        description="Each business gets its own website, AI receptionist and embed code."
        actions={
          <Link href="/admin/businesses/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-sm hover:bg-[#173b2c]">
            <Plus className="h-4 w-4" aria-hidden /> New business
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {businesses.map((b, i) => (
          <article
            key={b.id}
            className="animate-rise group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <div className="h-2" style={{ background: b.profile.brandColor }} aria-hidden />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-semibold leading-tight">{b.profile.name}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${b.active ? "bg-accent-soft text-accent" : "bg-paper text-muted border border-line"}`}>
                  {b.active ? "Live" : "Paused"}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted">/{b.slug}</p>
              <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{b.profile.tagline || "No tagline yet."}</p>
              <p className="mt-3 text-xs text-muted">
                {b.profile.rooms.length} rooms · {b.profile.faqs.length} FAQs · {b.profile.city || "No city"}
              </p>
              <div className="mt-5 flex gap-2 border-t border-line pt-4">
                <Link href={`/admin/businesses/${b.id}`} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-[#173b2c]">
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </Link>
                <Link href={`/admin/businesses/new?from=${b.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm hover:bg-paper" title="Use as a template for a new business">
                  <Copy className="h-3.5 w-3.5" aria-hidden /> Clone
                </Link>
                <Link href={`/${b.slug}`} target="_blank" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong hover:bg-paper" aria-label="Open website">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
