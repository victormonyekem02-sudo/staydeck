import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  async headers() {
    return [
      // Everything except the embeddable chat may not be framed by other sites.
      {
        source: "/((?!embed).*)",
        headers: [...securityHeaders, { key: "X-Frame-Options", value: "DENY" }],
      },
      // The embed page is meant to live inside a lodge's own website.
      {
        source: "/embed/:path*",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/widget.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
    ];
  },
};

export default nextConfig;
