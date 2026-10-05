"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Sign-in failed.");
    setLoading(false);
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="animate-rise w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">StayDesk</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to manage your businesses</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <Field label="Admin password" htmlFor="password" error={error}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
            />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
