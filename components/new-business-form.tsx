"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select, api } from "./ui";
import { slugify } from "@/lib/slug";
import type { Business } from "@/lib/types";

export function NewBusinessForm({ templates, defaultFrom }: { templates: { id: string; name: string }[]; defaultFrom?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [from, setFrom] = useState(defaultFrom ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { business } = await api<{ business: Business }>("/api/admin/businesses", {
        method: "POST",
        json: { name, slug: slugify(slug), ...(from ? { cloneFrom: from } : {}) },
      });
      router.push(`/admin/businesses/${business.id}?created=1`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl p-6">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Business name" htmlFor="name">
          <Input
            id="name"
            required
            autoFocus
            maxLength={100}
            value={name}
            placeholder="e.g. Mountain View Lodge"
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Web address" htmlFor="slug" hint={`Their site will be at /${slug || "your-slug"}`}>
          <div className="flex items-center rounded-lg border border-line-strong bg-paper focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <span className="pl-3 font-mono text-sm text-muted">/</span>
            <input
              id="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={48}
              className="h-10 w-full bg-transparent px-1 font-mono text-sm focus:outline-none"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value, { trim: false }));
              }}
              onBlur={() => setSlug(slugify(slug))}
            />
          </div>
        </Field>
        <Field label="Start from" htmlFor="from" hint="Cloning saves time when businesses are similar.">
          <Select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Blank business</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>Clone of {t.name}</option>
            ))}
          </Select>
        </Field>
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={loading}>Create business</Button>
        </div>
      </form>
    </Card>
  );
}
