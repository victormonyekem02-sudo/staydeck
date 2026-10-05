"use client";

import Link from "next/link";
import { useState } from "react";
import { Inbox, MessageCircle, Trash2 } from "lucide-react";
import { Button, api, cn, useToast } from "./ui";
import { shortDate } from "@/lib/format";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";

const tone: Record<LeadStatus, string> = {
  new: "bg-info-soft text-info",
  contacted: "bg-warn-soft text-warn",
  booked: "bg-accent-soft text-accent",
  lost: "bg-paper text-muted",
};

function contactHref(c: string): string | null {
  if (c.includes("@")) return `mailto:${c}`;
  const digits = c.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function LeadsTable({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const toast = useToast();

  async function setStatus(id: string, status: LeadStatus) {
    const prev = leads;
    setLeads((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await api(`/api/admin/leads/${id}`, { method: "PATCH", json: { status } });
    } catch (err) {
      setLeads(prev);
      toast("error", (err as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this inquiry?")) return;
    try {
      await api(`/api/admin/leads/${id}`, { method: "DELETE" });
      setLeads((l) => l.filter((x) => x.id !== id));
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
        <Inbox className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden />
        <p className="font-medium">No inquiries yet</p>
        <p className="mt-1 text-sm text-ink-soft">When a guest asks to book in the chat, it shows up here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-paper text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Stay</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leads.map((l) => {
              const href = contactHref(l.contact);
              return (
                <tr key={l.id} className="align-top transition-colors hover:bg-paper/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-soft">{shortDate(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.guestName || "Unnamed guest"}</p>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">{l.contact}</a>
                    ) : (
                      <span className="text-ink-soft">{l.contact || "No contact"}</span>
                    )}
                    {l.notes && <p className="mt-1 max-w-xs text-xs text-muted">{l.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    <p>{[l.checkIn, l.checkOut].filter(Boolean).join(" → ") || "Dates TBC"}</p>
                    <p className="text-xs text-muted">
                      {[l.guests ? `${l.guests} guest${l.guests > 1 ? "s" : ""}` : "", l.roomPreference].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{l.businessName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Inquiry status"
                      value={l.status}
                      onChange={(e) => setStatus(l.id, e.target.value as LeadStatus)}
                      className={cn("cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:ring-2 focus:ring-accent/30", tone[l.status])}
                    >
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {l.conversationId && (
                        <Link href={`/admin/conversations?id=${l.conversationId}`} className="rounded-md p-2 text-muted hover:bg-black/5 hover:text-ink" aria-label="View conversation">
                          <MessageCircle className="h-4 w-4" />
                        </Link>
                      )}
                      <Button variant="ghost" size="icon" aria-label="Delete inquiry" onClick={() => remove(l.id)} className="hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
