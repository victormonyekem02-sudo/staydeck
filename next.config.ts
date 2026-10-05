import type { NextConfig } from "next";

const prod = process.env.NODE_ENV === "production";

/* Content-Security-Policy. Limits where scripts, styles, fonts and frames
 * may come from (fonts are self-hosted by next/font), so injected markup can't load code from another host.
 * script-src keeps 'unsafe-inline' because Next.js streams inline scripts;
 * removing it needs per-request nonces (see README). Images may come from
 * any https host because profiles use externally hosted photos. */
const csp = (frameAncestors: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${prod ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' https: data:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Browsers only honour HSTS over HTTPS; skipped in dev so localhost isn't pinned.
  ...(prod ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  async headers() {
    return [
      // Everything except the embeddable chat may not be framed by other sites.
      {
        // "embed/" with the slash: a business slug like "embedded-lodge" must still get DENY.
        source: "/((?!embed/).*)",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp("'none'") },
        ],
      },
      // The embed page is meant to live inside a lodge's own website.
      {
        source: "/embed/:path*",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: csp("*") }],
      },
      {
        source: "/widget.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
    ];
  },
};

export default nextConfig;
