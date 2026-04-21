'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent } from '@touracore/ui'
import { getFxRateAction, upsertFxRateAction } from '../competitive-actions'

const COMMON_PAIRS: Array<{ base: string; quote: string }> = [
  { base: 'EUR', quote: 'USD' },
  { base: 'EUR', quote: 'GBP' },
  { base: 'EUR', quote: 'CHF' },
  { base: 'EUR', quote: 'JPY' },
  { base: 'USD', quote: 'EUR' },
]

interface RateRow {
  base: string
  quote: string
  rate: number
  date: string
}

export default function FxRatesPage() {
  const [rows, setRows] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [base, setBase] = useState('EUR')
  const [quote, setQuote] = useState('USD')
  const [rate, setRate] = useState<number | ''>('')
  const [rateDate, setRateDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const results = await Promise.all(
        COMMON_PAIRS.map(async (p) => {
          const r = await getFxRateAction(p.base, p.quote)
          return { base: p.base, quote: p.quote, rate: r.rate, date: r.date }
        })
      )
      setRows(results)
      setLoading(false)
    })()
  }, [])

  const handleSave = async () => {
    if (typeof rate !== 'number' || rate <= 0) return
    const result = await upsertFxRateAction({
      base: base.toUpperCase(),
      quote: quote.toUpperCase(),
      rate,
      rateDate,
      source: 'manual',
    })
    if (result.success) {
      setShowForm(false)
      setRate('')
      // ricarica
      const fresh = await getFxRateAction(base.toUpperCase(), quote.toUpperCase())
      setRows((rs) => {
        const idx = rs.findIndex((r) => r.base === base.toUpperCase() && r.quote === quote.toUpperCase())
        const newRow: RateRow = { base: base.toUpperCase(), quote: quote.toUpperCase(), rate: fresh.rate, date: fresh.date }
        if (idx >= 0) { rs[idx] = newRow; return [...rs] }
        return [...rs, newRow]
      })
    } else {
      alert(`Errore: ${result.error}`)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cambio Valute</h1>
          <p className="text-sm text-gray-500">Tassi multivaluta per fatturazione cross-currency</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annulla' : 'Inserisci tasso'}
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Base</label>
                <input
                  value={base}
                  onChange={(e) => setBase(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Quote</label>
                <input
                  value={quote}
                  onChange={(e) => setQuote(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Tasso (1 {base} = ? {quote})</label>
                <input
                  type="number"
                  step="0.000001"
                  value={rate}
                  onChange={(e) => setRate(e.target.value ? Number(e.target.value) : '')}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Data tasso</label>
                <input
                  type="date"
                  value={rateDate}
                  onChange={(e) => setRateDate(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <Button onClick={handleSave}>Salva</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={`${r.base}-${r.quote}`}>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-gray-500">{r.base} → {r.quote}</div>
                <div className="mt-1 font-mono text-2xl font-bold">{r.rate.toFixed(6)}</div>
                <div className="text-xs text-gray-400">data: {r.date}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Nota: il cron <code className="rounded bg-gray-100 px-1">/api/cron/fx-rates</code> aggiorna automaticamente i tassi via ECB ogni mattina (6:00).
        Inserimento manuale serve per tassi custom o quando ECB non copre la coppia.
      </p>
    </div>
  )
}
