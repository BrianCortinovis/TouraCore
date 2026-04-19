'use client'

import { useState, useTransition } from 'react'
import { updatePlatformConfigAction } from './actions'

interface Plans { [k: string]: { price: number; max_tenants: number } }
interface Tiers { [vertical: string]: Array<{ threshold: number; rate: number }> }

function planLabel(k: string): string {
  if (k === 'agency_starter') return 'Starter'
  if (k === 'agency_pro') return 'Pro'
  if (k === 'agency_enterprise') return 'Enterprise'
  if (k === 'custom') return 'Personalizzato'
  return k.replace('agency_', '')
}

export function ConfigForm({
  plans: initialPlans,
  commissionTiers: initialTiers,
  platformFeeRate: initialFee,
}: {
  plans: unknown
  commissionTiers: unknown
  platformFeeRate: number
}) {
  const [plans, setPlans] = useState<Plans>(initialPlans as Plans)
  const [tiers, setTiers] = useState<Tiers>(initialTiers as Tiers)
  const [fee, setFee] = useState<number>(initialFee)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    setMsg(null)
    start(async () => {
      const res = await updatePlatformConfigAction({
        plans,
        commissionTiers: tiers,
        platformFeeRate: fee,
      })
      setMsg(res.ok ? 'Salvato.' : `Errore: ${res.error}`)
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Piani agenzia</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th>Piano</th>
              <th>Prezzo €/mese</th>
              <th>Clienti massimi</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(plans).map(([k, v]) => (
              <tr key={k} className="border-t border-slate-100">
                <td className="py-2 capitalize">{planLabel(k)}</td>
                <td>
                  <input
                    type="number"
                    className="w-24 rounded border border-slate-300 px-2 py-1"
                    value={v.price}
                    onChange={(e) => setPlans({ ...plans, [k]: { ...v, price: Number(e.target.value) } })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="w-24 rounded border border-slate-300 px-2 py-1"
                    value={v.max_tenants}
                    onChange={(e) => setPlans({ ...plans, [k]: { ...v, max_tenants: Number(e.target.value) } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Commission tiers per vertical</h2>
        {Object.entries(tiers).map(([vertical, t]) => (
          <div key={vertical} className="mb-4">
            <p className="mb-2 text-sm font-medium capitalize">{vertical}</p>
            <div className="flex flex-wrap gap-2">
              {t.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-xs">
                  <span>≥€</span>
                  <input
                    type="number"
                    className="w-20 rounded border border-slate-300 px-1 py-0.5 text-xs"
                    value={tier.threshold}
                    onChange={(e) => {
                      const next = [...t]
                      next[idx] = { ...tier, threshold: Number(e.target.value) }
                      setTiers({ ...tiers, [vertical]: next })
                    }}
                  />
                  <span>→</span>
                  <input
                    type="number"
                    step={0.01}
                    className="w-16 rounded border border-slate-300 px-1 py-0.5 text-xs"
                    value={tier.rate}
                    onChange={(e) => {
                      const next = [...t]
                      next[idx] = { ...tier, rate: Number(e.target.value) }
                      setTiers({ ...tiers, [vertical]: next })
                    }}
                  />
                  <span>×</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Platform fee su bookings</h2>
        <label className="block text-sm">
          <span className="text-slate-600">Rate (es 0.02 = 2%)</span>
          <input
            type="number"
            step={0.001}
            className="mt-1 w-32 rounded border border-slate-300 px-3 py-2"
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Salva config'}
        </button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </div>
    </div>
  )
}
