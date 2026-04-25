import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'TouraCore — Piattaforma multi-verticale per il turismo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0ea5e9 100%)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            TouraCore
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            Piattaforma multi-verticale per il turismo italiano
          </div>
          <div
            style={{
              fontSize: 30,
              color: 'rgba(255,255,255,0.85)',
              maxWidth: 1040,
            }}
          >
            Hospitality · Ristorazione · Bike rental · Esperienze · Compliance Italia
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            fontSize: 22,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <span>Channel manager</span>
          <span>·</span>
          <span>Booking engine</span>
          <span>·</span>
          <span>CIN · Alloggiati Web · SDI</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
