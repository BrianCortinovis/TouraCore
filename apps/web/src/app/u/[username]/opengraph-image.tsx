import { ImageResponse } from 'next/og'
import { createPublicClient } from '@/lib/supabase-public'
import { BRAND_CONFIG } from '@/config/brand'

export const runtime = 'nodejs'
export const alt = 'Profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Params {
  params: Promise<{ username: string }>
}

export default async function Image({ params }: Params) {
  const { username } = await params
  let displayName = username
  let bio: string | null = null
  let avatarUrl: string | null = null

  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('platform_profiles')
      .select('display_name, bio, avatar_url')
      .eq('username', username)
      .maybeSingle()
    if (data) {
      displayName = data.display_name ?? username
      bio = data.bio ?? null
      avatarUrl = data.avatar_url ?? null
    }
  } catch {
    // fallback
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%)',
          color: '#fff',
          padding: 80,
          fontFamily: 'system-ui, sans-serif',
          alignItems: 'center',
          gap: 60,
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 9999,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            border: '6px solid rgba(255,255,255,0.3)',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              width={260}
              height={260}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: 120, fontWeight: 800 }}>
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: 28, color: '#c7d2fe', marginBottom: 8 }}>@{username}</div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>
            {displayName}
          </div>
          {bio && (
            <div
              style={{
                fontSize: 28,
                marginTop: 24,
                color: 'rgba(255,255,255,0.85)',
                maxWidth: 640,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bio}
            </div>
          )}
          <div style={{ fontSize: 24, color: '#a5b4fc', marginTop: 40 }}>
            {BRAND_CONFIG.brand}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
