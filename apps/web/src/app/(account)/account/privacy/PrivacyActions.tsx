'use client'

import { useState } from 'react'
import { Button } from '@touracore/ui'
import { csrfHeaders } from '@touracore/security/csrf-client'

interface Props {
  userId: string
  userEmail: string
  hasPendingDeletion: boolean
}

export function PrivacyActions({ userId, userEmail, hasPendingDeletion }: Props) {
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [typedEmail, setTypedEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const res = await fetch('/api/user/export', { method: 'POST', headers: csrfHeaders() })
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `touracore-user-data-${userId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Download completato.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore export')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (typedEmail !== userEmail) {
      setError("L'email digitata non corrisponde.")
      return
    }
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/user/delete', { method: 'POST', headers: csrfHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'delete_failed')
      setMessage(json.message)
      setConfirmDelete(false)
      setTimeout(() => location.reload(), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE', headers: csrfHeaders() })
      if (!res.ok) throw new Error('cancel_failed')
      setMessage('Richiesta di cancellazione annullata.')
      setTimeout(() => location.reload(), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900">Scarica i tuoi dati</h2>
        <p className="text-sm text-gray-600 mt-1">
          Export JSON di tutti i dati personali trattati (Art. 15 + 20 GDPR).
        </p>
        <Button onClick={handleExport} disabled={exporting} className="mt-4">
          {exporting ? 'Preparazione...' : 'Scarica dati (JSON)'}
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="font-semibold text-red-900">Cancella account</h2>
        <p className="text-sm text-gray-600 mt-1">
          Cancellazione soft 30 giorni + hard delete. Fatture conservate 10 anni per legge fiscale IT.
        </p>
        {hasPendingDeletion ? (
          <Button variant="outline" onClick={handleCancel} disabled={deleting} className="mt-4">
            {deleting ? 'Annullamento...' : 'Annulla richiesta'}
          </Button>
        ) : !confirmDelete ? (
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 text-red-600 border-red-300 hover:bg-red-50"
          >
            Richiedi cancellazione
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-600">
              Digita la tua email <code className="bg-gray-100 px-1">{userEmail}</code> per confermare:
            </p>
            <input
              type="email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={userEmail}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleDelete}
                disabled={deleting || typedEmail !== userEmail}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? '...' : 'Conferma cancellazione'}
              </Button>
              <Button variant="outline" onClick={() => { setConfirmDelete(false); setTypedEmail('') }}>
                Annulla
              </Button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="md:col-span-2 bg-green-50 text-green-800 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="md:col-span-2 bg-red-50 text-red-800 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
