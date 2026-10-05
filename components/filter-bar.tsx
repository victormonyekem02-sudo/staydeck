"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "./ui";

export function FilterBar({ businesses, statuses }: { businesses: { id: string; name: string }[]; statuses?: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${path}${next.size ? `?${next}` : ""}`);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select aria-label="Filter by business" className="w-auto min-w-48" value={params.get("business") ?? ""} onChange={(e) => setParam("business", e.target.value)}>
        <option value="">All businesses</option>
        {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
      {statuses && (
        <Select aria-label="Filter by status" className="w-auto min-w-36" value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
      )}
    </div>
  );
}
