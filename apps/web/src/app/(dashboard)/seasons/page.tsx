'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Modal, DataTable, Badge } from '@touracore/ui'
import { listSeasonsAction, createSeasonAction, updateSeasonAction, deleteSeasonAction } from './actions'

interface Season {
  id: string
  name: string
  color: string
  date_from: string
  date_to: string
  price_modifier: number
  min_stay: number
  max_stay: number | null
}

const emptyForm = {
  name: '', color: '#3b82f6', date_from: '', date_to: '',
  price_modifier: '1.0', min_stay: '1', max_stay: '',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Season | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listSeasonsAction()
    setSeasons(data as Season[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(season: Season) {
    setEditing(season)
    setForm({
      name: season.name,
      color: season.color,
      date_from: season.date_from,
      date_to: season.date_to,
      price_modifier: String(season.price_modifier),
      min_stay: String(season.min_stay),
      max_stay: season.max_stay != null ? String(season.max_stay) : '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      color: form.color,
      date_from: form.date_from,
      date_to: form.date_to,
      price_modifier: Number(form.price_modifier),
      min_stay: Number(form.min_stay),
      max_stay: form.max_stay ? Number(form.max_stay) : null,
    }

    const res = editing
      ? await updateSeasonAction(editing.id, payload)
      : await createSeasonAction(payload)

    if (res.success) {
      setModalOpen(false)
      await load()
    } else {
      setError(res.error || 'Errore')
    }
    setSaving(false)
  }

  async function handleDelete(season: Season) {
    if (!confirm(`Eliminare la stagione "${season.name}"? Verranno eliminate anche tutte le tariffe associate.`)) return
    const res = await deleteSeasonAction(season.id)
    if (res.success) await load()
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const columns = [
    {
      key: 'color', header: '',
      render: (s: Season) => (
        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: s.color }} />
      ),
      className: 'w-8',
    },
    { key: 'name', header: 'Nome' },
    {
      key: 'dates', header: 'Periodo',
      render: (s: Season) => `${formatDate(s.date_from)} – ${formatDate(s.date_to)}`,
    },
    {
      key: 'price_modifier', header: 'Modificatore',
      render: (s: Season) => {
        const pct = ((s.price_modifier - 1) * 100).toFixed(0)
        const sign = Number(pct) >= 0 ? '+' : ''
        return (
          <Badge variant={Number(pct) > 0 ? 'warning' : Number(pct) < 0 ? 'success' : 'secondary'}>
            {sign}{pct}%
          </Badge>
        )
      },
    },
    {
      key: 'stay', header: 'Soggiorno',
      render: (s: Season) => `min ${s.min_stay}${s.max_stay ? ` / max ${s.max_stay}` : ''}`,
      hideOnMobile: true,
    },
    {
      key: 'actions', header: '',
      render: (s: Season) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(s)} className="text-red-600 hover:text-red-700">
            Elimina
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stagioni</h1>
        <Button onClick={openCreate}>Nuova stagione</Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Qui imposti il modificatore percentuale della stagione. Per il prezzo diretto delle unità usa la matrice tariffe
        nella pagina <span className="font-medium text-slate-900">Tariffe</span>.
      </div>

      <DataTable
        columns={columns}
        data={seasons}
        keyExtractor={(s) => s.id}
        onRowClick={openEdit}
        isLoading={loading}
        emptyMessage="Nessuna stagione configurata"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica stagione' : 'Nuova stagione'}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Colore</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Data inizio" type="date" value={form.date_from} onChange={(e) => set('date_from', e.target.value)} />
            <Input label="Data fine" type="date" value={form.date_to} onChange={(e) => set('date_to', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Modificatore prezzo" type="number" step="0.01" value={form.price_modifier} onChange={(e) => set('price_modifier', e.target.value)} />
            <Input label="Soggiorno minimo" type="number" value={form.min_stay} onChange={(e) => set('min_stay', e.target.value)} />
            <Input label="Soggiorno massimo" type="number" value={form.max_stay} onChange={(e) => set('max_stay', e.target.value)} />
          </div>
          <p className="text-xs text-slate-500">
            Esempio: `1.10` = +10%, `0.90` = -10%.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.date_from || !form.date_to}>
              {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
