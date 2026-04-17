'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { createCategory, createItem, updateItem, deleteItem, deleteCategory } from './actions'

const ALLERGENS_UE = [
  { code: 'gluten', label: 'Glutine' },
  { code: 'crustaceans', label: 'Crostacei' },
  { code: 'eggs', label: 'Uova' },
  { code: 'fish', label: 'Pesce' },
  { code: 'peanuts', label: 'Arachidi' },
  { code: 'soybeans', label: 'Soia' },
  { code: 'milk', label: 'Latte' },
  { code: 'nuts', label: 'Frutta a guscio' },
  { code: 'celery', label: 'Sedano' },
  { code: 'mustard', label: 'Senape' },
  { code: 'sesame', label: 'Sesamo' },
  { code: 'sulphites', label: 'Solfiti' },
  { code: 'lupin', label: 'Lupini' },
  { code: 'molluscs', label: 'Molluschi' },
] as const

type AllergenCode = typeof ALLERGENS_UE[number]['code']

interface Category {
  id: string
  name: string
  orderIdx: number
  availableServices: string[]
}

interface Item {
  id: string
  categoryId: string
  name: string
  description: string | null
  priceBase: number
  vatPct: number
  courseNumber: number
  stationCode: string | null
  allergens: string[]
  availableServices: string[]
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  categories: Category[]
  items: Item[]
}

export function MenuEditor({ tenantSlug, entitySlug, restaurantId, categories, items }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories[0]?.id ?? null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [pending, startTransition] = useTransition()

  const activeItems = items.filter((i) => i.categoryId === activeCategoryId)

  function handleAddCategory() {
    const name = prompt('Nome categoria (Antipasti, Primi, Secondi...)')
    if (!name) return
    startTransition(async () => {
      await createCategory({
        restaurantId,
        tenantSlug,
        entitySlug,
        name,
        availableServices: [],
        orderIdx: categories.length,
      })
    })
  }

  function handleAddItem() {
    if (!activeCategoryId) return
    setEditingItem({
      id: '',
      categoryId: activeCategoryId,
      name: '',
      description: null,
      priceBase: 0,
      vatPct: 10,
      courseNumber: 1,
      stationCode: null,
      allergens: [],
      availableServices: [],
    })
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      <aside className="w-56 shrink-0 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Categorie</p>
        </div>
        <div className="space-y-0.5 p-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveCategoryId(c.id)}
                className={`flex-1 rounded px-2 py-1.5 text-left text-sm ${
                  c.id === activeCategoryId ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {c.name}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Eliminare ${c.name}?`)) {
                    startTransition(async () => {
                      await deleteCategory({ categoryId: c.id, tenantSlug, entitySlug })
                      if (c.id === activeCategoryId) setActiveCategoryId(null)
                    })
                  }
                }}
                className="rounded p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddCategory}
            disabled={pending}
            className="flex w-full items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:border-blue-400"
          >
            <Plus className="h-3 w-3" /> Nuova categoria
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <p className="text-sm font-medium">
            {activeCategoryId ? `${activeItems.length} piatti` : 'Seleziona categoria'}
          </p>
          {activeCategoryId && (
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3 w-3" />
              Nuovo piatto
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Prezzo</th>
              <th className="px-3 py-2 text-left">IVA</th>
              <th className="px-3 py-2 text-left">Allergeni</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {activeItems.map((i) => (
              <tr
                key={i.id}
                onClick={() => setEditingItem(i)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-2">
                  <p className="font-medium">{i.name}</p>
                  {i.description && <p className="text-xs text-gray-500">{i.description.slice(0, 60)}</p>}
                </td>
                <td className="px-3 py-2 font-medium">€ {i.priceBase.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{i.vatPct}%</td>
                <td className="px-3 py-2">
                  {i.allergens.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      {i.allergens.length}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Eliminare ${i.name}?`)) {
                        startTransition(async () => {
                          await deleteItem({ itemId: i.id, tenantSlug, entitySlug })
                        })
                      }
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <ItemDialog
          item={editingItem}
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}

function ItemDialog({
  item,
  restaurantId,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  item: Item
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: item.name,
    description: item.description ?? '',
    priceBase: item.priceBase,
    vatPct: item.vatPct,
    courseNumber: item.courseNumber,
    stationCode: item.stationCode ?? '',
    allergens: new Set<AllergenCode>(item.allergens as AllergenCode[]),
  })

  function toggleAllergen(code: AllergenCode) {
    const next = new Set(form.allergens)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setForm({ ...form, allergens: next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      if (item.id === '') {
        await createItem({
          restaurantId,
          categoryId: item.categoryId,
          tenantSlug,
          entitySlug,
          name: form.name,
          description: form.description || undefined,
          priceBase: form.priceBase,
          vatPct: form.vatPct,
          courseNumber: form.courseNumber,
          stationCode: form.stationCode || undefined,
          allergens: Array.from(form.allergens),
          availableServices: [],
        })
      } else {
        await updateItem({
          itemId: item.id,
          tenantSlug,
          entitySlug,
          name: form.name,
          description: form.description || undefined,
          priceBase: form.priceBase,
          vatPct: form.vatPct,
          courseNumber: form.courseNumber,
          stationCode: form.stationCode || undefined,
          allergens: Array.from(form.allergens),
        })
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">{item.id ? 'Modifica' : 'Nuovo'} piatto</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Descrizione</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Prezzo €</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.priceBase}
              onChange={(e) => setForm({ ...form, priceBase: Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">IVA %</label>
            <select
              value={form.vatPct}
              onChange={(e) => setForm({ ...form, vatPct: Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            >
              <option value={4}>4% (alimentari base)</option>
              <option value={10}>10% (food&beverage)</option>
              <option value={22}>22% (alcolici)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Portata</label>
            <select
              value={form.courseNumber}
              onChange={(e) => setForm({ ...form, courseNumber: Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            >
              <option value={1}>1 - Antipasto</option>
              <option value={2}>2 - Primo</option>
              <option value={3}>3 - Secondo</option>
              <option value={4}>4 - Dessert</option>
              <option value={5}>5 - Bevande</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Stazione cucina</label>
            <select
              value={form.stationCode}
              onChange={(e) => setForm({ ...form, stationCode: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            >
              <option value="">—</option>
              <option value="cold">Cold</option>
              <option value="hot">Hot</option>
              <option value="grill">Grill</option>
              <option value="pastry">Pastry</option>
              <option value="bar">Bar</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Allergeni UE 1169/2011</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {ALLERGENS_UE.map((a) => (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => toggleAllergen(a.code)}
                  className={`rounded border px-2 py-0.5 text-[10px] ${
                    form.allergens.has(a.code)
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-300 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
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
            {pending ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  )
}
