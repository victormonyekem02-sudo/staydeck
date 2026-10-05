import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { baseUrl } from "@/lib/format";
import "./globals.css";

/* Self-hosted at build time by next/font: no render-blocking request to
 * Google on page load, and fallback metrics are adjusted so text doesn't
 * jump when the font arrives (better LCP and CLS than a CSS @import). */
const display = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: { default: "StayDesk", template: "%s · StayDesk" },
  description: "AI front desk and websites for guest houses and lodges.",
  alternates: { canonical: "/" },
  // Search Console "HTML tag" verification; set the token in the env.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
