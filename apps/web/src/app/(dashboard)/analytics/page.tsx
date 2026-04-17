'use client'

import { useEffect, useState, useCallback } from 'react'
import { Select } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  getKpiSummaryAction,
  getDailyKpiAction,
  forecastOccupancyAction,
  getSourceMixAction,
} from '../competitive-actions'

interface Summary {
  total_revenue: number
  adr: number
  revpar: number
  occupancy_pct: number
  nights_sold: number
  nights_available: number
}
interface DailyKpi {
  kpi_date: string
  rooms_sold: number
  rooms_available: number
  daily_revenue: number
}
interface Forecast {
  date: string
  on_book_rooms: number
  on_book_revenue: number
  forecast_occupancy_pct: number
  rooms_available: number
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10)
}

export default function AnalyticsPage() {
  const { property } = useAuthStore()
  const [range, setRange] = useState('30')
  const [forecastDays, setForecastDays] = useState('30')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [daily, setDaily] = useState<DailyKpi[]>([])
  const [forecast, setForecast] = useState<Forecast[]>([])
  const [sourceMix, setSourceMix] = useState<Record<string, { count: number; revenue: number }>>({})

  const load = useCallback(async () => {
    if (!property) return
    const from = isoDaysAgo(Number(range))
    const to = new Date().toISOString().slice(0, 10)
    const [s, d, f, m] = await Promise.all([
      getKpiSummaryAction(property.id, from, to),
      getDailyKpiAction(property.id, from, to),
      forecastOccupancyAction(property.id, Number(forecastDays)),
      getSourceMixAction(property.id, from, to),
    ])
    setSummary(s as Summary)
    setDaily(d as DailyKpi[])
    setForecast(f as Forecast[])
    setSourceMix(m as Record<string, { count: number; revenue: number }>)
  }, [property, range, forecastDays])

  useEffect(() => { load() }, [load])

  if (!property) return <div className="py-20 text-center text-gray-500">Caricamento struttura...</div>

  const maxRev = Math.max(1, ...daily.map((d) => Number(d.daily_revenue)))
  const maxForecast = Math.max(1, ...forecast.map((f) => f.forecast_occupancy_pct))
  const totalSourceRev = Object.values(sourceMix).reduce((s, v) => s + v.revenue, 0) || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <Select
          options={[
            { value: '7', label: 'Ultimi 7 giorni' },
            { value: '30', label: 'Ultimi 30 giorni' },
            { value: '90', label: 'Ultimi 90 giorni' },
            { value: '365', label: 'Ultimo anno' },
          ]}
          value={range}
          onChange={(e) => setRange(e.target.value)}
        />
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="Ricavi totali" value={`€${summary.total_revenue.toLocaleString('it-IT')}`} />
          <Kpi label="ADR" value={`€${summary.adr.toFixed(2)}`} />
          <Kpi label="RevPAR" value={`€${summary.revpar.toFixed(2)}`} />
          <Kpi label="Occupancy" value={`${summary.occupancy_pct.toFixed(1)}%`} />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Ricavi giornalieri</h2>
        <div className="flex h-48 items-end gap-1">
          {daily.map((d) => (
            <div
              key={d.kpi_date}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              style={{ height: `${(Number(d.daily_revenue) / maxRev) * 100}%` }}
              title={`${d.kpi_date}: €${Number(d.daily_revenue).toFixed(2)} (${d.rooms_sold}/${d.rooms_available})`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          {daily.length > 0 && <span>{daily[0]?.kpi_date}</span>}
          {daily.length > 0 && <span>{daily[daily.length - 1]?.kpi_date}</span>}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Forecast occupancy</h2>
          <Select
            options={[
              { value: '30', label: '30 giorni' },
              { value: '60', label: '60 giorni' },
              { value: '90', label: '90 giorni' },
            ]}
            value={forecastDays}
            onChange={(e) => setForecastDays(e.target.value)}
          />
        </div>
        <div className="flex h-32 items-end gap-1">
          {forecast.map((f) => (
            <div
              key={f.date}
              className={`flex-1 ${f.forecast_occupancy_pct > 70 ? 'bg-green-500' : f.forecast_occupancy_pct > 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
              style={{ height: `${(f.forecast_occupancy_pct / Math.max(maxForecast, 100)) * 100}%` }}
              title={`${f.date}: ${f.forecast_occupancy_pct}% (${f.on_book_rooms}/${f.rooms_available})`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Source mix</h2>
        <div className="space-y-2">
          {Object.entries(sourceMix).map(([source, stats]) => {
            const pct = (stats.revenue / totalSourceRev) * 100
            return (
              <div key={source}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{source}</span>
                  <span className="text-gray-600">
                    {stats.count} pren · €{stats.revenue.toFixed(2)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {Object.keys(sourceMix).length === 0 && <div className="text-sm text-gray-500">Nessun dato.</div>}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
