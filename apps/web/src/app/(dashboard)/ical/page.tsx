'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listIcalFeedsAction, createIcalFeedAction, deleteIcalFeedAction } from '../admin/actions'

interface IcalFeed {
  id: string
  name: string
  url: string
  direction: string
  sync_interval_minutes: number
  last_synced_at: string | null
  last_sync_error: string | null
  is_active: boolean
}

export default function IcalPage() {
  const { property } = useAuthStore()
  const [feeds, setFeeds] = useState<IcalFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', direction: 'import' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!property) return
    setLoading(true)
    const data = await listIcalFeedsAction(property.id)
    setFeeds(data as IcalFeed[])
    setLoading(false)
  }, [property])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!property) return
    setSaving(true)
    setError('')
    const res = await createIcalFeedAction({
      entityId: property.id,
      name: form.name,
      url: form.url,
      direction: form.direction as 'import' | 'export',
    })
    if (res.success) {
      setModalOpen(false)
      setForm({ name: '', url: '', direction: 'import' })
      await load()
    } else {
      setError(res.error || 'Errore')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo feed iCal?')) return
    await deleteIcalFeedAction(id)
    await load()
  }

  if (!property) {
    return <div className="py-20 text-center text-gray-500">Seleziona una struttura.</div>
  }

  const columns = [
    { key: 'name', header: 'Nome' },
    {
      key: 'direction', header: 'Direzione',
      render: (f: IcalFeed) => (
        <Badge variant={f.direction === 'import' ? 'secondary' : 'success'}>
          {f.direction === 'import' ? 'Importa' : 'Esporta'}
        </Badge>
      ),
    },
    {
      key: 'url', header: 'URL',
      render: (f: IcalFeed) => (
        <span className="max-w-[200px] truncate text-xs text-gray-500">{f.url}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'last_synced_at', header: 'Ultima sync',
      render: (f: IcalFeed) => f.last_synced_at
        ? new Date(f.last_synced_at).toLocaleString('it-IT')
        : 'Mai',
      hideOnMobile: true,
    },
    {
      key: 'actions', header: '',
      render: (f: IcalFeed) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleDelete(f.id) }}
          className="text-red-600 hover:text-red-700"
        >
          Elimina
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sincronizzazione iCal</h1>
        <Button onClick={() => setModalOpen(true)}>Nuovo feed</Button>
      </div>

      <DataTable
        columns={columns}
        data={feeds}
        keyExtractor={(f) => f.id}
        isLoading={loading}
        emptyMessage="Nessun feed iCal configurato"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo feed iCal">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Input label="Nome" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="URL iCal" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
          <Select
            label="Direzione"
            options={[
              { value: 'import', label: 'Importa (da esterno)' },
              { value: 'export', label: 'Esporta (verso esterno)' },
            ]}
            value={form.direction}
            onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name || !form.url}>
              {saving ? 'Salvataggio...' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
