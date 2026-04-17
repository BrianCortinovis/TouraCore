'use client'

import { useState, useTransition } from 'react'
import { Plus, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { createIngredient, recordStockMovement } from './actions'

interface Ingredient {
  id: string
  name: string
  category: string | null
  unitOfMeasure: string
  avgCost: number
  stockQty: number
  lowStockThreshold: number | null
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  ingredients: Ingredient[]
}

export function InventoryView({ tenantSlug, entitySlug, restaurantId, ingredients }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [movementFor, setMovementFor] = useState<Ingredient | null>(null)

  const lowStock = ingredients.filter(
    (i) => i.lowStockThreshold !== null && i.stockQty <= i.lowStockThreshold,
  )

  return (
    <>
      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <span>{lowStock.length} ingredienti sotto soglia: {lowStock.map((i) => i.name).join(', ')}</span>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-600">{ingredients.length} ingredienti</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuovo ingrediente
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Categoria</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2 text-right">Costo medio</th>
              <th className="px-4 py-2 text-right">Soglia</th>
              <th className="px-4 py-2 text-right">Movimenti</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => {
              const isLow = i.lowStockThreshold !== null && i.stockQty <= i.lowStockThreshold
              return (
                <tr key={i.id} className={`border-t border-gray-100 ${isLow ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-2 font-medium">{i.name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{i.category ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={isLow ? 'font-bold text-amber-700' : ''}>
                      {i.stockQty.toFixed(3)} {i.unitOfMeasure}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-xs">€ {i.avgCost.toFixed(4)}</td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">
                    {i.lowStockThreshold !== null ? `${i.lowStockThreshold.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setMovementFor(i)}
                      className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:border-blue-400"
                    >
                      Movimento
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddIngredientDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setShowAdd(false)}
        />
      )}
      {movementFor && (
        <MovementDialog
          ingredient={movementFor}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setMovementFor(null)}
        />
      )}
    </>
  )
}

function AddIngredientDialog({
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
    name: '',
    category: '',
    unitOfMeasure: 'kg' as 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'bottle' | 'box',
    avgCost: 0,
    stockQty: 0,
    lowStockThreshold: 0,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createIngredient({
        restaurantId,
        tenantSlug,
        entitySlug,
        name: form.name,
        category: form.category || undefined,
        unitOfMeasure: form.unitOfMeasure,
        avgCost: form.avgCost,
        stockQty: form.stockQty,
        lowStockThreshold: form.lowStockThreshold || undefined,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuovo ingrediente</h2>
        <input
          required
          placeholder="Nome (es. Pasta Spaghetti)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Categoria (es. Pasta secca)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.unitOfMeasure}
            onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value as typeof form.unitOfMeasure })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="ml">ml</option>
            <option value="pcs">pcs</option>
            <option value="bottle">bottle</option>
            <option value="box">box</option>
          </select>
          <input
            type="number"
            step="0.0001"
            placeholder="Costo medio €"
            value={form.avgCost || ''}
            onChange={(e) => setForm({ ...form, avgCost: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="0.001"
            placeholder="Stock iniziale"
            value={form.stockQty || ''}
            onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Soglia low-stock"
            value={form.lowStockThreshold || ''}
            onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Salvo…' : 'Crea'}
          </button>
        </div>
      </form>
    </div>
  )
}

function MovementDialog({
  ingredient,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  ingredient: Ingredient
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    movementType: 'IN' as 'IN' | 'OUT' | 'ADJUST' | 'WASTE',
    qty: 0,
    unitCost: ingredient.avgCost,
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await recordStockMovement({
        ingredientId: ingredient.id,
        movementType: form.movementType,
        qty: form.qty,
        unitCost: form.unitCost,
        notes: form.notes || undefined,
        tenantSlug,
        entitySlug,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Movimento — {ingredient.name}</h2>
        <p className="text-xs text-gray-500">Stock attuale: {ingredient.stockQty.toFixed(3)} {ingredient.unitOfMeasure}</p>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.movementType}
            onChange={(e) => setForm({ ...form, movementType: e.target.value as typeof form.movementType })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="IN">IN — Acquisto</option>
            <option value="OUT">OUT — Consumo manuale</option>
            <option value="WASTE">WASTE — Scarto</option>
            <option value="ADJUST">ADJUST — Aggiustamento</option>
          </select>
          <input
            type="number"
            step="0.001"
            required
            placeholder="Quantità"
            value={form.qty || ''}
            onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          {form.movementType === 'IN' && (
            <input
              type="number"
              step="0.0001"
              placeholder="Costo unitario €"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          )}
          <input
            placeholder="Note"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5 text-sm"
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
