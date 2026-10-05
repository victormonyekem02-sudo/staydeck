import type { MetadataRoute } from "next";
import { listBusinesses } from "@/lib/db";
import { baseUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

/** /sitemap.xml — the home page plus every live business site (paused ones are left out). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const businesses = await listBusinesses();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 0.5 },
    ...businesses
      .filter((b) => b.active)
      .map((b) => ({
        url: `${base}/${b.slug}`,
        lastModified: new Date(b.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 1,
      })),
  ];
}
