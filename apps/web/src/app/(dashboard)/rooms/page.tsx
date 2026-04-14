'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import {
  listRoomsAction,
  listRoomTypesForSelectAction,
  createRoomAction,
  updateRoomAction,
  updateRoomStatusAction,
} from './actions'

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponibile' },
  { value: 'occupied', label: 'Occupata' },
  { value: 'cleaning', label: 'Pulizia' },
  { value: 'maintenance', label: 'Manutenzione' },
  { value: 'out_of_order', label: 'Fuori servizio' },
]

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  available: 'success',
  occupied: 'warning',
  cleaning: 'secondary',
  maintenance: 'destructive',
  out_of_order: 'destructive',
}

interface Room {
  id: string
  room_number: string
  name: string | null
  floor: number | null
  building: string | null
  status: string
  is_active: boolean
  room_type_id: string
  room_type: { id: string; name: string } | null
  notes: string | null
}

const emptyForm = {
  room_number: '', name: '', room_type_id: '', floor: '', building: '', status: 'available', notes: '',
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypeOptions, setRoomTypeOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [roomData, typeOpts] = await Promise.all([
      listRoomsAction(),
      listRoomTypesForSelectAction(),
    ])
    setRooms(roomData as Room[])
    setRoomTypeOptions(typeOpts)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, room_type_id: roomTypeOptions[0]?.value || '' })
    setError('')
    setModalOpen(true)
  }

  function openEdit(room: Room) {
    setEditing(room)
    setForm({
      room_number: room.room_number,
      name: room.name || '',
      room_type_id: room.room_type_id,
      floor: room.floor != null ? String(room.floor) : '',
      building: room.building || '',
      status: room.status,
      notes: room.notes || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const payload = {
      room_number: form.room_number,
      room_type_id: form.room_type_id,
      name: form.name || null,
      floor: form.floor ? Number(form.floor) : null,
      building: form.building || null,
      status: form.status as 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order',
      notes: form.notes || null,
    }

    const res = editing
      ? await updateRoomAction(editing.id, payload)
      : await createRoomAction(payload)

    if (res.success) {
      setModalOpen(false)
      await load()
    } else {
      setError(res.error || 'Errore')
    }
    setSaving(false)
  }

  async function handleStatusChange(roomId: string, newStatus: string) {
    const res = await updateRoomStatusAction(roomId, newStatus as 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order')
    if (res.success) await load()
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const columns = [
    { key: 'room_number', header: 'Numero' },
    { key: 'name', header: 'Nome', hideOnMobile: true },
    {
      key: 'room_type', header: 'Tipologia',
      render: (r: Room) => r.room_type?.name || '—',
    },
    {
      key: 'floor', header: 'Piano',
      render: (r: Room) => r.floor != null ? String(r.floor) : '—',
      hideOnMobile: true,
    },
    {
      key: 'status', header: 'Stato',
      render: (r: Room) => (
        <Badge variant={STATUS_COLORS[r.status] || 'secondary'}>
          {STATUS_OPTIONS.find((s) => s.value === r.status)?.label || r.status}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r: Room) => (
        <Select
          options={STATUS_OPTIONS}
          value={r.status}
          onChange={(e) => handleStatusChange(r.id, e.target.value)}
          className="h-8 w-32 text-xs"
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Camere</h1>
        <Button onClick={openCreate} disabled={roomTypeOptions.length === 0}>Nuova camera</Button>
      </div>

      {roomTypeOptions.length === 0 && !loading && (
        <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          Crea prima una tipologia camera nella sezione &quot;Tipologie camera&quot;.
        </div>
      )}

      <DataTable
        columns={columns}
        data={rooms}
        keyExtractor={(r) => r.id}
        onRowClick={openEdit}
        isLoading={loading}
        emptyMessage="Nessuna camera configurata"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica camera' : 'Nuova camera'}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Numero camera" value={form.room_number} onChange={(e) => set('room_number', e.target.value)} />
            <Input label="Nome (opzionale)" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <Select label="Tipologia" options={roomTypeOptions} value={form.room_type_id} onChange={(e) => set('room_type_id', e.target.value)} />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Piano" type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} />
            <Input label="Edificio" value={form.building} onChange={(e) => set('building', e.target.value)} />
            <Select label="Stato" options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} />
          </div>

          <Input label="Note" value={form.notes} onChange={(e) => set('notes', e.target.value)} />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.room_number || !form.room_type_id}>
              {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
