'use client'

import { useState, useTransition } from 'react'
import { saveRestaurantSettings } from './actions'

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  initial: {
    cuisine_type: string[]
    price_range: number
    capacity_total: number
    avg_turn_minutes: number
    reservation_mode: 'slot' | 'rolling' | 'hybrid'
  }
}

export function RestaurantSettingsForm({ tenantSlug, entitySlug, restaurantId, initial }: Props) {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState(initial)
  const [cuisineInput, setCuisineInput] = useState(initial.cuisine_type.join(', '))
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await saveRestaurantSettings({
        restaurantId,
        tenantSlug,
        entitySlug,
        cuisine_type: cuisineInput.split(',').map((c) => c.trim()).filter(Boolean),
        price_range: state.price_range,
        capacity_total: state.capacity_total,
        avg_turn_minutes: state.avg_turn_minutes,
        reservation_mode: state.reservation_mode,
      })
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Tipologia cucina (separate da virgola)</label>
        <input
          type="text"
          value={cuisineInput}
          onChange={(e) => setCuisineInput(e.target.value)}
          placeholder="italiana, pesce, fusion"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Fascia prezzo</label>
          <select
            value={state.price_range}
            onChange={(e) => setState({ ...state, price_range: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value={1}>€</option>
            <option value={2}>€€</option>
            <option value={3}>€€€</option>
            <option value={4}>€€€€</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Modalità prenotazione</label>
          <select
            value={state.reservation_mode}
            onChange={(e) => setState({ ...state, reservation_mode: e.target.value as 'slot' | 'rolling' | 'hybrid' })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="slot">Slot fisso</option>
            <option value="rolling">Rolling 15min</option>
            <option value="hybrid">Ibrido</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Coperti totali</label>
          <input
            type="number"
            min={0}
            value={state.capacity_total}
            onChange={(e) => setState({ ...state, capacity_total: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Durata media turno (min)</label>
          <input
            type="number"
            min={15}
            max={480}
            value={state.avg_turn_minutes}
            onChange={(e) => setState({ ...state, avg_turn_minutes: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className={`text-sm ${saved ? 'text-green-600' : 'text-gray-400'}`}>
          {saved ? 'Salvato' : pending ? 'Salvataggio…' : ''}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Salva
        </button>
      </div>
    </form>
  )
}
