'use client'

import { useState, useTransition } from 'react'
import { upsertRatePlanAction, deleteRatePlanAction } from './actions'

type Vertical = 'hospitality' | 'restaurant' | 'bike' | 'experience'
type RatePlanType = 'free_cancellation' | 'deposit_30' | 'partially_refundable_50' | 'non_refundable'

export interface RatePlan {
  id: string
  entity_id: string
  vertical: Vertical
  type: RatePlanType
  name: string
  description: string | null
  refund_window_hours: number
  deposit_pct: number | null
  discount_pct: number | null
  charge_balance_days_before: number | null
  is_default: boolean
  active: boolean
  sort_order: number
}

const TYPE_LABELS: Record<RatePlanType, string> = {
  free_cancellation: 'Cancellazione gratuita',
  deposit_30: 'Acconto 30%',
  partially_refundable_50: 'Parzialmente rimborsabile (50%)',
  non_refundable: 'Non rimborsabile (sconto)',
}

const TYPE_COLORS: Record<RatePlanType, string> = {
  free_cancellation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  deposit_30: 'bg-blue-50 text-blue-700 border-blue-200',
  partially_refundable_50: 'bg-amber-50 text-amber-700 border-amber-200',
  non_refundable: 'bg-rose-50 text-rose-700 border-rose-200',
}

interface Props {
  entityId: string
  vertical: Vertical
  initialPlans: RatePlan[]
}

export function RatePlansEditor({ entityId, vertical, initialPlans }: Props) {
  const [plans] = useState<RatePlan[]>(initialPlans)
  const [creating, setCreating] = useState<RatePlanType | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const existingTypes = new Set(plans.map((p) => p.type))
  const availableTypes: RatePlanType[] = (
    ['free_cancellation', 'deposit_30', 'partially_refundable_50', 'non_refundable'] as RatePlanType[]
  ).filter((t) => !existingTypes.has(t))

  function reload() {
    if (typeof window !== 'undefined') window.location.reload()
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminare questo piano tariffario?')) return
    startTransition(async () => {
      const r = await deleteRatePlanAction(id)
      if (!r.ok) setError(r.error ?? 'Errore eliminazione')
      else reload()
    })
  }

  function handleSetDefault(plan: RatePlan) {
    startTransition(async () => {
      const r = await upsertRatePlanAction({
        id: plan.id,
        entityId: plan.entity_id,
        vertical: plan.vertical,
        type: plan.type,
        isDefault: true,
        active: plan.active,
      })
      if (!r.ok) setError(r.error ?? 'Errore')
      else reload()
    })
  }

  function handleToggleActive(plan: RatePlan) {
    startTransition(async () => {
      const r = await upsertRatePlanAction({
        id: plan.id,
        entityId: plan.entity_id,
        vertical: plan.vertical,
        type: plan.type,
        active: !plan.active,
      })
      if (!r.ok) setError(r.error ?? 'Errore')
      else reload()
    })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Piani tariffari</h2>
          <p className="text-sm text-slate-500">
            Tariffe selezionabili dal cliente al momento del booking. Imposta come "predefinito" quella
            che vuoi proporre per prima.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <ul className="space-y-2">
        {plans.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Nessun piano configurato. Aggiungine uno qui sotto.
          </li>
        )}
        {plans.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border bg-white p-4 ${p.is_default ? 'ring-2 ring-indigo-200' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[p.type]}`}>
                    {TYPE_LABELS[p.type]}
                  </span>
                  {p.is_default && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Predefinito
                    </span>
                  )}
                  {!p.active && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Inattivo
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-medium text-slate-900">{p.name}</h3>
                {p.description && <p className="mt-1 text-xs text-slate-500">{p.description}</p>}
                <dl className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-slate-600 sm:grid-cols-4">
                  {p.deposit_pct != null && (
                    <div>
                      <dt className="text-slate-400">Acconto</dt>
                      <dd>{p.deposit_pct}%</dd>
                    </div>
                  )}
                  {p.discount_pct != null && (
                    <div>
                      <dt className="text-slate-400">Sconto</dt>
                      <dd>{p.discount_pct}%</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-400">Cancellazione</dt>
                    <dd>{p.refund_window_hours > 0 ? `entro ${Math.round(p.refund_window_hours / 24)}gg` : 'No'}</dd>
                  </div>
                  {p.charge_balance_days_before != null && (
                    <div>
                      <dt className="text-slate-400">Saldo</dt>
                      <dd>{p.charge_balance_days_before}gg prima</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex flex-col gap-1.5">
                {!p.is_default && (
                  <button
                    onClick={() => handleSetDefault(p)}
                    disabled={isPending}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    Predefinito
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(p)}
                  disabled={isPending}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                >
                  {p.active ? 'Disattiva' : 'Attiva'}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Elimina
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {availableTypes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Aggiungi piano
          </p>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setCreating(t)
                  startTransition(async () => {
                    const r = await upsertRatePlanAction({
                      entityId,
                      vertical,
                      type: t,
                      isDefault: plans.length === 0,
                      active: true,
                      sortOrder: plans.length,
                    })
                    if (!r.ok) {
                      setError(r.error ?? 'Errore creazione')
                      setCreating(null)
                    } else {
                      reload()
                    }
                  })
                }}
                disabled={isPending}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium hover:opacity-80 ${TYPE_COLORS[t]}`}
              >
                + {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {creating && <p className="mt-2 text-xs text-slate-500">Creazione…</p>}
        </div>
      )}
    </div>
  )
}
