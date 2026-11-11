import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Apple devices use SF (system font). Everywhere else gets Geist, self-hosted at build time,
// instead of a generic fallback like Segoe UI.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: "Tallow & Pine Help",
  description:
    "Support chat that answers only from the store's policies and shows its sources. A demo with fictional sample data.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#07080b" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
