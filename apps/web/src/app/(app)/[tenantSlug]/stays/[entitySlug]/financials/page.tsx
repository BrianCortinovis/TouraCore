'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Card, CardContent, Input } from '@touracore/ui'
import {
  TrendingUp, RefreshCw, AlertCircle,
} from 'lucide-react'
import { loadFinancialDashboardAction } from './actions'

interface Summary {
  total_gross: number
  total_commissions: number
  total_tourist_tax: number
  total_cedolare_secca: number
  total_iva: number
  total_ritenuta_ota: number
  total_net_income: number
  total_paid: number
  total_balance: number
  reservation_count: number
}

interface MonthlyData {
  month: string
  gross_amount: number
  net_income: number
  commission_amount: number
  reservation_count: number
}

interface ChannelData {
  channel: string
  gross_amount: number
  commission_amount: number
  reservation_count: number
  avg_commission_rate: number
}

interface DirectVsOta {
  direct_gross: number
  direct_net: number
  direct_count: number
  ota_gross: number
  ota_net: number
  ota_commissions: number
  ota_count: number
  direct_percentage: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

const MONTH_LABELS: Record<string, string> = {
  '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mag', '06': 'Giu',
  '07': 'Lug', '08': 'Ago', '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic',
}

export default function FinancialsPage() {
  const now = new Date()
  const yearStart = `${now.getFullYear()}-01-01`
  const yearEnd = `${now.getFullYear()}-12-31`

  const [dateFrom, setDateFrom] = useState(yearStart)
  const [dateTo, setDateTo] = useState(yearEnd)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [channels, setChannels] = useState<ChannelData[]>([])
  const [directVsOta, setDirectVsOta] = useState<DirectVsOta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await loadFinancialDashboardAction(dateFrom, dateTo)
    if (result.success && result.data) {
      setSummary(result.data.summary as Summary)
      setMonthly(result.data.monthly as MonthlyData[])
      setChannels(result.data.channels as ChannelData[])
      setDirectVsOta(result.data.directVsOta as DirectVsOta)
    } else {
      setError(result.error ?? 'Errore')
    }
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { void loadData() }, [loadData])

  const maxMonthGross = Math.max(1, ...monthly.map(m => m.gross_amount))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Andamento finanziario
          </h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, commissioni, e reddito netto</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-gray-400">→</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento...</div>
      ) : (
        <>
          {/* KPI summary */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_gross)}</p>
                  <p className="text-xs text-gray-500">Lordo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{fmt(summary.total_net_income)}</p>
                  <p className="text-xs text-gray-500">Netto</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{fmt(summary.total_commissions)}</p>
                  <p className="text-xs text-gray-500">Commissioni</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">{summary.reservation_count}</p>
                  <p className="text-xs text-gray-500">Prenotazioni</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Fiscal breakdown */}
          {summary && (
            <Card>
              <CardContent className="py-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettaglio fiscale</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Tassa soggiorno</span>
                    <span className="font-medium">{fmt(summary.total_tourist_tax)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Cedolare secca</span>
                    <span className="font-medium">{fmt(summary.total_cedolare_secca)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">IVA</span>
                    <span className="font-medium">{fmt(summary.total_iva)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Ritenuta OTA</span>
                    <span className="font-medium">{fmt(summary.total_ritenuta_ota)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Incassato</span>
                    <span className="font-medium text-green-700">{fmt(summary.total_paid)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Saldo aperto</span>
                    <span className="font-medium text-amber-700">{fmt(summary.total_balance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly chart (CSS bar chart) */}
          {monthly.length > 0 && (
            <Card>
              <CardContent className="py-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Andamento mensile</h2>
                <div className="space-y-2">
                  {monthly.map((m) => {
                    const monthLabel = `${MONTH_LABELS[m.month.slice(5)] ?? m.month.slice(5)} ${m.month.slice(0, 4)}`
                    const grossPct = (m.gross_amount / maxMonthGross) * 100
                    const netPct = (m.net_income / maxMonthGross) * 100
                    return (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-gray-600 text-right">{monthLabel}</span>
                        <div className="flex-1 relative h-6">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-100 rounded"
                            style={{ width: `${grossPct}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500 rounded"
                            style={{ width: `${netPct}%` }}
                          />
                        </div>
                        <span className="w-28 text-xs text-gray-600 text-right">
                          {fmt(m.net_income)} / {fmt(m.gross_amount)}
                        </span>
                        <span className="w-8 text-xs text-gray-400 text-right">{m.reservation_count}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-blue-500" /> Netto
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-blue-100" /> Lordo
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channel breakdown + Direct vs OTA */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Direct vs OTA */}
            {directVsOta && (
              <Card>
                <CardContent className="py-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Diretto vs OTA</h2>
                  <div className="relative h-8 rounded-full bg-gray-100 overflow-hidden mb-3">
                    <div
                      className="absolute inset-y-0 left-0 bg-green-500 rounded-l-full"
                      style={{ width: `${directVsOta.direct_percentage}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-semibold text-green-800">Diretto ({directVsOta.direct_percentage}%)</p>
                      <p className="text-xs text-green-600">{directVsOta.direct_count} prenotazioni</p>
                      <p className="font-medium">{fmt(directVsOta.direct_gross)}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="font-semibold text-amber-800">OTA ({100 - directVsOta.direct_percentage}%)</p>
                      <p className="text-xs text-amber-600">{directVsOta.ota_count} pren. · {fmt(directVsOta.ota_commissions)} comm.</p>
                      <p className="font-medium">{fmt(directVsOta.ota_gross)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Channel breakdown */}
            {channels.length > 0 && (
              <Card>
                <CardContent className="py-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Per canale</h2>
                  <div className="space-y-2">
                    {channels.map((ch) => (
                      <div key={ch.channel} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div>
                          <p className="font-medium">{ch.channel}</p>
                          <p className="text-xs text-gray-500">
                            {ch.reservation_count} pren. · comm. media {ch.avg_commission_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{fmt(ch.gross_amount)}</p>
                          <p className="text-xs text-amber-600">-{fmt(ch.commission_amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
