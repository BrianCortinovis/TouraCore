import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Widget embed',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children
}
