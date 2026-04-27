import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Prenota — TouraCore',
    template: '%s · Prenota — TouraCore',
  },
  description: 'Prenotazione online con conferma immediata. Pagamento sicuro Stripe, cancellazione gratuita.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Prenota — TouraCore',
    description: 'Prenotazione online con conferma immediata.',
    type: 'website',
  },
  twitter: { card: 'summary' },
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children
}
