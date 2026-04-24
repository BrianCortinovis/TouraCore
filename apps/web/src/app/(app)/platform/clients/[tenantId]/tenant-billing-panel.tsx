'use client'

import { useState, useTransition } from 'react'
import { saveTenantPlatformBillingAction } from '../actions'

interface BillingProfile {
  id: string
  billing_model: string
  subscription_price_eur: number | null
  commission_percent: number | null
  commission_cap_eur: number | null
  commission_min_eur: number | null
  notes: string | null
}

const MODEL_LABELS: Record<string, string> = {
  subscription: 'Abbonamento fisso mensile',
  commission: 'Commissione su prenotazioni',
  hybrid: 'Ibrido (fisso + commissione)',
  free: 'Gratuito',
}

export function TenantBillingPanel({ tenantId, billing }: { tenantId: string; billing: BillingProfile | null }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(!billing)

  const [model, setModel] = useState(billing?.billing_model ?? 'subscription')
  const [fee, setFee] = useState(billing?.subscription_price_eur?.toString() ?? '')
  const [pct, setPct] = useState(billing?.commission_percent?.toString() ?? '')
  const [cap, setCap] = useState(billing?.commission_cap_eur?.toString() ?? '')
  const [min, setMin] = useState(billing?.commission_min_eur?.toString() ?? '')
  const [notes, setNotes] = useState(billing?.notes ?? '')

  const showFee = model === 'subscription' || model === 'hybrid'
  const showComm = model === 'commission' || model === 'hybrid'

  function handleSave() {
    setError(null); setSaved(false)
    startTransition(async () => {
      const res = await saveTenantPlatformBillingAction({
        tenantId,
        billingModel: model as 'subscription' | 'commission' | 'hybrid' | 'free',
        feeMonthlyEur: fee ? parseFloat(fee) : null,
        commissionPct: pct ? parseFloat(pct) : null,
        commissionCapEur: cap ? parseFloat(cap) : null,
        commissionMinEur: min ? parseFloat(min) : null,
        notes: notes || null,
      })
      if (res.ok) { setSaved(true); setOpen(false) }
      else setError(res.error ?? 'Errore')
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Billing piattaforma</h2>
          <p className="mt-0.5 text-xs text-slate-400">Accordo commerciale TouraCore → cliente</p>
        </div>
        <div className="flex items-center gap-3">
          {(billing || saved) && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              model === 'free' ? 'bg-slate-100 text-slate-500 border-slate-200' :
              model === 'subscription' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              model === 'commission' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-purple-50 text-purple-700 border-purple-200'
            }`}>{MODEL_LABELS[model]}</span>
          )}
          <button onClick={() => setOpen(v => !v)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            {open ? 'Chiudi' : billing ? 'Modifica' : 'Configura'}
          </button>
        </div>
      </header>

      {!open && billing && (
        <div className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
          {billing.subscription_price_eur != null && <div><p className="text-xs text-slate-400">Canone</p><p className="font-medium">€{billing.subscription_price_eur}/mese</p></div>}
          {billing.commission_percent != null && <div><p className="text-xs text-slate-400">Commissione</p><p className="font-medium">{billing.commission_percent}%</p></div>}
          {billing.commission_cap_eur != null && <div><p className="text-xs text-slate-400">Cap</p><p className="font-medium">€{billing.commission_cap_eur}</p></div>}
          {billing.commission_min_eur != null && <div><p className="text-xs text-slate-400">Minimo</p><p className="font-medium">€{billing.commission_min_eur}</p></div>}
        </div>
      )}
      {!open && !billing && (
        <p className="p-4 text-sm text-slate-400">Nessun accordo — usa i default globali di piattaforma.</p>
      )}

      {open && (
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Modello</label>
              <select value={model} onChange={e => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {Object.entries(MODEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {showFee && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Canone mensile (€)</label>
                <input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)}
                  placeholder="es. 99" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            )}
            {showComm && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Commissione (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={pct} onChange={e => setPct(e.target.value)}
                    placeholder="es. 8" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cap per prenotazione (€)</label>
                  <input type="number" min="0" step="0.01" value={cap} onChange={e => setCap(e.target.value)}
                    placeholder="opzionale" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Minimo mensile (€)</label>
                  <input type="number" min="0" step="0.01" value={min} onChange={e => setMin(e.target.value)}
                    placeholder="opzionale" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Note interne</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Accordo speciale, ecc."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {saved && <p className="mt-2 text-xs text-emerald-600">Accordo salvato.</p>}
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? 'Salvataggio…' : 'Salva accordo'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
