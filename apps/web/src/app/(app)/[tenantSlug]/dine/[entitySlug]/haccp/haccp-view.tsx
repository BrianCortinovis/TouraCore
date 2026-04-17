'use client'

import { useState, useTransition } from 'react'
import { Thermometer, Plus, AlertTriangle } from 'lucide-react'
import { recordTemperature } from './actions'

interface Temp {
  id: string
  equipmentCode: string
  equipmentName: string
  temperatureC: number
  readingAt: string
  notes: string | null
}

interface Lot {
  id: string
  ingredientName: string
  lotCode: string
  receivedDate: string
  expiryDate: string | null
  qtyRemaining: number
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  temperatures: Temp[]
  lots: Lot[]
}

export function HACCPView({ tenantSlug, entitySlug, restaurantId, temperatures, lots }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const today = new Date()
  const expiringSoon = lots.filter((l) => {
    if (!l.expiryDate) return false
    const exp = new Date(l.expiryDate)
    const days = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days <= 3
  })

  return (
    <>
      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" />
          {expiringSoon.length} lotti in scadenza entro 3 giorni
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Thermometer className="h-4 w-4 text-blue-600" />
              Registro temperature
            </h2>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3 w-3" /> Rilevazione
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 text-left">Quando</th>
                  <th className="px-3 py-1.5 text-left">Apparecchio</th>
                  <th className="px-3 py-1.5 text-right">°C</th>
                </tr>
              </thead>
              <tbody>
                {temperatures.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500">
                      {new Date(t.readingAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-1.5">{t.equipmentName}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${
                      t.temperatureC > 8 || t.temperatureC < -25 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {t.temperatureC.toFixed(1)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-3">
            <h2 className="text-sm font-semibold">Lotti ingredienti</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 text-left">Ingrediente</th>
                  <th className="px-3 py-1.5 text-left">Lotto</th>
                  <th className="px-3 py-1.5 text-left">Scadenza</th>
                  <th className="px-3 py-1.5 text-right">Rimasti</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => {
                  const exp = l.expiryDate ? new Date(l.expiryDate) : null
                  const days = exp ? Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
                  const urgent = days !== null && days <= 3
                  return (
                    <tr key={l.id} className={`border-t border-gray-100 ${urgent ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-1.5 font-medium">{l.ingredientName}</td>
                      <td className="px-3 py-1.5 text-gray-500">{l.lotCode}</td>
                      <td className={`px-3 py-1.5 text-xs ${urgent ? 'font-bold text-red-700' : 'text-gray-600'}`}>
                        {l.expiryDate ?? '—'} {days !== null && `(${days}gg)`}
                      </td>
                      <td className="px-3 py-1.5 text-right">{l.qtyRemaining.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showAdd && (
        <AddTempDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}

function AddTempDialog({
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
    equipmentCode: 'frigo1',
    equipmentName: 'Frigo 1',
    temperatureC: 4,
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await recordTemperature({
        restaurantId,
        tenantSlug,
        entitySlug,
        equipmentCode: form.equipmentCode,
        equipmentName: form.equipmentName,
        temperatureC: form.temperatureC,
        notes: form.notes || undefined,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuova rilevazione</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            placeholder="Codice (frigo1, freezer2)"
            value={form.equipmentCode}
            onChange={(e) => setForm({ ...form, equipmentCode: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            required
            placeholder="Nome (Frigo cucina)"
            value={form.equipmentName}
            onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            required
            type="number"
            step="0.1"
            placeholder="°C"
            value={form.temperatureC}
            onChange={(e) => setForm({ ...form, temperatureC: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Note"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Salvo…' : 'Registra'}
          </button>
        </div>
      </form>
    </div>
  )
}
