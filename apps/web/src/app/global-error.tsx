'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[GlobalError]', error.digest ?? 'no-digest')
    } else {
      console.error('[GlobalError]', error)
    }
  }, [error])

  return (
    <html lang="it">
      <body style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        background: '#faf6f0',
        color: '#2a1f17',
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: 480,
          padding: '32px 28px',
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e8dccc',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 12, color: '#c45a3a' }}>
            Errore inatteso
          </h1>
          <p style={{ color: '#5b4a3f', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 20 }}>
            Qualcosa è andato storto. Il team è stato notificato.
            {error.digest && (
              <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: '0.78rem', color: '#888' }}>
                ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#c45a3a',
              color: '#fff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 6,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Riprova
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error gira fuori dal layout root, Link non disponibile */}
          <a
            href="/"
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
            Torna alla home
          </a>
        </div>
      </body>
    </html>
  )
}
