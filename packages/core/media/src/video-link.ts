/**
 * Parse YouTube/Vimeo embed URL → { platform, id, thumbnail }
 *
 * Supporta:
 *  YouTube
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 *   - https://www.youtube.com/shorts/ID
 *   - https://youtube.com/watch?v=ID&t=42s
 *
 *  Vimeo
 *   - https://vimeo.com/ID
 *   - https://player.vimeo.com/video/ID
 *
 * Ritorna null se URL non riconosciuto o id vuoto.
 *
 * Nota: NON fa fetch oEmbed (network call). Caller decide se arricchire titolo.
 */

export type VideoPlatform = 'youtube' | 'vimeo'

export type ParsedVideoLink = {
  platform: VideoPlatform
  videoId: string
  thumbnailUrl: string
  embedUrl: string
}

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'])
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])

const YT_ID_RE = /^[A-Za-z0-9_-]{6,20}$/
const VIMEO_ID_RE = /^\d{5,15}$/

export function parseVideoLink(rawUrl: string): ParsedVideoLink | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()

  if (YT_HOSTS.has(host)) {
    let id: string | null = null

    if (host === 'youtu.be') {
      id = url.pathname.replace(/^\/+/, '').split('/')[0] ?? null
    } else if (url.pathname.startsWith('/watch')) {
      id = url.searchParams.get('v')
    } else if (url.pathname.startsWith('/embed/')) {
      id = url.pathname.split('/')[2] ?? null
    } else if (url.pathname.startsWith('/shorts/')) {
      id = url.pathname.split('/')[2] ?? null
    } else if (url.pathname.startsWith('/v/')) {
      id = url.pathname.split('/')[2] ?? null
    }

    if (!id || !YT_ID_RE.test(id)) return null
    return {
      platform: 'youtube',
      videoId: id,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    }
  }

  if (VIMEO_HOSTS.has(host)) {
    let id: string | null = null
    const parts = url.pathname.split('/').filter(Boolean)
    if (host === 'player.vimeo.com') {
      const i = parts.indexOf('video')
      if (i >= 0) id = parts[i + 1] ?? null
    } else {
      id = parts[0] ?? null
    }

    if (!id || !VIMEO_ID_RE.test(id)) return null
    return {
      platform: 'vimeo',
      videoId: id,
      thumbnailUrl: `https://vumbnail.com/${id}.jpg`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
    }
  }

  return null
}

/**
 * Fetch oEmbed per ottenere titolo (best-effort, ritorna null se fallisce).
 */
export async function fetchVideoTitle(parsed: ParsedVideoLink): Promise<string | null> {
  try {
    const oembedUrl =
      parsed.platform === 'youtube'
        ? `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.videoId}&format=json`
        : `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${parsed.videoId}`

    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null
    const json = (await res.json()) as { title?: string }
    return typeof json.title === 'string' && json.title.length > 0 ? json.title : null
  } catch {
    return null
  }
}
