import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { dailySeries, listBusinesses, statsSince } from "@/lib/db";
import { estimateCostUsd, startOfMonthIso, usd } from "@/lib/format";

export default async function Dashboard() {
  await requireAdminPage();
  const [businesses, stats, series] = await Promise.all([
    listBusinesses(),
    statsSince(startOfMonthIso()),
    dailySeries(14),
  ]);

  const totals = Object.values(stats).reduce(
    (a, s) => ({
      conversations: a.conversations + s.conversations,
      leads: a.leads + s.leads,
      booked: a.booked + s.booked,
      inputTokens: a.inputTokens + s.inputTokens,
      outputTokens: a.outputTokens + s.outputTokens,
    }),
    { conversations: 0, leads: 0, booked: 0, inputTokens: 0, outputTokens: 0 }
  );
  const cost = estimateCostUsd(totals.inputTokens, totals.outputTokens);
  const rate = totals.conversations ? totals.leads / totals.conversations : null;
  const month = new Date().toLocaleString("en-GB", { month: "long", timeZone: "Africa/Johannesburg" });

  const kpis = [
    { label: "Conversations", value: totals.conversations.toLocaleString() },
    { label: "Booking inquiries", value: totals.leads.toLocaleString() },
    {
      label: "Inquiry rate",
      value: rate === null ? "—" : `${(rate * 100).toFixed(1)}%`,
      note: totals.conversations > 0 && totals.conversations < 30 ? `n = ${totals.conversations}, small sample` : undefined,
    },
    { label: "Marked booked", value: totals.booked.toLocaleString() },
    { label: "Est. AI cost", value: usd(cost), note: "From token usage" },
  ];

  const max = Math.max(1, ...series.map((d) => d.conversations));

  return (
    <>
      <PageHeader title="Overview" description={`${month} so far, across ${businesses.length} businesses`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="animate-rise rounded-2xl border border-line bg-card p-4"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{k.label}</p>
            <p className="mt-2 font-mono text-2xl font-medium">{k.value}</p>
            {k.note && <p className="mt-1 text-xs text-muted">{k.note}</p>}
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-card p-5" aria-labelledby="trend">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="trend" className="font-medium">Last 14 days</h2>
          <div className="flex items-center gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-line-strong" />Conversations</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />Inquiries</span>
          </div>
        </div>
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Daily conversations and inquiries for the last 14 days">
          {series.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="relative w-full rounded-t bg-line-strong" style={{ height: `${(d.conversations / max) * 100}%`, minHeight: d.conversations ? 4 : 0 }}>
                <div className="absolute inset-x-0 bottom-0 rounded-t bg-accent" style={{ height: d.conversations ? `${(d.leads / d.conversations) * 100}%` : 0 }} />
              </div>
              <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-mono text-[11px] text-white group-hover:block">
                {d.date.slice(5)} · {d.conversations} / {d.leads}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
          <span>{series[0]?.date.slice(5)}</span>
          <span>{series[series.length - 1]?.date.slice(5)}</span>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-card" aria-labelledby="biz">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="biz" className="font-medium">Businesses this month</h2>
          <Link href="/admin/businesses" className="text-sm text-accent hover:underline">Manage</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Business</th>
                <th className="px-5 py-3 font-medium text-right">Chats</th>
                <th className="px-5 py-3 font-medium text-right">Inquiries</th>
                <th className="px-5 py-3 font-medium text-right">Rate</th>
                <th className="px-5 py-3 font-medium text-right">AI cost</th>
                <th className="px-5 py-3"><span className="sr-only">Links</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {businesses.map((b) => {
                const s = stats[b.id];
                const r = s?.conversations ? `${((s.leads / s.conversations) * 100).toFixed(0)}%` : "—";
                return (
                  <tr key={b.id} className="transition-colors hover:bg-paper/60">
                    <td className="px-5 py-3">
                      <Link href={`/admin/businesses/${b.id}`} className="flex items-center gap-3 font-medium hover:underline">
                        <span className="h-3 w-3 rounded-full" style={{ background: b.profile.brandColor }} aria-hidden />
                        {b.profile.name}
                        {!b.active && <span className="text-xs font-normal text-muted">(paused)</span>}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{s?.conversations ?? 0}</td>
                    <td className="px-5 py-3 text-right font-mono">{s?.leads ?? 0}</td>
                    <td className="px-5 py-3 text-right font-mono">{r}</td>
                    <td className="px-5 py-3 text-right font-mono">{usd(estimateCostUsd(s?.inputTokens ?? 0, s?.outputTokens ?? 0))}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/${b.slug}`} target="_blank" className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-ink" aria-label={`Open ${b.profile.name} website`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link href={`/admin/businesses/${b.id}`} className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-ink" aria-label={`Edit ${b.profile.name}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
