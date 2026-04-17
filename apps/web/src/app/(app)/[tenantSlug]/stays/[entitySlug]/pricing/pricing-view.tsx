'use client'

import { useState, useTransition } from 'react'
import { Plus, Zap, TrendingUp, TrendingDown, X, Check } from 'lucide-react'
import { createPricingRule, regenerateSuggestions, applySuggestion, dismissSuggestion, deleteRule } from './actions'

interface Rule {
  id: string; ruleType: string; name: string; config: Record<string, unknown>
  adjustmentType: 'percent' | 'fixed'; adjustmentValue: number; priority: number
}

interface Suggestion {
  id: string; roomTypeId: string; serviceDate: string
  currentPrice: number; suggestedPrice: number; confidencePct: number; reason: string
}

interface Props {
  tenantSlug: string; entitySlug: string; entityId: string
  rules: Rule[]; suggestions: Suggestion[]
  roomTypes: Array<{ id: string; name: string }>
}

export function PricingView(props: Props) {
  const { tenantSlug, entitySlug, entityId, rules, suggestions, roomTypes } = props
  const [showRule, setShowRule] = useState(false)
  const [pending, startTransition] = useTransition()
  const rtMap = new Map(roomTypes.map((rt) => [rt.id, rt.name]))

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateSuggestions(entityId, tenantSlug, entitySlug)
      alert(`${result.count} suggestions generate`)
    })
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <div>
          <p className="text-sm font-medium">{rules.length} regole attive · {suggestions.length} suggestions pending</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRegenerate} disabled={pending}
            className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700">
            <Zap className="h-4 w-4"/> {pending ? 'Genero…' : 'Genera suggestions'}
          </button>
          <button onClick={() => setShowRule(true)}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            <Plus className="h-4 w-4"/> Nuova regola
          </button>
        </div>
      </div>

      {/* Rules */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Regole pricing</h2>
        </div>
        {rules.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Nessuna regola configurata. Default: weekend +15%, last-minute -15%, high occupancy +20%</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Aggiustamento</th>
                <th className="px-4 py-2 text-right">Priorità</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{r.ruleType}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {r.adjustmentValue >= 0 ? '+' : ''}{r.adjustmentValue}{r.adjustmentType === 'percent' ? '%' : '€'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">{r.priority}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => {
                      if (confirm(`Disattiva ${r.name}?`)) startTransition(async () => { await deleteRule(r.id, tenantSlug, entitySlug) })
                    }} className="text-gray-400 hover:text-red-600"><X className="h-3 w-3"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Suggestions */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Suggestions pricing</h2>
        </div>
        {suggestions.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Nessuna suggestion. Click "Genera" per calcolare.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Tipologia</th>
                <th className="px-4 py-2 text-right">Attuale</th>
                <th className="px-4 py-2 text-right">Suggerito</th>
                <th className="px-4 py-2 text-right">Δ</th>
                <th className="px-4 py-2 text-left">Motivo</th>
                <th className="px-4 py-2 text-right">Confidence</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => {
                const delta = s.suggestedPrice - s.currentPrice
                const deltaPct = s.currentPrice > 0 ? (delta / s.currentPrice) * 100 : 0
                return (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs">{s.serviceDate}</td>
                    <td className="px-4 py-2 text-xs">{rtMap.get(s.roomTypeId) ?? s.roomTypeId.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-right">€ {s.currentPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-medium">€ {s.suggestedPrice.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {delta >= 0 ? '+' : ''}{deltaPct.toFixed(0)}%
                      {delta > 0 ? <TrendingUp className="ml-1 inline h-3 w-3"/> : delta < 0 ? <TrendingDown className="ml-1 inline h-3 w-3"/> : null}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{s.reason}</td>
                    <td className="px-4 py-2 text-right text-xs">{s.confidencePct}%</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startTransition(async () => { await applySuggestion(s.id, tenantSlug, entitySlug) })}
                          className="flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          <Check className="h-3 w-3"/> Applica
                        </button>
                        <button onClick={() => startTransition(async () => { await dismissSuggestion(s.id, tenantSlug, entitySlug) })}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100">
                          <X className="h-3 w-3"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {showRule && <RuleDialog entityId={entityId} tenantSlug={tenantSlug} entitySlug={entitySlug} onClose={() => setShowRule(false)}/>}
    </>
  )
}

function RuleDialog(props: { entityId: string; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    ruleType: 'occupancy_based' as 'occupancy_based'|'lead_time'|'day_of_week'|'last_minute'|'early_bird',
    name: '',
    adjustmentType: 'percent' as 'percent' | 'fixed',
    adjustmentValue: 10,
    priority: 50,
    thresholdPct: 70,
    direction: 'above' as 'above' | 'below',
    minDays: 0,
    maxDays: 7,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        let config: Record<string, unknown> = {}
        if (form.ruleType === 'occupancy_based') config = { thresholdPct: form.thresholdPct, direction: form.direction }
        if (form.ruleType === 'lead_time') config = { minDays: form.minDays, maxDays: form.maxDays }
        startTransition(async () => {
          await createPricingRule({
            entityId: props.entityId, tenantSlug: props.tenantSlug, entitySlug: props.entitySlug,
            ruleType: form.ruleType, name: form.name, config,
            adjustmentType: form.adjustmentType, adjustmentValue: form.adjustmentValue,
            priority: form.priority,
          })
          props.onClose()
        })
      }} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuova regola pricing</h2>
        <input required placeholder="Nome regola" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <select value={form.ruleType}
          onChange={(e) => setForm({ ...form, ruleType: e.target.value as 'occupancy_based' })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="occupancy_based">Occupancy-based</option>
          <option value="lead_time">Lead time</option>
          <option value="day_of_week">Day of week</option>
          <option value="last_minute">Last minute (≤3gg)</option>
          <option value="early_bird">Early bird (≥60gg)</option>
        </select>

        {form.ruleType === 'occupancy_based' && (
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} max={100} value={form.thresholdPct}
              onChange={(e) => setForm({ ...form, thresholdPct: Number(e.target.value) })}
              placeholder="Soglia %" className="rounded border border-gray-300 px-2 py-1.5 text-sm"/>
            <select value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as 'above' })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm">
              <option value="above">Sopra soglia</option>
              <option value="below">Sotto soglia</option>
            </select>
          </div>
        )}

        {form.ruleType === 'lead_time' && (
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} placeholder="Min giorni" value={form.minDays}
              onChange={(e) => setForm({ ...form, minDays: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"/>
            <input type="number" min={0} placeholder="Max giorni" value={form.maxDays}
              onChange={(e) => setForm({ ...form, maxDays: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"/>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <select value={form.adjustmentType}
            onChange={(e) => setForm({ ...form, adjustmentType: e.target.value as 'percent' })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm">
            <option value="percent">Percentuale %</option>
            <option value="fixed">Importo fisso €</option>
          </select>
          <input type="number" step="0.5" required placeholder="Valore" value={form.adjustmentValue}
            onChange={(e) => setForm({ ...form, adjustmentValue: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        </div>

        <div>
          <label className="text-xs text-gray-600">Priorità (1-100)</label>
          <input type="number" min={1} max={100} value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Crea regola'}</button>
        </div>
      </form>
    </div>
  )
}
