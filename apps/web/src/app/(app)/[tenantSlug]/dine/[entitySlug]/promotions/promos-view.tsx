'use client'

import { useState, useTransition } from 'react'
import { Plus, Tag, Calendar, X, Percent } from 'lucide-react'
import { createPromo, deletePromo } from './actions'

interface Promo {
  id: string; code: string | null; name: string; promoType: string
  valuePct: number | null; valueAmount: number | null
  validFrom: string; validTo: string
  maxUses: number | null; usesCount: number
}

interface Props {
  tenantSlug: string; entitySlug: string; restaurantId: string
  promos: Promo[]
}

const PROMO_LABELS: Record<string, string> = {
  early_bird: 'Early Bird',
  happy_hour: 'Happy Hour',
  percent_off: 'Sconto %',
  fixed_off: 'Sconto fisso',
  free_item: 'Item gratis',
  combo: 'Combo',
}

export function PromosView({ tenantSlug, entitySlug, restaurantId, promos }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-600">{promos.length} promo attive</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
          <Plus className="h-4 w-4"/> Nuova promo
        </button>
      </div>

      {promos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          Nessuna promozione configurata
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {promos.map((p) => {
            const isExpired = new Date(p.validTo) < new Date()
            return (
              <div key={p.id} className={`rounded-lg border p-4 ${isExpired ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-amber-300 bg-amber-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-600"/>
                      <h3 className="font-semibold">{p.name}</h3>
                    </div>
                    {p.code && <p className="mt-1 font-mono text-xs text-amber-800">CODE: {p.code}</p>}
                    <p className="mt-1 text-xs text-gray-500">{PROMO_LABELS[p.promoType] ?? p.promoType}</p>
                  </div>
                  <button onClick={() => {
                    if (confirm(`Disattivare ${p.name}?`)) {
                      startTransition(async () => { await deletePromo(p.id, tenantSlug, entitySlug) })
                    }
                  }} className="text-gray-400 hover:text-red-600">
                    <X className="h-4 w-4"/>
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  {p.valuePct !== null && (
                    <span className="flex items-center gap-1 font-bold text-amber-700">
                      <Percent className="h-3 w-3"/> -{p.valuePct}%
                    </span>
                  )}
                  {p.valueAmount !== null && (
                    <span className="font-bold text-amber-700">- € {p.valueAmount.toFixed(2)}</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3"/> {p.validFrom} → {p.validTo}
                  </span>
                  {p.maxUses !== null && (
                    <span>Usi: {p.usesCount}/{p.maxUses}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateDialog restaurantId={restaurantId} tenantSlug={tenantSlug} entitySlug={entitySlug} onClose={() => setShowCreate(false)}/>}
    </>
  )
}

function CreateDialog(props: { restaurantId: string; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    code: '',
    name: '',
    promoType: 'percent_off' as 'early_bird'|'happy_hour'|'percent_off'|'fixed_off'|'free_item'|'combo',
    valuePct: 10,
    valueAmount: 0,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
    maxUses: 0,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await createPromo({
            restaurantId: props.restaurantId,
            tenantSlug: props.tenantSlug,
            entitySlug: props.entitySlug,
            code: form.code || undefined,
            name: form.name,
            promoType: form.promoType,
            valuePct: ['percent_off','early_bird','happy_hour'].includes(form.promoType) ? form.valuePct : undefined,
            valueAmount: form.promoType === 'fixed_off' ? form.valueAmount : undefined,
            validFrom: form.validFrom,
            validTo: form.validTo,
            maxUses: form.maxUses > 0 ? form.maxUses : undefined,
            conditions: {} as Record<string, unknown>,
          })
          props.onClose()
        })
      }} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuova promozione</h2>
        <input required placeholder="Nome (es. Early Bird Pasqua)" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input placeholder="Codice (opt, es. PASQUA20)" value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <select value={form.promoType}
          onChange={(e) => setForm({ ...form, promoType: e.target.value as 'percent_off' })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="percent_off">Sconto percentuale</option>
          <option value="fixed_off">Sconto fisso</option>
          <option value="early_bird">Early bird</option>
          <option value="happy_hour">Happy hour</option>
          <option value="free_item">Item gratis</option>
          <option value="combo">Combo</option>
        </select>
        {['percent_off','early_bird','happy_hour'].includes(form.promoType) ? (
          <input required type="number" min={0} max={100} placeholder="% sconto" value={form.valuePct}
            onChange={(e) => setForm({ ...form, valuePct: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        ) : form.promoType === 'fixed_off' ? (
          <input required type="number" min={0} step="0.5" placeholder="Sconto €" value={form.valueAmount}
            onChange={(e) => setForm({ ...form, valueAmount: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <input required type="date" value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"/>
          <input required type="date" value={form.validTo}
            onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        </div>
        <input type="number" min={0} placeholder="Max usi (0 = illimitato)" value={form.maxUses}
          onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Crea promo'}</button>
        </div>
      </form>
    </div>
  )
}
