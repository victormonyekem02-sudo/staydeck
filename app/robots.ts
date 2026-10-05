import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/format";

/** /robots.txt — business sites are public; admin, API and the chat embed are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/embed/"] },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
