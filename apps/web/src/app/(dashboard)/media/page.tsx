'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input } from '@touracore/ui'
import type { Media } from '@touracore/media'
import { MediaGrid } from './components/media-grid'
import { UploadDialog } from './components/upload-dialog'
import { listMediaAction } from './actions'

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)

  const perPage = 24
  const totalPages = Math.ceil(count / perPage)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    const result = await listMediaAction(page, undefined, search || undefined)
    setItems(result.data as Media[])
    setCount(result.count)
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void loadMedia()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Media</h1>
        <Button onClick={() => setShowUpload(true)}>Carica file</Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca file..."
          className="max-w-sm"
        />
        <Button variant="outline" type="submit">Cerca</Button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento...</div>
      ) : (
        <>
          <MediaGrid items={items} onRefresh={loadMedia} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Precedente
              </Button>
              <span className="text-sm text-gray-600">
                Pagina {page} di {totalPages} ({count} file)
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Successiva
              </Button>
            </div>
          )}
        </>
      )}

      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={loadMedia}
      />
    </div>
  )
}
