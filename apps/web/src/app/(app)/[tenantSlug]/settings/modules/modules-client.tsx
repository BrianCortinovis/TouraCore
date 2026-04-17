'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, Clock, Gift } from 'lucide-react'
import { toggleModuleAction } from './actions'

type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

interface CatalogEntry {
  code: ModuleCode
  label: string
  description: string | null
  icon: string | null
  base_price_eur: number
  entity_kind: string | null
  order_idx: number
  pausable: boolean
}

interface Override {
  module_code: string
  override_type: string
  valid_until: string | null
  reason: string
}

interface Props {
  tenantSlug: string
  tenantModules: Record<string, { active: boolean; source: string; trial_until?: string }>
  catalog: CatalogEntry[]
  overrides: Override[]
}

const MODULE_EMOJI: Record<ModuleCode, string> = {
  hospitality: '🏨',
  restaurant: '🍽️',
  wellness: '💆',
  experiences: '🗺️',
  bike_rental: '🚴',
  moto_rental: '🏍️',
  ski_school: '⛷️',
}

export function ModulesClient({ tenantSlug, tenantModules, catalog, overrides }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingCode, setPendingCode] = useState<ModuleCode | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleToggle(code: ModuleCode, active: boolean) {
    setMessage(null)
    setPendingCode(code)
    startTransition(async () => {
      const result = await toggleModuleAction({ tenantSlug, moduleCode: code, active })
      if (result.success) {
        setMessage({ type: 'success', text: `Modulo ${active ? 'attivato' : 'disattivato'}` })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore nel salvataggio' })
      }
      setPendingCode(null)
    })
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Moduli attivi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Attiva o disattiva le aree operative del tuo account. Ogni modulo ha un prezzo dedicato.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((m) => {
          const state = tenantModules[m.code]
          const active = state?.active === true
          const source = state?.source
          const override = overrides.find((o) => o.module_code === m.code)
          const isFree = override?.override_type === 'free'
          const trialUntil = state?.trial_until
          const loading = pendingCode === m.code && isPending

          return (
            <div
              key={m.code}
              className={`rounded-lg border-2 p-4 transition-all ${
                active ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{MODULE_EMOJI[m.code]}</span>
                  <span className="font-semibold text-gray-900">{m.label}</span>
                </div>
                <ToggleSwitch
                  enabled={active}
                  loading={loading}
                  onChange={(v) => handleToggle(m.code, v)}
                />
              </div>

              {m.description && <p className="text-xs text-gray-500">{m.description}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  €{Number(m.base_price_eur).toFixed(0)}/mese
                </span>
                {isFree && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <Gift className="h-3 w-3" />
                    Gratis
                  </span>
                )}
                {source === 'trial' && trialUntil && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <Clock className="h-3 w-3" />
                    Trial fino a {new Date(trialUntil).toLocaleDateString('it-IT')}
                  </span>
                )}
                {source === 'subscription' && active && !isFree && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Abbonamento attivo
                  </span>
                )}
                {m.pausable && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    Pausabile stagionale
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Fatturazione</h3>
        <p className="mt-1 text-sm text-slate-600">
          Gestisci piano, metodo di pagamento e fatture dalla pagina dedicata.
        </p>
        <Link
          href={`/${tenantSlug}/settings/billing`}
          className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Vai alla fatturazione
        </Link>
      </div>
    </div>
  )
}

function ToggleSwitch({
  enabled,
  loading,
  onChange,
}: {
  enabled: boolean
  loading: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      } ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <Loader2 className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
      ) : (
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      )}
    </button>
  )
}
