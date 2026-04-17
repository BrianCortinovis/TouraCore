'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  listIcalFeedsAction,
  createIcalFeedAction,
  deleteIcalFeedAction,
  listRoomsForEntityAction,
} from '../admin/actions'

interface IcalFeed {
  id: string
  name: string
  url: string
  direction: string
  sync_interval_minutes: number
  last_synced_at: string | null
  last_sync_error: string | null
  last_sync_count: number | null
  is_active: boolean
  export_token: string | null
  room_id: string | null
}

interface RoomOption {
  id: string
  room_number: string
  room_types: { name: string }[] | { name: string } | null
}

export default function IcalPage() {
  const { property } = useAuthStore()
  const [feeds, setFeeds] = useState<IcalFeed[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', direction: 'import', roomId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!property) return
    setLoading(true)
    const [feedsData, roomsData] = await Promise.all([
      listIcalFeedsAction(property.id),
      listRoomsForEntityAction(property.id),
    ])
    setFeeds(feedsData as IcalFeed[])
    setRooms(roomsData as unknown as RoomOption[])
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
      roomId: form.roomId || undefined,
    })
    if (res.success) {
      setModalOpen(false)
      setForm({ name: '', url: '', direction: 'import', roomId: '' })
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

  function exportUrl(token: string | null): string {
    if (!token) return ''
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/api/v1/ical/${token}`
  }

  async function copyUrl(feedId: string, token: string | null) {
    const url = exportUrl(token)
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiedId(feedId)
    setTimeout(() => setCopiedId(null), 2000)
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
      key: 'url', header: 'URL / Token',
      render: (f: IcalFeed) => {
        if (f.direction === 'export') {
          const url = exportUrl(f.export_token)
          return (
            <div className="flex items-center gap-2">
              <span className="max-w-[220px] truncate text-xs text-gray-500" title={url}>{url}</span>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyUrl(f.id, f.export_token) }}>
                {copiedId === f.id ? 'Copiato' : 'Copia'}
              </Button>
            </div>
          )
        }
        return <span className="max-w-[280px] truncate text-xs text-gray-500" title={f.url}>{f.url}</span>
      },
      hideOnMobile: true,
    },
    {
      key: 'last_synced_at', header: 'Ultima sync',
      render: (f: IcalFeed) => {
        if (!f.last_synced_at) return <span className="text-gray-400">Mai</span>
        const time = new Date(f.last_synced_at).toLocaleString('it-IT')
        if (f.last_sync_error) {
          return <span className="text-red-600 text-xs" title={f.last_sync_error}>Errore: {time}</span>
        }
        return (
          <span className="text-xs text-gray-600">
            {time} {f.last_sync_count !== null ? `(${f.last_sync_count})` : ''}
          </span>
        )
      },
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

      <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <strong>Import:</strong> inserisci URL iCal esterno (Airbnb, Booking, Google Calendar). Sync automatico ogni 15 min.{' '}
        <strong>Export:</strong> genera URL pubblico da dare a OTA esterne per sincronizzare disponibilita TouraCore.
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
          <Select
            label="Direzione"
            options={[
              { value: 'import', label: 'Importa (da esterno)' },
              { value: 'export', label: 'Esporta (verso esterno)' },
            ]}
            value={form.direction}
            onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}
          />
          <Input
            label="Nome"
            placeholder={form.direction === 'import' ? 'es. Airbnb Apt 1' : 'es. Feed Camera 101'}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          {form.direction === 'import' && (
            <Input
              label="URL iCal esterno"
              placeholder="https://www.airbnb.com/calendar/ical/..."
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
            />
          )}
          <Select
            label="Camera (opzionale, per feed singola camera)"
            options={[
              { value: '', label: 'Tutte le camere della struttura' },
              ...rooms.map((r) => {
                const rt = Array.isArray(r.room_types) ? r.room_types[0] : r.room_types
                return {
                  value: r.id,
                  label: `${r.room_number}${rt?.name ? ' - ' + rt.name : ''}`,
                }
              }),
            ]}
            value={form.roomId}
            onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.name || (form.direction === 'import' && !form.url)}
            >
              {saving ? 'Salvataggio...' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
