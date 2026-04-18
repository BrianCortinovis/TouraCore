import type { FC } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import type { ListingPhoto } from './photos'

export type ListingGalleryProps = {
  photos: ListingPhoto[]
  heroFallbackUrl?: string | null
  entityName: string
}

/** Booking-style 2+4 grid gallery. If <5 photos, renders available + placeholders. */
export const ListingGallery: FC<ListingGalleryProps> = ({ photos, heroFallbackUrl, entityName }) => {
  const sorted = [...photos].sort((a, b) => (a.is_hero === b.is_hero ? a.sort_order - b.sort_order : a.is_hero ? -1 : 1))

  const hero = sorted[0]?.url ?? heroFallbackUrl ?? null
  const rest = sorted.slice(1, 5)

  if (!hero && sorted.length === 0) return null

  return (
    <section className="mb-6 grid grid-cols-2 gap-1 overflow-hidden rounded-md md:grid-cols-4 md:grid-rows-2">
      <div className="relative col-span-2 row-span-2 bg-[#e5e7eb]">
        {hero ? (
          <img
            src={hero}
            alt={sorted[0]?.alt_text ?? `${entityName} — foto principale`}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <Placeholder />
        )}
      </div>
      {Array.from({ length: 4 }).map((_, i) => {
        const p = rest[i]
        return (
          <div key={i} className="relative aspect-video bg-[#e5e7eb] md:aspect-auto">
            {p ? (
              <img
                src={p.url}
                alt={p.alt_text ?? `${entityName} — foto ${i + 2}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Placeholder />
            )}
          </div>
        )
      })}
      {photos.length > 5 ? (
        <button
          type="button"
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[13px] font-semibold text-[#0b1220] shadow-sm"
        >
          <ImageIcon size={16} />
          Vedi tutte le {photos.length} foto
        </button>
      ) : null}
    </section>
  )
}

const Placeholder: FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#e5e7eb] text-[#9ca3af]">
    <ImageIcon size={32} />
  </div>
)
