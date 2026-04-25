import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ConsentModeScript } from "@/components/consent/ConsentModeScript";
import { GlobalSchemaLd } from "@/components/seo/GlobalSchemaLd";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { WebVitalsCollector } from "@/components/perf/WebVitalsCollector";
import { CookieBannerWrapper } from "@touracore/hospitality/src/components/compliance/cookie-banner-wrapper";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { SeoVerification } from "@/components/seo/SeoVerification";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TouraCore",
  description: "Piattaforma multi-verticale per il turismo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable}>
      <head>
        <ConsentModeScript />
        <GlobalSchemaLd />
        <SeoVerification />
      </head>
      <body className="font-sans">
        <SkipToContent />
        {children}
        <WebVitalsCollector />
        <CookieBannerWrapper />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
