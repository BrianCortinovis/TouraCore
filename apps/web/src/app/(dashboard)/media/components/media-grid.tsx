'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@touracore/ui'
import type { Media } from '@touracore/media'
import { isImageMime } from '@touracore/media'
import { deleteMediaAction } from '../actions'

interface MediaGridProps {
  items: Media[]
  onRefresh: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MediaCard({ media, onDeleted }: { media: Media; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isImage = isImageMime(media.mime_type)
  const thumbnailUrl = (media.metadata as Record<string, unknown>)?.['thumbnail_url']

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteMediaAction(media.id)
    setDeleting(false)
    if (result.success) {
      onDeleted()
    }
    setConfirmDelete(false)
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
        {isImage && (typeof thumbnailUrl === 'string' || media.url) ? (
          <Image
            src={typeof thumbnailUrl === 'string' ? thumbnailUrl : media.url}
            alt={media.alt_text ?? media.original_name}
            className="w-full h-full object-cover"
            fill
            unoptimized
          />
        ) : (
          <div className="text-center p-4">
            <div className="text-3xl mb-2">📄</div>
            <p className="text-xs text-gray-500 truncate max-w-full">
              {media.mime_type.split('/')[1]?.toUpperCase()}
            </p>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate" title={media.original_name}>
          {media.original_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary">{formatBytes(media.size_bytes)}</Badge>
          {media.width && media.height && (
            <span className="text-xs text-gray-400">
              {media.width}×{media.height}
            </span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Apri
          </a>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-600 hover:underline"
              >
                {deleting ? '...' : 'Conferma'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-600 hover:underline"
            >
              Elimina
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function MediaGrid({ items, onRefresh }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">🖼️</div>
        <p className="text-lg">Nessun file caricato</p>
        <p className="text-sm mt-1">Usa il pulsante "Carica" per aggiungere file</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((media) => (
        <MediaCard key={media.id} media={media} onDeleted={onRefresh} />
      ))}
    </div>
  )
}
