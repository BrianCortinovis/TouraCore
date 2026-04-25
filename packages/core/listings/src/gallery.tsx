'use client'

import { useState, useEffect, useCallback, type FC } from 'react'
import { Image as ImageIcon, Play, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ListingPhoto } from './photos'

export type ListingGalleryProps = {
  photos: ListingPhoto[]
  heroFallbackUrl?: string | null
  entityName: string
}

type DisplayItem = {
  pivotId: string
  kind: 'photo' | 'video'
  url: string
  thumbUrl: string
  alt: string
  caption: string | null
  videoEmbedUrl: string | null
  videoPlatform: 'youtube' | 'vimeo' | null
}

function toDisplayItems(photos: ListingPhoto[], entityName: string): DisplayItem[] {
  return photos.map((p, idx) => {
    if (p.media_kind === 'video' && p.video_platform && p.video_id) {
      const embed =
        p.video_platform === 'youtube'
          ? `https://www.youtube-nocookie.com/embed/${p.video_id}?rel=0`
          : `https://player.vimeo.com/video/${p.video_id}`
      return {
        pivotId: p.id,
        kind: 'video',
        url: embed,
        thumbUrl: p.video_thumbnail_url ?? '',
        alt: p.alt_text ?? p.video_title ?? `${entityName} — video ${idx + 1}`,
        caption: p.caption,
        videoEmbedUrl: embed,
        videoPlatform: p.video_platform,
      }
    }
    return {
      pivotId: p.id,
      kind: 'photo',
      url: p.url,
      thumbUrl: p.url,
      alt: p.alt_text ?? `${entityName} — foto ${idx + 1}`,
      caption: p.caption,
      videoEmbedUrl: null,
      videoPlatform: null,
    }
  })
}

export const ListingGallery: FC<ListingGalleryProps> = ({ photos, heroFallbackUrl, entityName }) => {
  const sorted = [...photos].sort((a, b) =>
    a.is_hero === b.is_hero ? a.sort_order - b.sort_order : a.is_hero ? -1 : 1
  )
  const items = toDisplayItems(sorted, entityName)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const open = lightboxIndex !== null

  const close = useCallback(() => setLightboxIndex(null), [])
  const next = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % items.length)),
    [items.length]
  )
  const prev = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length)),
    [items.length]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, next, prev])

  const heroFallback = heroFallbackUrl ?? null
  if (items.length === 0 && !heroFallback) return null

  // Layout: hero grande sx + 4 thumb dx (2x2). >5 → "Vedi tutte (N)".
  const heroItem = items[0]
  const thumbs = items.slice(1, 5)
  const totalCount = items.length

  return (
    <>
      <section className="relative mb-8 grid grid-cols-1 gap-1 overflow-hidden rounded-xl md:grid-cols-4 md:grid-rows-2 md:h-[460px]">
        <button
          type="button"
          onClick={() => heroItem && setLightboxIndex(0)}
          className="group relative col-span-1 aspect-[16/10] overflow-hidden bg-[#e5e7eb] md:col-span-2 md:row-span-2 md:aspect-auto"
          aria-label={heroItem ? `Apri ${heroItem.alt}` : 'Galleria'}
        >
          {heroItem ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroItem.kind === 'video' ? heroItem.thumbUrl : heroItem.url}
                alt={heroItem.alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="eager"
              />
              {heroItem.kind === 'video' && <PlayBadge size="lg" />}
            </>
          ) : heroFallback ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroFallback} alt={`${entityName}`} className="h-full w-full object-cover" />
          ) : (
            <Placeholder />
          )}
        </button>

        {Array.from({ length: 4 }).map((_, i) => {
          const t = thumbs[i]
          const idx = i + 1
          return (
            <button
              key={i}
              type="button"
              onClick={() => t && setLightboxIndex(idx)}
              disabled={!t}
              className="group relative hidden overflow-hidden bg-[#e5e7eb] md:block"
              aria-label={t ? `Apri ${t.alt}` : 'Slot vuoto'}
            >
              {t ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.kind === 'video' ? t.thumbUrl : t.url}
                    alt={t.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  {t.kind === 'video' && <PlayBadge size="sm" />}
                </>
              ) : (
                <Placeholder />
              )}
            </button>
          )
        })}

        {totalCount > 1 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[13px] font-semibold text-[#0b1220] shadow-sm hover:bg-gray-50"
          >
            <ImageIcon size={16} />
            Vedi tutte ({totalCount})
          </button>
        )}
      </section>

      {open && lightboxIndex !== null && items[lightboxIndex] && (
        <Lightbox
          item={items[lightboxIndex]!}
          index={lightboxIndex}
          total={items.length}
          onClose={close}
          onNext={next}
          onPrev={prev}
        />
      )}
    </>
  )
}

const PlayBadge: FC<{ size: 'sm' | 'lg' }> = ({ size }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
    <div
      className={`flex items-center justify-center rounded-full bg-white/95 shadow-lg ${
        size === 'lg' ? 'h-16 w-16' : 'h-10 w-10'
      }`}
    >
      <Play
        className={`fill-current text-gray-900 ${size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'}`}
        style={{ marginLeft: size === 'lg' ? 4 : 2 }}
      />
    </div>
  </div>
)

const Placeholder: FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#e5e7eb] text-[#9ca3af]">
    <ImageIcon size={32} />
  </div>
)

type LightboxProps = {
  item: DisplayItem
  index: number
  total: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

const Lightbox: FC<LightboxProps> = ({ item, index, total, onClose, onNext, onPrev }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galleria"
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <header className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Chiudi"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {total > 1 && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Precedente"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="flex h-full max-h-[85vh] w-full max-w-6xl items-center justify-center">
          {item.kind === 'video' && item.videoEmbedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={item.videoEmbedUrl}
                title={item.alt}
                className="h-full w-full"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt} className="max-h-full max-w-full object-contain" />
          )}
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Successivo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {item.caption && (
        <div className="bg-black/80 px-4 py-3 text-center text-sm text-white" onClick={(e) => e.stopPropagation()}>
          {item.caption}
        </div>
      )}
    </div>
  )
}
