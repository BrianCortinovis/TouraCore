import { ImageResponse } from 'next/og'
import { resolvePolicySlug } from '@/lib/policy-alias'
import { BRAND_CONFIG } from '@/config/brand'

export const runtime = 'edge'
export const alt = 'TouraCore Legal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TITLES: Record<string, string> = {
  privacy: 'Privacy Policy',
  cookie: 'Cookie Policy',
  terms: 'Termini e Condizioni',
  dpa: 'Data Processing Agreement',
}

export default async function Image({ params }: { params: { policy: string } }) {
  const policy = resolvePolicySlug(params.policy)
  const title = policy ? TITLES[policy] ?? policy : 'Legale'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{BRAND_CONFIG.brand}</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 28, color: '#94a3b8', marginBottom: 16 }}>Legale</div>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 24, color: '#64748b' }}>
            Ultimo aggiornamento: {BRAND_CONFIG.last_updated}
          </div>
          <div style={{ fontSize: 24, color: '#3b82f6', fontWeight: 600 }}>
            {BRAND_CONFIG.brand.toLowerCase()}.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
