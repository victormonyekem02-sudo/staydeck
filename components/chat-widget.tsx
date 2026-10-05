"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { onColor } from "@/lib/color";

type Msg = { role: "user" | "assistant"; content: string };

export type ChatWidgetProps = {
  slug: string;
  name: string;
  brandColor: string;
  greeting: string;
  whatsapp: string;
  /** floating = launcher button + panel; inline = fills its container. */
  mode?: "floating" | "inline";
};

const SUGGESTIONS = ["What are your rates?", "How do I get there?", "I'd like to book a room"];

export function ChatWidget({ slug, name, brandColor, greeting, whatsapp, mode = "floating" }: ChatWidgetProps) {
  const [open, setOpen] = useState(mode === "inline");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const storeKey = `staydesk:${slug}`;
  const fg = onColor(brandColor);

  // Restore the conversation within this browser tab.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (raw) {
        const s = JSON.parse(raw) as { convId: string | null; messages: Msg[] };
        setConvId(s.convId);
        setMessages(s.messages);
      }
    } catch { /* storage unavailable */ }
  }, [storeKey]);

  useEffect(() => {
    try { sessionStorage.setItem(storeKey, JSON.stringify({ convId, messages })); } catch { /* ignore */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, convId, storeKey]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: content }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.conversationId) setConvId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || data.error || "Sorry, something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Connection problem. Please try again." }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const panel = (
    <div
      className={
        mode === "inline"
          ? "flex h-full w-full flex-col bg-white"
          : "animate-rise fixed bottom-24 right-4 z-50 flex h-[min(600px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
      }
      role="dialog"
      aria-label={`Chat with ${name}`}
    >
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: brandColor, color: fg }}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 font-display text-lg font-semibold">
          {name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs opacity-80">Usually replies instantly</p>
        </div>
        {mode === "floating" && (
          <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1.5 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#faf9f6] px-4 py-4" aria-live="polite">
        <Bubble role="assistant" brand={brandColor} fg={fg}>
          {greeting || `Hi! Ask me anything about ${name}.`}
        </Bubble>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} brand={brandColor} fg={fg}>{m.content}</Bubble>
        ))}
        {busy && (
          <div className="typing flex w-16 gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm" aria-label="Typing">
            <span className="h-2 w-2 rounded-full bg-black/40" /><span className="h-2 w-2 rounded-full bg-black/40" /><span className="h-2 w-2 rounded-full bg-black/40" />
          </div>
        )}
        {messages.length === 0 && !busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border bg-white px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
                style={{ borderColor: brandColor, color: "#1c1b18" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-end gap-2 border-t border-black/10 bg-white p-3"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Type your message…"
          aria-label="Message"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-black/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-opacity disabled:opacity-40"
          style={{ background: brandColor, color: fg }}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="block bg-white pb-2 text-center text-xs text-black/50 hover:text-black/80"
        >
          Prefer a person? Message us on WhatsApp
        </a>
      )}
    </div>
  );

  if (mode === "inline") return panel;

  return (
    <>
      {open && panel}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : `Chat with ${name}`}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full shadow-xl transition-transform duration-150 hover:scale-105"
        style={{ background: brandColor, color: fg }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

function Bubble({ role, brand, fg, children }: { role: Msg["role"]; brand: string; fg: string; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex"}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
          mine ? "rounded-br-sm" : "rounded-bl-sm bg-white text-[#1c1b18]"
        }`}
        style={mine ? { background: brand, color: fg } : undefined}
      >
        {children}
      </p>
    </div>
  );
}
