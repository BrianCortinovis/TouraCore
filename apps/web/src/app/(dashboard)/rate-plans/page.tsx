'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import {
  listRatePlansAction,
  createRatePlanAction,
  updateRatePlanAction,
  toggleRatePlanAction,
  deleteRatePlanAction,
} from './actions'

const RATE_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'non_refundable', label: 'Non rimborsabile' },
  { value: 'package', label: 'Pacchetto' },
  { value: 'long_stay', label: 'Soggiorno lungo' },
  { value: 'early_booking', label: 'Prenota prima' },
  { value: 'last_minute', label: 'Last minute' },
]

const MEAL_PLANS = [
  { value: 'room_only', label: 'Solo pernottamento' },
  { value: 'breakfast', label: 'Colazione inclusa' },
  { value: 'half_board', label: 'Mezza pensione' },
  { value: 'full_board', label: 'Pensione completa' },
  { value: 'all_inclusive', label: 'All inclusive' },
]

interface RatePlan {
  id: string
  name: string
  code: string | null
  rate_type: string
  meal_plan: string
  description: string | null
  is_public: boolean
  is_active: boolean
  is_derived: boolean
  sort_order: number
}

const emptyForm = {
  name: '', code: '', rate_type: 'standard', meal_plan: 'room_only',
  description: '', is_public: true, sort_order: '0',
}

export default function RatePlansPage() {
  const [plans, setPlans] = useState<RatePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RatePlan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listRatePlansAction()
    setPlans(data as RatePlan[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(plan: RatePlan) {
    setEditing(plan)
    setForm({
      name: plan.name,
      code: plan.code || '',
      rate_type: plan.rate_type,
      meal_plan: plan.meal_plan,
      description: plan.description || '',
      is_public: plan.is_public,
      sort_order: String(plan.sort_order),
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
      rate_type: form.rate_type as 'standard' | 'non_refundable' | 'package' | 'long_stay' | 'early_booking' | 'last_minute',
      meal_plan: form.meal_plan as 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'all_inclusive',
      description: form.description || null,
      is_public: form.is_public,
      sort_order: Number(form.sort_order),
    }

    const res = editing
      ? await updateRatePlanAction(editing.id, payload)
      : await createRatePlanAction(payload)

    if (res.success) {
      setModalOpen(false)
      await load()
    } else {
      setError(res.error || 'Errore')
    }
    setSaving(false)
  }

  async function handleToggle(plan: RatePlan) {
    await toggleRatePlanAction(plan.id, !plan.is_active)
    await load()
  }

  async function handleDelete(plan: RatePlan) {
    if (!confirm(`Eliminare il piano tariffario "${plan.name}"? Verranno eliminate anche tutte le tariffe associate.`)) return
    const res = await deleteRatePlanAction(plan.id)
    if (res.success) await load()
  }

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'code', header: 'Codice', hideOnMobile: true },
    {
      key: 'rate_type', header: 'Tipo',
      render: (p: RatePlan) => RATE_TYPES.find((t) => t.value === p.rate_type)?.label || p.rate_type,
    },
    {
      key: 'meal_plan', header: 'Trattamento',
      render: (p: RatePlan) => MEAL_PLANS.find((m) => m.value === p.meal_plan)?.label || p.meal_plan,
      hideOnMobile: true,
    },
    {
      key: 'is_active', header: 'Stato',
      render: (p: RatePlan) => (
        <Badge variant={p.is_active ? 'success' : 'secondary'}>
          {p.is_active ? 'Attivo' : 'Inattivo'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '',
      render: (p: RatePlan) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
            {p.is_active ? 'Disattiva' : 'Attiva'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(p)} className="text-red-600 hover:text-red-700">
            Elimina
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Piani tariffari</h1>
        <Button onClick={openCreate}>Nuovo piano</Button>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        keyExtractor={(p) => p.id}
        onRowClick={openEdit}
        isLoading={loading}
        emptyMessage="Nessun piano tariffario configurato"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica piano tariffario' : 'Nuovo piano tariffario'}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Input label="Codice" value={form.code} onChange={(e) => set('code', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo tariffa" options={RATE_TYPES} value={form.rate_type} onChange={(e) => set('rate_type', e.target.value)} />
            <Select label="Trattamento" options={MEAL_PLANS} value={form.meal_plan} onChange={(e) => set('meal_plan', e.target.value)} />
          </div>

          <Input label="Descrizione" value={form.description} onChange={(e) => set('description', e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Ordine" type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_public"
                checked={form.is_public as boolean}
                onChange={(e) => set('is_public', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_public" className="text-sm text-gray-700">Pubblico</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
