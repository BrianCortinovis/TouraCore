'use client'

import { useState, useTransition } from 'react'
import { saveEntityBillingAction } from '../actions'

export type EntityBillingRecord = {
  entity_id: string
  billing_model: 'subscription' | 'commission' | 'hybrid' | 'free'
  fee_monthly_eur: number | null
  commission_pct: number | null
  commission_cap_eur: number | null
  notes: string | null
}

interface EntityBillingPanelProps {
  agencySlug: string
  entities: Array<{
    id: string
    name: string
    kind: string
    slug: string
    is_active: boolean
  }>
  billingMap: Record<string, EntityBillingRecord>
}

const MODEL_LABELS: Record<string, string> = {
  subscription: 'Abbonamento fisso mensile',
  commission: 'Commissione su prenotazione',
  hybrid: 'Ibrido (fisso + commissione)',
  free: 'Gratuito',
}

const KIND_LABELS: Record<string, string> = {
  accommodation: 'Struttura ricettiva',
  restaurant: 'Ristorazione',
  activity: 'Esperienza / Tour',
  bike_rental: 'Noleggio bike',
  moto_rental: 'Noleggio moto',
  wellness: 'Wellness / SPA',
  ski_school: 'Scuola sci',
}

function BillingBadge({ model }: { model: string }) {
  const colors: Record<string, string> = {
    subscription: 'bg-blue-50 text-blue-700',
    commission: 'bg-amber-50 text-amber-700',
    hybrid: 'bg-purple-50 text-purple-700',
    free: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[model] ?? 'bg-slate-100 text-slate-500'}`}>
      {MODEL_LABELS[model] ?? model}
    </span>
  )
}

function EntityBillingRow({
  agencySlug,
  entity,
  billing,
}: {
  agencySlug: string
  entity: EntityBillingPanelProps['entities'][0]
  billing: EntityBillingRecord | null
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [model, setModel] = useState<string>(billing?.billing_model ?? 'commission')
  const [feeMonthly, setFeeMonthly] = useState<string>(billing?.fee_monthly_eur?.toString() ?? '')
  const [commPct, setCommPct] = useState<string>(billing?.commission_pct?.toString() ?? '')
  const [commCap, setCommCap] = useState<string>(billing?.commission_cap_eur?.toString() ?? '')
  const [notes, setNotes] = useState<string>(billing?.notes ?? '')

  const showFee = model === 'subscription' || model === 'hybrid'
  const showComm = model === 'commission' || model === 'hybrid'

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await saveEntityBillingAction({
        agencySlug,
        entityId: entity.id,
        billingModel: model as 'subscription' | 'commission' | 'hybrid' | 'free',
        feeMonthlyEur: feeMonthly ? parseFloat(feeMonthly) : null,
        commissionPct: commPct ? parseFloat(commPct) : null,
        commissionCapEur: commCap ? parseFloat(commCap) : null,
        notes: notes || null,
      })
      if (res.ok) {
        setSaved(true)
        setOpen(false)
      } else {
        setError(res.error ?? 'Errore nel salvataggio')
      }
    })
  }

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{entity.name}</p>
          <p className="text-xs text-slate-500">{KIND_LABELS[entity.kind] ?? entity.kind}</p>
        </div>
        <div className="flex items-center gap-3">
          {billing || saved ? (
            <BillingBadge model={model} />
          ) : (
            <span className="text-xs text-slate-400">Non configurato</span>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {open ? 'Chiudi' : 'Configura'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Modello di fatturazione</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {Object.entries(MODEL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {showFee && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Canone mensile (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeMonthly}
                  onChange={(e) => setFeeMonthly(e.target.value)}
                  placeholder="es. 99.00"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}

            {showComm && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Commissione (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commPct}
                    onChange={(e) => setCommPct(e.target.value)}
                    placeholder="es. 10"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cap per prenotazione (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commCap}
                    onChange={(e) => setCommCap(e.target.value)}
                    placeholder="opzionale"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Note interne</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Accordo speciale, esenzioni, ecc."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? 'Salvataggio…' : 'Salva accordo'}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function EntityBillingPanel({ agencySlug, entities, billingMap }: EntityBillingPanelProps) {
  if (entities.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Accordi commerciali per attività
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Commissione e fatturazione configurate per singola struttura o attività
        </p>
      </header>
      <ul className="divide-y divide-slate-100">
        {entities.map((e) => (
          <EntityBillingRow
            key={e.id}
            agencySlug={agencySlug}
            entity={e}
            billing={billingMap[e.id] ?? null}
          />
        ))}
      </ul>
    </section>
  )
}
