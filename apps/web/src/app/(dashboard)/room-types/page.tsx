'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { listRoomTypesAction, createRoomTypeAction, updateRoomTypeAction } from './actions'

const CATEGORIES = [
  { value: 'room', label: 'Camera' },
  { value: 'apartment', label: 'Appartamento' },
  { value: 'suite', label: 'Suite' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
]

interface RoomType {
  id: string
  name: string
  code: string | null
  category: string
  base_occupancy: number
  max_occupancy: number
  max_children: number
  base_price: number
  size_sqm: number | null
  is_active: boolean
  sort_order: number
  description: string | null
  bed_configuration: string | null
  floor_range: string | null
}

const emptyForm = {
  name: '', code: '', category: 'room', description: '',
  base_occupancy: '2', max_occupancy: '2', max_children: '0',
  base_price: '', size_sqm: '', bed_configuration: '', floor_range: '',
  sort_order: '0',
}

export default function RoomTypesPage() {
  const [types, setTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RoomType | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listRoomTypesAction()
    setTypes(data as RoomType[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(rt: RoomType) {
    setEditing(rt)
    setForm({
      name: rt.name,
      code: rt.code || '',
      category: rt.category,
      description: rt.description || '',
      base_occupancy: String(rt.base_occupancy),
      max_occupancy: String(rt.max_occupancy),
      max_children: String(rt.max_children),
      base_price: String(rt.base_price),
      size_sqm: rt.size_sqm ? String(rt.size_sqm) : '',
      bed_configuration: rt.bed_configuration || '',
      floor_range: rt.floor_range || '',
      sort_order: String(rt.sort_order),
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      code: form.code || null,
      category: form.category as 'room' | 'apartment' | 'suite' | 'studio' | 'villa',
      description: form.description || null,
      base_occupancy: Number(form.base_occupancy),
      max_occupancy: Number(form.max_occupancy),
      max_children: Number(form.max_children),
      base_price: Number(form.base_price),
      size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
      bed_configuration: form.bed_configuration || null,
      floor_range: form.floor_range || null,
      sort_order: Number(form.sort_order),
    }

    const res = editing
      ? await updateRoomTypeAction(editing.id, payload)
      : await createRoomTypeAction(payload)

    if (res.success) {
      setModalOpen(false)
      await load()
    } else {
      setError(res.error || 'Errore')
    }
    setSaving(false)
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'code', header: 'Codice', hideOnMobile: true },
    {
      key: 'category', header: 'Categoria',
      render: (rt: RoomType) => CATEGORIES.find((c) => c.value === rt.category)?.label || rt.category,
    },
    {
      key: 'occupancy', header: 'Occupazione',
      render: (rt: RoomType) => `${rt.base_occupancy}–${rt.max_occupancy}`,
      hideOnMobile: true,
    },
    {
      key: 'base_price', header: 'Prezzo base',
      render: (rt: RoomType) => `€${rt.base_price.toFixed(2)}`,
    },
    {
      key: 'is_active', header: 'Stato',
      render: (rt: RoomType) => (
        <Badge variant={rt.is_active ? 'success' : 'secondary'}>
          {rt.is_active ? 'Attivo' : 'Inattivo'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tipologie camera</h1>
        <Button onClick={openCreate}>Nuova tipologia</Button>
      </div>

      <DataTable
        columns={columns}
        data={types}
        keyExtractor={(rt) => rt.id}
        onRowClick={openEdit}
        isLoading={loading}
        emptyMessage="Nessuna tipologia camera configurata"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica tipologia' : 'Nuova tipologia'} size="lg">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Input label="Codice" value={form.code} onChange={(e) => set('code', e.target.value)} />
          </div>

          <Select label="Categoria" options={CATEGORIES} value={form.category} onChange={(e) => set('category', e.target.value)} />

          <Input label="Descrizione" value={form.description} onChange={(e) => set('description', e.target.value)} />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Occupazione base" type="number" value={form.base_occupancy} onChange={(e) => set('base_occupancy', e.target.value)} />
            <Input label="Max occupazione" type="number" value={form.max_occupancy} onChange={(e) => set('max_occupancy', e.target.value)} />
            <Input label="Max bambini" type="number" value={form.max_children} onChange={(e) => set('max_children', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Prezzo base (€)" type="number" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
            <Input label="Superficie (mq)" type="number" value={form.size_sqm} onChange={(e) => set('size_sqm', e.target.value)} />
            <Input label="Ordine" type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Configurazione letti" value={form.bed_configuration} onChange={(e) => set('bed_configuration', e.target.value)} />
            <Input label="Piani" value={form.floor_range} onChange={(e) => set('floor_range', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.base_price}>
              {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
