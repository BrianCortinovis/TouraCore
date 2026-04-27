import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Widget',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return children
}
