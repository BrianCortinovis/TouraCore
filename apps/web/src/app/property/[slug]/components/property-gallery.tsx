'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Modal } from '@touracore/ui'

interface MediaItem {
  id: string
  url: string
  thumbnail_url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export function PropertyGallery({ media }: { media: MediaItem[] }) {
  const [selected, setSelected] = useState<MediaItem | null>(null)

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {media.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className="group relative aspect-square overflow-hidden rounded-lg"
          >
            <Image
              src={item.thumbnail_url || item.url}
              alt={item.alt || ''}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </button>
        ))}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} size="xl">
        {selected && (
          <Image
            src={selected.url}
            alt={selected.alt || ''}
            className="w-full rounded-lg"
            width={selected.width || 1200}
            height={selected.height || 800}
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        )}
      </Modal>
    </>
  )
}
