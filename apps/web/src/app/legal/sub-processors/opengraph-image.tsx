import { ImageResponse } from 'next/og'
import { BRAND_CONFIG } from '@/config/brand'

export const runtime = 'edge'
export const alt = 'Sub-processor'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, color: '#94a3b8', marginBottom: 16 }}>
          {BRAND_CONFIG.brand} · Legale
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.1 }}>
          Elenco Sub-processor
        </div>
        <div style={{ fontSize: 28, color: '#64748b', marginTop: 24 }}>
          GDPR Art. 28 · Trasparenza trattamento dati
        </div>
      </div>
    ),
    { ...size }
  )
}
