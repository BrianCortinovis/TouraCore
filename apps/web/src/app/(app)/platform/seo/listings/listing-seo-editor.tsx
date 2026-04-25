'use client'

import { useState, useTransition } from 'react'
import { Pencil, X } from 'lucide-react'
import { updateListingSeoAction } from './actions'

interface Props {
  listingId: string
  initialTitle: string
  initialDescription: string
  initialOgImage: string
  entityName: string
}

export function ListingSeoEditor({ listingId, initialTitle, initialDescription, initialOgImage, entityName }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [ogImage, setOgImage] = useState(initialOgImage)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await updateListingSeoAction({
        listingId,
        seoTitle: title.trim() || null,
        seoDescription: description.trim() || null,
        ogImageUrl: ogImage.trim() || null,
      })
      if (res.ok) setOpen(false)
      else setError(res.error)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
      >
        <Pencil className="h-3 w-3" /> Modifica
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold">SEO override — {entityName}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SEO title</label>
                <p className="text-xs text-gray-500 mb-1">Lascia vuoto per fallback automatico (entity_name · tenant_name)</p>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={70}
                  placeholder="Es. Villa Irabo · Hotel 4 stelle a Gardone Riviera"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-400">{title.length}/70 caratteri</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">SEO description</label>
                <p className="text-xs text-gray-500 mb-1">Max 160 caratteri per Google snippet</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Es. Hotel 4 stelle sul lago di Garda con SPA, ristorante gourmet e camere vista lago."
                />
                <p className="mt-1 text-xs text-gray-400">{description.length}/160 caratteri</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Open Graph image URL</label>
                <p className="text-xs text-gray-500 mb-1">Lascia vuoto per usare la foto hero o /opengraph-image generato</p>
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={pending} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
