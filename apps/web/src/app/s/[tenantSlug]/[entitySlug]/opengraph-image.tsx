import { ImageResponse } from 'next/og'
import { createPublicClient } from '@/lib/supabase-public'
import { BRAND_CONFIG } from '@/config/brand'

export const runtime = 'nodejs'
export const alt = 'Listing preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Params {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

const KIND_LABEL: Record<string, string> = {
  property: 'Hospitality',
  restaurant: 'Ristorante',
  bike_rental: 'Bike Rental',
  experience: 'Esperienza',
}

const KIND_GRADIENT: Record<string, string> = {
  property: 'linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)',
  restaurant: 'linear-gradient(135deg, #f59e0b 0%, #7c2d12 100%)',
  bike_rental: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
  experience: 'linear-gradient(135deg, #a855f7 0%, #4c1d95 100%)',
}

export default async function Image({ params }: Params) {
  const { tenantSlug, entitySlug } = await params
  let entityName = entitySlug
  let entityKind = 'property'
  let heroUrl: string | null = null
  let starRating: number | null = null
  let priceRange: string | null = null

  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('public_listings')
      .select('name, entity_kind, hero_url, stars, price_range_label')
      .eq('tenant_slug', tenantSlug)
      .eq('slug', entitySlug)
      .maybeSingle()
    if (data) {
      entityName = data.name ?? entityName
      entityKind = data.entity_kind ?? entityKind
      heroUrl = data.hero_url ?? null
      starRating = data.stars ?? null
      priceRange = data.price_range_label ?? null
    }
  } catch {
    // fallback baseline
  }

  const kindLabel = KIND_LABEL[entityKind] ?? entityKind
  const gradient = KIND_GRADIENT[entityKind] ?? KIND_GRADIENT.property

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: gradient,
          fontFamily: 'system-ui, sans-serif',
          color: '#fff',
        }}
      >
        {heroUrl && (
          <img
            src={heroUrl}
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
            }}
          />
        )}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: 80,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                fontSize: 22,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {kindLabel}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{BRAND_CONFIG.brand}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {starRating && (
              <div style={{ fontSize: 28 }}>
                {'★'.repeat(Math.round(starRating))}
              </div>
            )}
            <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, maxWidth: 960 }}>
              {entityName}
            </div>
            <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>
              {priceRange ?? 'Scopri disponibilità e prenota'}
            </div>
          </div>

          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>
            touracore.com/s/{tenantSlug}/{entitySlug}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
