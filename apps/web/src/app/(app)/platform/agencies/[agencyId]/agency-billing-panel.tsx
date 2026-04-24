'use client'

import { useState, useTransition } from 'react'
import { saveAgencyPlatformBillingAction } from './billing-actions'

export type AgencyPlatformBillingRecord = {
  billing_model: 'subscription' | 'commission' | 'hybrid' | 'free'
  fee_monthly_eur: number | null
  commission_pct: number | null
  commission_base: 'client_revenue' | 'agency_fee'
  commission_cap_monthly_eur: number | null
  commission_min_monthly_eur: number | null
  commission_threshold_eur: number | null
  notes: string | null
  valid_from: string | null
  valid_until: string | null
}

const MODEL_LABELS: Record<string, string> = {
  subscription: 'Abbonamento fisso mensile',
  commission: 'Commissione su fatturato',
  hybrid: 'Ibrido (fisso + commissione)',
  free: 'Gratuito',
}

const BASE_LABELS: Record<string, string> = {
  client_revenue: 'Fatturato aggregato clienti agenzia',
  agency_fee: 'Commissioni incassate dall\'agenzia',
}

function Badge({ model }: { model: string }) {
  const colors: Record<string, string> = {
    subscription: 'bg-blue-50 text-blue-700 border-blue-200',
    commission: 'bg-amber-50 text-amber-700 border-amber-200',
    hybrid: 'bg-purple-50 text-purple-700 border-purple-200',
    free: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[model] ?? 'bg-slate-100 text-slate-500'}`}>
      {MODEL_LABELS[model] ?? model}
    </span>
  )
}

export function AgencyBillingPanel({
  agencyId,
  billing,
}: {
  agencyId: string
  billing: AgencyPlatformBillingRecord | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(!billing)

  const [model, setModel] = useState(billing?.billing_model ?? 'commission')
  const [fee, setFee] = useState(billing?.fee_monthly_eur?.toString() ?? '')
  const [pct, setPct] = useState(billing?.commission_pct?.toString() ?? '')
  const [base, setBase] = useState(billing?.commission_base ?? 'client_revenue')
  const [cap, setCap] = useState(billing?.commission_cap_monthly_eur?.toString() ?? '')
  const [min, setMin] = useState(billing?.commission_min_monthly_eur?.toString() ?? '')
  const [threshold, setThreshold] = useState(billing?.commission_threshold_eur?.toString() ?? '')
  const [notes, setNotes] = useState(billing?.notes ?? '')
  const [validFrom, setValidFrom] = useState(billing?.valid_from ?? new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = useState(billing?.valid_until ?? '')

  const showFee = model === 'subscription' || model === 'hybrid'
  const showComm = model === 'commission' || model === 'hybrid'

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await saveAgencyPlatformBillingAction({
        agencyId,
        billingModel: model as 'subscription' | 'commission' | 'hybrid' | 'free',
        feeMonthlyEur: fee ? parseFloat(fee) : null,
        commissionPct: pct ? parseFloat(pct) : null,
        commissionBase: base as 'client_revenue' | 'agency_fee',
        commissionCapMonthlyEur: cap ? parseFloat(cap) : null,
        commissionMinMonthlyEur: min ? parseFloat(min) : null,
        commissionThresholdEur: threshold ? parseFloat(threshold) : null,
        notes: notes || null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
      })
      if (res.ok) { setSaved(true); setOpen(false) }
      else setError(res.error ?? 'Errore')
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Accordo commerciale · TouraCore → Agenzia
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Definisci come l&apos;agenzia paga la piattaforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(billing || saved) && <Badge model={model} />}
          <button
            onClick={() => setOpen(v => !v)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {open ? 'Chiudi' : billing ? 'Modifica' : 'Configura'}
          </button>
        </div>
      </header>

      {/* Riepilogo quando chiuso */}
      {!open && billing && (
        <div className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Modello</p>
            <p className="font-medium">{MODEL_LABELS[billing.billing_model]}</p>
          </div>
          {billing.fee_monthly_eur != null && (
            <div>
              <p className="text-xs text-slate-400">Canone mensile</p>
              <p className="font-medium">€{billing.fee_monthly_eur}</p>
            </div>
          )}
          {billing.commission_pct != null && (
            <div>
              <p className="text-xs text-slate-400">Commissione</p>
              <p className="font-medium">{billing.commission_pct}% su {BASE_LABELS[billing.commission_base ?? 'client_revenue']?.split(' ')[0]?.toLowerCase()}</p>
            </div>
          )}
          {billing.commission_cap_monthly_eur != null && (
            <div>
              <p className="text-xs text-slate-400">Cap mensile</p>
              <p className="font-medium">€{billing.commission_cap_monthly_eur}</p>
            </div>
          )}
        </div>
      )}

      {!open && !billing && (
        <p className="p-4 text-sm text-slate-400">Nessun accordo configurato — usa i DEFAULT_TIERS di piattaforma.</p>
      )}

      {open && (
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Modello */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Modello di fatturazione</label>
              <select value={model} onChange={e => setModel(e.target.value as 'subscription' | 'commission' | 'hybrid' | 'free')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {Object.entries(MODEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {/* Canone fisso */}
            {showFee && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Canone mensile (€)</label>
                <input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)}
                  placeholder="es. 299" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            )}

            {/* Commissione */}
            {showComm && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Commissione (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={pct} onChange={e => setPct(e.target.value)}
                    placeholder="es. 5" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Calcolata su</label>
                  <select value={base} onChange={e => setBase(e.target.value as 'client_revenue' | 'agency_fee')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    {Object.entries(BASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Soglia di franchigia (€)</label>
                  <input type="number" min="0" step="1" value={threshold} onChange={e => setThreshold(e.target.value)}
                    placeholder="es. 1000 — sotto soglia no comm." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Minimo mensile garantito (€)</label>
                  <input type="number" min="0" step="0.01" value={min} onChange={e => setMin(e.target.value)}
                    placeholder="opzionale" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cap mensile (€)</label>
                  <input type="number" min="0" step="0.01" value={cap} onChange={e => setCap(e.target.value)}
                    placeholder="opzionale" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </>
            )}

            {/* Date validità */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Valido dal</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Valido fino al (opzionale)</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Note interne</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Accordo speciale, negoziazione, ecc."
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
