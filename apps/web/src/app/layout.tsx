import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
