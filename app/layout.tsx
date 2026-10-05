import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "StayDesk", template: "%s · StayDesk" },
  description: "AI front desk and websites for guest houses and lodges.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
