'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  listMaintenanceTicketsAction,
  createMaintenanceTicketAction,
  updateMaintenanceTicketAction,
} from '../competitive-actions'

interface Ticket {
  id: string
  ticket_code: string | null
  title: string
  description: string | null
  category: string | null
  priority: string
  status: string
  room_id: string | null
  reported_at: string
  resolved_at: string | null
  cost_actual: number | null
  supplier_name: string | null
}

const statusColor: Record<string, string> = {
  open: 'destructive',
  in_progress: 'default',
  waiting_parts: 'secondary',
  done: 'success',
  cancelled: 'secondary',
}

export default function MaintenancePage() {
  const { property, tenant } = useAuthStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'normal' })

  const load = useCallback(async () => {
    if (!property) return
    const data = await listMaintenanceTicketsAction(property.id, statusFilter || undefined)
    setTickets(data as Ticket[])
  }, [property, statusFilter])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!tenant || !property || !form.title) return
    await createMaintenanceTicketAction({
      tenantId: tenant.id,
      entityId: property.id,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
    })
    setOpen(false)
    setForm({ title: '', description: '', category: 'other', priority: 'normal' })
    await load()
  }

  async function handleStatusChange(id: string, status: string) {
    const patch: Record<string, unknown> = { status }
    if (status === 'done') patch.resolved_at = new Date().toISOString()
    await updateMaintenanceTicketAction(id, patch)
    await load()
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Seleziona una struttura.</div>

  const columns = [
    { key: 'ticket_code', header: 'Codice', render: (t: Ticket) => <span className="font-mono text-xs">{t.ticket_code}</span> },
    { key: 'title', header: 'Titolo' },
    { key: 'priority', header: 'Priorita', render: (t: Ticket) => (
      <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'default' : 'secondary'}>
        {t.priority}
      </Badge>
    )},
    { key: 'status', header: 'Stato', render: (t: Ticket) => (
      <Badge variant={(statusColor[t.status] ?? 'secondary') as never}>{t.status}</Badge>
    )},
    { key: 'reported_at', header: 'Aperto', render: (t: Ticket) => new Date(t.reported_at).toLocaleDateString('it-IT'), hideOnMobile: true },
    { key: 'actions', header: '', render: (t: Ticket) => (
      <div className="flex gap-1">
        {t.status === 'open' && <Button size="sm" variant="ghost" onClick={() => handleStatusChange(t.id, 'in_progress')}>Inizia</Button>}
        {t.status === 'in_progress' && <Button size="sm" variant="ghost" onClick={() => handleStatusChange(t.id, 'done')}>Chiudi</Button>}
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manutenzione</h1>
        <div className="flex gap-2">
          <Select
            options={[
              { value: '', label: 'Tutti' },
              { value: 'open', label: 'Aperti' },
              { value: 'in_progress', label: 'In corso' },
              { value: 'waiting_parts', label: 'Attesa pezzi' },
              { value: 'done', label: 'Completati' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Button onClick={() => setOpen(true)}>Nuovo ticket</Button>
        </div>
      </div>

      <DataTable columns={columns} data={tickets} keyExtractor={(t) => t.id} emptyMessage="Nessun ticket." />

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nuovo ticket manutenzione">
        <div className="space-y-4">
          <Input label="Titolo" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <textarea
            placeholder="Descrizione"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Select
            label="Categoria"
            options={[
              { value: 'plumbing', label: 'Idraulico' },
              { value: 'electrical', label: 'Elettrico' },
              { value: 'hvac', label: 'Clima/HVAC' },
              { value: 'furniture', label: 'Arredamento' },
              { value: 'appliance', label: 'Elettrodomestici' },
              { value: 'cleaning', label: 'Pulizie' },
              { value: 'safety', label: 'Sicurezza' },
              { value: 'other', label: 'Altro' },
            ]}
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          />
          <Select
            label="Priorita"
            options={[
              { value: 'low', label: 'Bassa' },
              { value: 'normal', label: 'Normale' },
              { value: 'high', label: 'Alta' },
              { value: 'urgent', label: 'Urgente' },
            ]}
            value={form.priority}
            onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={!form.title}>Crea</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
