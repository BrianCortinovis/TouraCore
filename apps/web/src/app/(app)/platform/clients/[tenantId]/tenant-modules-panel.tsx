'use client'

import { useState, useTransition } from 'react'
import { toggleTenantModuleAction } from '../actions'

const ALL_MODULES = [
  { code: 'hospitality', label: 'Struttura ricettiva' },
  { code: 'restaurant', label: 'Ristorazione' },
  { code: 'wellness', label: 'Wellness / SPA' },
  { code: 'experiences', label: 'Esperienze / Tour' },
  { code: 'bike_rental', label: 'Noleggio bike' },
  { code: 'moto_rental', label: 'Noleggio moto' },
  { code: 'ski_school', label: 'Scuola sci' },
] as const

type ModuleCode = typeof ALL_MODULES[number]['code']

export function TenantModulesPanel({
  tenantId,
  modules,
}: {
  tenantId: string
  modules: Record<string, { active: boolean; source: string }>
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  function toggle(code: ModuleCode, currentActive: boolean) {
    startTransition(async () => {
      const res = await toggleTenantModuleAction({ tenantId, moduleCode: code, active: !currentActive })
      setFeedback(f => ({ ...f, [code]: res.ok ? (currentActive ? 'Disattivato' : 'Attivato') : (res.error ?? 'Errore') }))
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Moduli attivi</h2>
        <p className="mt-0.5 text-xs text-slate-400">Attiva o disattiva i moduli per questo cliente</p>
      </header>
      <ul className="divide-y divide-slate-100">
        {ALL_MODULES.map(({ code, label }) => {
          const mod = modules[code]
          const active = mod?.active ?? false
          const source = mod?.source ?? '—'
          return (
            <li key={code} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-400">fonte: {source}</p>
              </div>
              <div className="flex items-center gap-3">
                {feedback[code] && (
                  <span className="text-xs text-emerald-600">{feedback[code]}</span>
                )}
                <button
                  onClick={() => toggle(code, active)}
                  disabled={isPending}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                    active ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
