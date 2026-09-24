import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, EB_Garamond, Noto_Serif_Myanmar } from "next/font/google";
import { getLang } from "@/lib/lang";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

// Large script font: not preloaded. Burmese phones fall back to their system
// Myanmar font for the first paint, then swap.
const myanmar = Noto_Serif_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600"],
  variable: "--font-my",
  display: "swap",
  preload: false,
});

// Share previews show the couple's names only — never the date or the venue.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Patrick & Ivy",
  description: "You are warmly invited.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    title: "Patrick & Ivy",
    description: "You are warmly invited.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Pink blossoms and gold linework" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Patrick & Ivy", description: "You are warmly invited." },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfaf5",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${myanmar.variable}`}>
      <body>{children}</body>
    </html>
  );
}
