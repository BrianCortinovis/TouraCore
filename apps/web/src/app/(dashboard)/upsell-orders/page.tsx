'use client'

import { useEffect, useState, useCallback } from 'react'
import { DataTable, Badge, Select } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listUpsellOrdersAction, updateUpsellOrderStatusAction } from '../competitive-actions'

interface UpsellOrder {
  id: string
  status: string
  quantity: number
  unit_price: number
  total: number
  currency: string | null
  notes: string | null
  created_at: string
  delivered_at: string | null
  upsell_offers: { name: string; category: string } | { name: string; category: string }[] | null
  reservations:
    | { reservation_code: string; guest: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }
    | { reservation_code: string; guest: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }[]
    | null
}

const statusColor: Record<string, string> = {
  pending: 'secondary',
  paid: 'default',
  confirmed: 'default',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
}

function pickFirst<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export default function UpsellOrdersPage() {
  const { property } = useAuthStore()
  const [orders, setOrders] = useState<UpsellOrder[]>([])

  const load = useCallback(async () => {
    if (!property) return
    const data = await listUpsellOrdersAction(property.id)
    setOrders(data as unknown as UpsellOrder[])
  }, [property])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(id: string, status: string) {
    await updateUpsellOrderStatusAction(id, status)
    await load()
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Caricamento struttura...</div>

  const columns = [
    { key: 'reservation', header: 'Prenotazione', render: (o: UpsellOrder) => {
      const r = pickFirst(o.reservations)
      return <span className="font-mono text-xs">{r?.reservation_code ?? '-'}</span>
    }},
    { key: 'guest', header: 'Ospite', render: (o: UpsellOrder) => {
      const g = pickFirst(pickFirst(o.reservations)?.guest ?? null)
      return g ? `${g.first_name} ${g.last_name}` : '-'
    }},
    { key: 'offer', header: 'Servizio', render: (o: UpsellOrder) => pickFirst(o.upsell_offers)?.name ?? '-' },
    { key: 'qty', header: 'Qta', render: (o: UpsellOrder) => o.quantity },
    { key: 'total', header: 'Totale', render: (o: UpsellOrder) => `€${Number(o.total).toFixed(2)}` },
    { key: 'status', header: 'Stato', render: (o: UpsellOrder) => (
      <Badge variant={(statusColor[o.status] ?? 'secondary') as never}>{o.status}</Badge>
    )},
    { key: 'actions', header: '', render: (o: UpsellOrder) => (
      <Select
        className="w-36"
        options={[
          { value: o.status, label: 'Cambia stato' },
          { value: 'paid', label: 'Pagato' },
          { value: 'confirmed', label: 'Confermato' },
          { value: 'delivered', label: 'Consegnato' },
          { value: 'cancelled', label: 'Annullato' },
          { value: 'refunded', label: 'Rimborsato' },
        ]}
        value={o.status}
        onChange={(e) => { if (e.target.value !== o.status) handleStatusChange(o.id, e.target.value) }}
      />
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Ordini upsell</h1>
      <DataTable columns={columns} data={orders} keyExtractor={(o) => o.id} emptyMessage="Nessun ordine." />
    </div>
  )
}
