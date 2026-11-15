import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { OfflineBanner, Toaster } from "@/components/ui/client";
import { SITE_URL } from "@/lib/env";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DevBridge — l'échange de compétences entre développeurs africains",
    template: "%s · DevBridge",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "développeurs africains", "échange de compétences", "collaboration", "mentorat",
    "Flutter", "Python", "React", "CADEV 2026",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.name,
    title: "DevBridge — les bonnes compétences méritent de se rencontrer",
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "DevBridge",
    description: site.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#101B36",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          Aller au contenu
        </a>
        <OfflineBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
