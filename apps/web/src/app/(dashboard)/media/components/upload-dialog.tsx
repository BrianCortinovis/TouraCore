'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@touracore/ui'
import { Input } from '@touracore/ui'
import { Modal } from '@touracore/ui'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@touracore/media'
import { uploadMediaAction } from '../actions'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
  onUploaded: () => void
}

export function UploadDialog({ open, onClose, onUploaded }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setError(null)
    if (f.size > MAX_FILE_SIZE) {
      setError(`File troppo grande. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(f.type)) {
      setError('Tipo file non supportato')
      return
    }
    setFile(f)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.set('file', file)
    if (altText) formData.set('alt_text', altText)

    const result = await uploadMediaAction(formData)
    setUploading(false)

    if (!result.success) {
      setError(result.error ?? 'Errore sconosciuto')
      return
    }

    setFile(null)
    setAltText('')
    onUploaded()
    onClose()
  }

  const reset = () => {
    setFile(null)
    setAltText('')
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={reset} title="Carica file">
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB — {file.type}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600">Trascina un file qui o clicca per selezionarlo</p>
              <p className="text-sm text-gray-400 mt-1">Max 15MB — JPEG, PNG, WebP, HEIC, TIFF, PDF</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        {file && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Testo alternativo (opzionale)
            </label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descrizione dell'immagine"
              maxLength={500}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={reset} disabled={uploading}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={!file || uploading}>
            {uploading ? 'Caricamento...' : 'Carica'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
