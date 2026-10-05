import { MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/admin-shell";
import { FilterBar } from "@/components/filter-bar";
import { requireAdminPage } from "@/lib/auth";
import { listBusinesses, listConversations } from "@/lib/db";
import { estimateCostUsd, shortDate, usd } from "@/lib/format";

export default async function ConversationsPage({
  searchParams,
}: { searchParams: Promise<{ business?: string; id?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const [businesses, conversations] = await Promise.all([
    listBusinesses(),
    listConversations({ businessId: sp.business || undefined, limit: 200 }),
  ]);

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every chat transcript. Read these to check the AI's answers and to show prospects real results."
      />
      <FilterBar businesses={businesses.map((b) => ({ id: b.id, name: b.profile.name }))} />

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
          <MessagesSquare className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden />
          <p className="font-medium">No conversations yet</p>
          <p className="mt-1 text-sm text-ink-soft">Open a business website and say hello to the chat to test it.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const first = c.messages.find((m) => m.role === "user")?.content ?? "";
            const turns = c.messages.filter((m) => m.role === "user").length;
            return (
              <details
                key={c.id}
                id={c.id}
                open={sp.id === c.id}
                className="group rounded-2xl border border-line bg-card open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-xs text-muted">{shortDate(c.updatedAt)}</span>
                  <span className="text-sm text-ink-soft">{c.businessName ?? "—"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">“{first}”</span>
                  <span className="text-xs text-muted">{turns} msg · {usd(estimateCostUsd(c.inputTokens, c.outputTokens))}</span>
                  {c.leadCaptured && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Inquiry</span>}
                </summary>
                <div className="space-y-3 border-t border-line px-5 py-4">
                  {c.messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                      <p
                        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                          m.role === "user" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-paper"
                        }`}
                      >
                        {m.content}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
