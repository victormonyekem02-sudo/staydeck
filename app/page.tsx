import Link from "next/link";
import { Bot, Globe, Inbox } from "lucide-react";

export const metadata = { title: { absolute: "StayDesk · AI front desk for guest houses" } };

const FEATURES = [
  { icon: Bot, title: "Answers guests instantly", body: "Rates, rooms, directions and policies, day or night, from facts you control." },
  { icon: Inbox, title: "Never miss an inquiry", body: "Guests who want to book are captured with dates and contact details, then sent to you." },
  { icon: Globe, title: "A website included", body: "A clean, mobile-first site for your property, or add the chat to the site you already have." },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <span className="font-display text-xl font-semibold">StayDesk</span>
        <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">Sign in</Link>
      </header>
      <section className="py-20 sm:py-28">
        <p className="animate-rise mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">For lodges and guest houses</p>
        <h1 className="animate-rise max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl" style={{ animationDelay: "50ms" }}>
          A front desk that never sleeps.
        </h1>
        <p className="animate-rise mt-6 max-w-xl text-lg text-ink-soft" style={{ animationDelay: "100ms" }}>
          StayDesk answers your guests’ questions and turns interest into booking inquiries, so no message goes unanswered.
        </p>
      </section>
      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="animate-rise rounded-2xl border border-line bg-card p-6" style={{ animationDelay: `${150 + i * 50}ms` }}>
            <Icon className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="mt-4 font-medium">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
