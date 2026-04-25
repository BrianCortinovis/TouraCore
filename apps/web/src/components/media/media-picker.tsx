'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Modal, TouracoreImage } from '@touracore/ui'
import type { Media, MediaVariantSet } from '@touracore/media'
import { isImageMime } from '@touracore/media'
import { listMediaAction, uploadMediaAction } from '@/app/(dashboard)/media/actions'

export interface MediaPickerSelection {
  id: string
  url: string
  alt_text: string | null
  width: number | null
  height: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (media: MediaPickerSelection) => void
  imagesOnly?: boolean
  title?: string
  multiple?: boolean
  onSelectMultiple?: (items: MediaPickerSelection[]) => void
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  imagesOnly = true,
  title = 'Seleziona file',
  multiple = false,
  onSelectMultiple,
}: Props) {
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const result = await listMediaAction(page, imagesOnly ? 'image/' : undefined, search || undefined)
      setItems(result.data as Media[])
      setCount(result.count)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page])

  function toMediaSelection(m: Media): MediaPickerSelection {
    return {
      id: m.id,
      url: m.url,
      alt_text: m.alt_text ?? null,
      width: m.width ?? null,
      height: m.height ?? null,
    }
  }

  function pick(m: Media) {
    if (multiple) {
      const next = new Set(selectedIds)
      if (next.has(m.id)) next.delete(m.id)
      else next.add(m.id)
      setSelectedIds(next)
    } else {
      onSelect(toMediaSelection(m))
      onClose()
    }
  }

  function confirmMultiple() {
    if (!onSelectMultiple) return
    const picks = items.filter((i) => selectedIds.has(i.id)).map(toMediaSelection)
    onSelectMultiple(picks)
    setSelectedIds(new Set())
    onClose()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const res = await uploadMediaAction(formData)
      if (!res.success) {
        setUploadError(res.error ?? 'Errore upload')
      } else {
        await refresh()
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / 24))

  return (
    <Modal isOpen={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o alt..."
            className="flex-1"
          />
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setPage(1)
              void refresh()
            }}
          >
            Cerca
          </Button>
          <label className="cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            {uploading ? 'Carico…' : '+ Upload'}
            <input
              type="file"
              className="hidden"
              accept={imagesOnly ? 'image/*' : undefined}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Caricamento…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Nessun file. Carica le tue foto qui sopra.
          </div>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
            {items.map((m) => {
              const isSelected = selectedIds.has(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pick(m)}
                  className={`group relative aspect-square overflow-hidden rounded-md border-2 transition ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-400'
                  }`}
                  title={m.original_name}
                >
                  {isImageMime(m.mime_type) ? (
                    <TouracoreImage
                      src={m.url}
                      alt={m.alt_text ?? m.original_name}
                      variants={(m.variants ?? undefined) as MediaVariantSet | undefined}
                      blurhash={m.blurhash}
                      fill
                      preferredTier="thumb"
                      sizes="160px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-50 text-2xl">📄</div>
                  )}
                  {isSelected && (
                    <span className="absolute right-1 top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {count} file totali · pagina {page} di {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ←
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              →
            </Button>
          </div>
        </div>

        {multiple && (
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" type="button" onClick={onClose}>
              Annulla
            </Button>
            <Button type="button" onClick={confirmMultiple} disabled={selectedIds.size === 0}>
              Aggiungi ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
