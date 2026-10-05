"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, Inbox, LayoutDashboard, LogOut, Menu, MessagesSquare, Plus, X } from "lucide-react";
import { ToastProvider, cn } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/leads", label: "Booking inquiries", icon: Inbox },
  { href: "/admin/conversations", label: "Conversations", icon: MessagesSquare },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
              active ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-black/5 hover:text-ink"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

async function logout() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/admin" className="flex items-center gap-2 px-2" onClick={onNavigate}>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-display text-lg font-bold text-white">S</span>
        <span className="font-display text-xl font-semibold tracking-tight">StayDesk</span>
      </Link>
      <Link
        href="/admin/businesses/new"
        onClick={onNavigate}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#173b2c]"
      >
        <Plus className="h-4 w-4" aria-hidden /> New business
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-black/5 hover:text-ink cursor-pointer"
      >
        <LogOut className="h-4 w-4" aria-hidden /> Sign out
      </button>
    </div>
  );

  return (
    <ToastProvider>
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-line bg-card lg:block">{sidebar()}</aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur lg:hidden">
          <span className="font-display text-lg font-semibold">StayDesk</span>
          <button aria-label="Open menu" className="rounded-lg p-2 hover:bg-black/5" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
            <div className="animate-rise absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
              <button
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-2 hover:bg-black/5"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar(() => setOpen(false))}
            </div>
          </div>
        )}

        <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-6 focus:outline-none sm:px-8 sm:py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
