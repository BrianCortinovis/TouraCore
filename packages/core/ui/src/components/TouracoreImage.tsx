'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { decode as decodeBlurhash } from 'blurhash'
import { cn } from '../lib/cn'

type VariantKey = 'thumb' | 'card' | 'hero' | 'full'
type Format = 'webp' | 'avif' | 'jpeg'

interface Variant {
  url: string
  format: Format
  width: number
  height: number
  size_bytes: number
}

type VariantSet = Partial<Record<VariantKey, Partial<Record<Format, Variant>>>>

export interface TouracoreImageProps {
  src: string // fallback URL (master)
  alt: string
  variants?: VariantSet | null
  blurhash?: string | null
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
  sizes?: string
  priority?: boolean
  fill?: boolean
  objectFit?: 'cover' | 'contain'
  preferredTier?: VariantKey
}

const TIER_WIDTHS: Record<VariantKey, number> = {
  thumb: 320,
  card: 640,
  hero: 1280,
  full: 2560,
}

// Build srcset for one format, sorted ascending width
function buildSrcSet(variants: VariantSet, format: Format): string {
  const entries: string[] = []
  const tiers: VariantKey[] = ['thumb', 'card', 'hero', 'full']
  for (const t of tiers) {
    const v = variants[t]?.[format]
    if (v) entries.push(`${v.url} ${v.width}w`)
  }
  return entries.join(', ')
}

function pickFallback(
  variants: VariantSet,
  preferredTier: VariantKey
): string | null {
  const order: VariantKey[] = [preferredTier, 'card', 'hero', 'full', 'thumb']
  for (const t of order) {
    const v = variants[t]?.webp ?? variants[t]?.jpeg
    if (v) return v.url
  }
  return null
}

// Decode blurhash → data URL canvas
function useBlurhashDataUrl(hash: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!hash) {
      setUrl(null)
      return
    }
    try {
      const pixels = decodeBlurhash(hash, 32, 32)
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const imageData = ctx.createImageData(32, 32)
      imageData.data.set(pixels)
      ctx.putImageData(imageData, 0, 0)
      setUrl(canvas.toDataURL())
    } catch {
      setUrl(null)
    }
  }, [hash])

  return url
}

export function TouracoreImage({
  src,
  alt,
  variants,
  blurhash,
  width,
  height,
  className,
  style,
  sizes = '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw',
  priority = false,
  fill = false,
  objectFit = 'cover',
  preferredTier = 'card',
}: TouracoreImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const blurUrl = useBlurhashDataUrl(blurhash)

  useEffect(() => {
    // Handle cache-hit case: image may be complete before onLoad fires
    if (imgRef.current?.complete) setLoaded(true)
  }, [])

  const hasVariants = variants && Object.keys(variants).length > 0
  const fallbackSrc = hasVariants
    ? pickFallback(variants, preferredTier) ?? src
    : src

  const wrapperStyle: CSSProperties = {
    ...style,
    ...(fill
      ? { position: 'absolute', inset: 0 }
      : { width, height }),
    backgroundImage: !loaded && blurUrl ? `url(${blurUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  const imgStyle: CSSProperties = {
    objectFit,
    opacity: loaded ? 1 : 0,
    transition: 'opacity 300ms ease-out',
  }

  const pictureClass = fill ? 'absolute inset-0 w-full h-full' : ''
  const imgClass = cn(
    fill ? 'w-full h-full' : '',
    className
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100',
        !fill && 'inline-block'
      )}
      style={wrapperStyle}
    >
      <picture className={pictureClass}>
        {hasVariants && (
          <>
            <source
              type="image/avif"
              srcSet={buildSrcSet(variants, 'avif')}
              sizes={sizes}
            />
            <source
              type="image/webp"
              srcSet={buildSrcSet(variants, 'webp')}
              sizes={sizes}
            />
            <source
              type="image/jpeg"
              srcSet={buildSrcSet(variants, 'jpeg')}
              sizes={sizes}
            />
          </>
        )}
        <img
          ref={imgRef}
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          className={imgClass}
          style={imgStyle}
        />
      </picture>
    </div>
  )
}
