'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Card, CardContent } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listCompetitorPricesAction, recordCompetitorPriceAction } from '../competitive-actions'

interface CompetitorPrice {
  id: string
  competitor_name: string
  sample_date: string
  price: number
  currency: string
  source: string
  created_at: string
}

export default function CompetitivePage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const propertyId = useAuthStore((s) => s.property?.id)
  const [days, setDays] = useState(30)
  const [prices, setPrices] = useState<CompetitorPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [competitorName, setCompetitorName] = useState('')
  const [sampleDate, setSampleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState<number | ''>('')
  const [currency, setCurrency] = useState('EUR')

  const load = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    const data = (await listCompetitorPricesAction(propertyId, days)) as CompetitorPrice[]
    setPrices(data)
    setLoading(false)
  }, [propertyId, days])

  useEffect(() => { void load() }, [load])

  const handleSave = async () => {
    if (!tenantId || !propertyId || !competitorName || typeof price !== 'number') return
    const result = await recordCompetitorPriceAction({
      tenantId,
      entityId: propertyId,
      competitorName,
      sampleDate,
      price,
      currency,
    })
    if (result.success) {
      setShowForm(false)
      setCompetitorName('')
      setPrice('')
      void load()
    } else {
      alert(`Errore: ${result.error}`)
    }
  }

  const byCompetitor = prices.reduce<Record<string, CompetitorPrice[]>>((acc, p) => {
    const arr = acc[p.competitor_name] ?? []
    arr.push(p)
    acc[p.competitor_name] = arr
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitive Pricing</h1>
          <p className="text-sm text-gray-500">Price-watch concorrenti</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value={7}>7 giorni</option>
            <option value={30}>30 giorni</option>
            <option value={90}>90 giorni</option>
          </select>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Annulla' : 'Nuovo prezzo'}
          </Button>
        </div>
      </header>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600">Nome concorrente</label>
                <input
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Data rilevazione</label>
                <input
                  type="date"
                  value={sampleDate}
                  onChange={(e) => setSampleDate(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Prezzo</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Valuta</label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
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
      ) : prices.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna rilevazione nel periodo</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCompetitor).map(([name, samples]) => {
            const sorted = [...samples].sort((a, b) => a.sample_date.localeCompare(b.sample_date))
            const last = sorted[sorted.length - 1]
            if (!last) return null
            const avg = sorted.reduce((s, p) => s + Number(p.price), 0) / sorted.length
            const min = Math.min(...sorted.map((p) => Number(p.price)))
            const max = Math.max(...sorted.map((p) => Number(p.price)))
            return (
              <Card key={name}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{name}</h3>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>min {min.toFixed(2)}</span>
                      <span>avg {avg.toFixed(2)}</span>
                      <span>max {max.toFixed(2)}</span>
                      <span className="font-bold text-gray-700">last {Number(last.price).toFixed(2)} {last.currency}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:grid-cols-15">
                    {sorted.slice(-30).map((p) => (
                      <div key={p.id} className="text-center text-[10px]">
                        <div className="font-mono">{Number(p.price).toFixed(0)}</div>
                        <div className="text-gray-400">{p.sample_date.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
