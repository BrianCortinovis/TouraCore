'use client'

import { useState, useTransition } from 'react'
import { Plus, Bell, Check, X } from 'lucide-react'
import { addWaitlistEntry, updateWaitlistStatus, seatWaitlistNow } from './actions'

interface Entry {
  id: string
  guestName: string
  phone: string | null
  partySize: number
  requestedAt: string
  estimatedWaitMin: number | null
  notifiedAt: string | null
  status: 'waiting' | 'notified'
  notes: string | null
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  entries: Entry[]
}

export function WaitlistView({ tenantSlug, entitySlug, restaurantId, entries }: Props) {
  const [showDialog, setShowDialog] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAction(fn: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-600">{entries.length} in attesa</p>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Aggiungi walk-in
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Nessun walk-in in attesa.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Ospite</th>
                <th className="px-4 py-2 text-left">Coperti</th>
                <th className="px-4 py-2 text-left">Attesa</th>
                <th className="px-4 py-2 text-left">Stato</th>
                <th className="px-4 py-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const requestedDate = new Date(e.requestedAt)
                const waitedMin = Math.floor((Date.now() - requestedDate.getTime()) / 60_000)
                return (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <p className="font-medium">{e.guestName}</p>
                      {e.phone && <p className="text-xs text-gray-500">{e.phone}</p>}
                    </td>
                    <td className="px-4 py-2">{e.partySize}</td>
                    <td className="px-4 py-2 text-xs">
                      {waitedMin}min {e.estimatedWaitMin ? `· stima ${e.estimatedWaitMin}min` : ''}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                        e.status === 'waiting' ? 'border-yellow-300 bg-yellow-50 text-yellow-800' : 'border-blue-300 bg-blue-50 text-blue-800'
                      }`}>
                        {e.status === 'waiting' ? 'In attesa' : 'Notificato'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {e.status === 'waiting' && (
                          <button
                            onClick={() =>
                              handleAction(() =>
                                updateWaitlistStatus({
                                  waitlistId: e.id,
                                  tenantSlug,
                                  entitySlug,
                                  status: 'notified',
                                }),
                              )
                            }
                            disabled={pending}
                            className="flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            <Bell className="h-3 w-3" />
                            Notifica
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleAction(() =>
                              seatWaitlistNow({
                                waitlistId: e.id,
                                restaurantId,
                                tenantSlug,
                                entitySlug,
                              }),
                            )
                          }
                          disabled={pending}
                          className="flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                        >
                          <Check className="h-3 w-3" />
                          Siedi
                        </button>
                        <button
                          onClick={() =>
                            handleAction(() =>
                              updateWaitlistStatus({
                                waitlistId: e.id,
                                tenantSlug,
                                entitySlug,
                                status: 'abandoned',
                              }),
                            )
                          }
                          disabled={pending}
                          className="flex items-center rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showDialog && (
        <AddDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  )
}

function AddDialog({
  restaurantId,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    partySize: 2,
    estimatedWaitMin: 15,
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await addWaitlistEntry({
        restaurantId,
        tenantSlug,
        entitySlug,
        guestName: form.guestName,
        phone: form.phone || undefined,
        partySize: form.partySize,
        estimatedWaitMin: form.estimatedWaitMin,
        notes: form.notes || undefined,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Aggiungi walk-in</h2>
        <div className="space-y-2 text-sm">
          <div>
            <label className="text-xs text-gray-600">Nome</label>
            <input
              required
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Coperti</label>
              <input
                type="number"
                min={1}
                value={form.partySize}
                onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Stima attesa (min)</label>
            <input
              type="number"
              min={0}
              value={form.estimatedWaitMin}
              onChange={(e) => setForm({ ...form, estimatedWaitMin: Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Note</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Salvo…' : 'Aggiungi'}
          </button>
        </div>
      </form>
    </div>
  )
}
