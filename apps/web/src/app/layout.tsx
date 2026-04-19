import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ConsentModeScript } from "@/components/consent/ConsentModeScript";
import { GlobalSchemaLd } from "@/components/seo/GlobalSchemaLd";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { WebVitalsCollector } from "@/components/perf/WebVitalsCollector";

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
    <html lang="it">
      <head>
        <ConsentModeScript />
        <GlobalSchemaLd />
      </head>
      <body>
        <SkipToContent />
        {children}
        <WebVitalsCollector />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
