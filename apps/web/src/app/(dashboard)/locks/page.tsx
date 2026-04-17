'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listSmartLocksAction, addSmartLockAction } from '../competitive-actions'

interface Lock {
  id: string
  provider: string
  provider_device_id: string
  nickname: string | null
  is_active: boolean
  last_ping_at: string | null
  battery_level: number | null
  room_id: string | null
}

export default function LocksPage() {
  const { property, tenant } = useAuthStore()
  const [locks, setLocks] = useState<Lock[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ provider: 'nuki', providerDeviceId: '', nickname: '' })

  const load = useCallback(async () => {
    if (!property) return
    const data = await listSmartLocksAction(property.id)
    setLocks(data as Lock[])
  }, [property])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!tenant || !property || !form.providerDeviceId) return
    await addSmartLockAction({
      tenantId: tenant.id,
      entityId: property.id,
      provider: form.provider,
      providerDeviceId: form.providerDeviceId,
      nickname: form.nickname,
    })
    setOpen(false)
    setForm({ provider: 'nuki', providerDeviceId: '', nickname: '' })
    await load()
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Caricamento struttura...</div>

  const columns = [
    { key: 'nickname', header: 'Nome', render: (l: Lock) => l.nickname ?? l.provider_device_id },
    { key: 'provider', header: 'Provider', render: (l: Lock) => <Badge variant="secondary">{l.provider}</Badge> },
    { key: 'device_id', header: 'Device ID', render: (l: Lock) => <span className="font-mono text-xs">{l.provider_device_id}</span>, hideOnMobile: true },
    { key: 'battery', header: 'Batteria', render: (l: Lock) => l.battery_level !== null ? `${l.battery_level}%` : '—' },
    { key: 'is_active', header: 'Stato', render: (l: Lock) => (
      <Badge variant={l.is_active ? 'success' : 'secondary'}>{l.is_active ? 'Attivo' : 'Disabilitato'}</Badge>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Smart lock</h1>
        <Button onClick={() => setOpen(true)}>Aggiungi lock</Button>
      </div>

      <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
        Configurato il provider, TouraCore genera automaticamente il PIN per ogni prenotazione entro la finestra check-in/check-out e lo invia via email/SMS al guest.
      </div>

      <DataTable columns={columns} data={locks} keyExtractor={(l) => l.id} emptyMessage="Nessun lock configurato." />

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Aggiungi smart lock">
        <div className="space-y-4">
          <Select
            label="Provider"
            options={[
              { value: 'nuki', label: 'Nuki' },
              { value: 'ttlock', label: 'TTLock' },
              { value: 'igloohome', label: 'Igloohome' },
              { value: 'salto', label: 'Salto' },
              { value: 'other', label: 'Altro' },
            ]}
            value={form.provider}
            onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
          />
          <Input
            label="Device ID provider"
            value={form.providerDeviceId}
            onChange={(e) => setForm((p) => ({ ...p, providerDeviceId: e.target.value }))}
          />
          <Input
            label="Nome personalizzato"
            value={form.nickname}
            onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={handleAdd} disabled={!form.providerDeviceId}>Aggiungi</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
