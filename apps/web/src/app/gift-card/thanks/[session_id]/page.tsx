import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

export default async function GiftCardThanks({
  params,
  searchParams,
}: {
  params: Promise<{ session_id: string }>
  searchParams: Promise<{ tenant?: string }>
}) {
  const { session_id } = await params
  const sp = await searchParams

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h1 style={{ margin: '20px 0 12px', fontSize: 32, fontWeight: 700, color: '#111827' }}>
          Acquisto completato
        </h1>
        <p style={{ color: '#4b5563', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
          Stiamo emettendo la gift card. Il destinatario riceverà un'email con il link alla sua gift card
          entro pochi minuti. Anche tu riceverai una ricevuta dell'acquisto nella tua casella email.
        </p>
        <div
          style={{
            padding: 16,
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            textAlign: 'left',
            marginBottom: 24,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>
            Ricevuta
          </p>
          <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 13, color: '#111827' }}>
            {session_id}
          </p>
        </div>
        {sp.tenant && (
          <Link
            href={`/gift-card/buy/${sp.tenant}`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#0f172a',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Regala un'altra gift card
          </Link>
        )}
      </div>
    </div>
  )
}
