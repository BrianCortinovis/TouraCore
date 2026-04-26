import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Pagina non trovata · TouraCore',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      background: '#faf6f0',
      color: '#2a1f17',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{
        maxWidth: 480,
        padding: '32px 28px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e8dccc',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '4rem', fontWeight: 700, color: '#c45a3a', lineHeight: 1, marginBottom: 8 }}>
          404
        </div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 12 }}>Pagina non trovata</h1>
        <p style={{ color: '#5b4a3f', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 20 }}>
          La risorsa richiesta non esiste o è stata spostata.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#c45a3a',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Torna alla home
        </Link>
        <Link
          href="/discover"
          style={{
            display: 'inline-block',
            marginLeft: 12,
            color: '#5b4a3f',
            fontSize: '0.9rem',
            textDecoration: 'none',
            padding: '10px 22px',
            border: '1px solid #e8dccc',
            borderRadius: 6,
          }}
        >
          Scopri strutture
        </Link>
      </div>
    </main>
  )
}
