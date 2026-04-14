'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Download, TrendingUp, Calendar, Users, Bed } from 'lucide-react'
import { Button, Card, CardContent, Select } from '@touracore/ui'
import { loadReportsAction } from './actions'

interface MonthlyRevenueRow { month: string; revenue: number; rooms: number; fb: number }
interface MonthlyOccupancyRow { month: string; occupancy: number }
interface SourceRow { name: string; value: number; percentage: number }
interface RoomTypeRow { type: string; revenue: number; rooms_sold: number }
interface TopGuestRow { rank: number; name: string; stays: number; nights: number; revenue: number }

interface ReportData {
  kpis: {
    totalRevenue: number
    revpar: number
    adr: number
    occupancyRate: number
    totalNightsSold: number
    totalGuests: number
  }
  monthlyRevenue: MonthlyRevenueRow[]
  monthlyOccupancy: MonthlyOccupancyRow[]
  bySource: SourceRow[]
  byRoomType: RoomTypeRow[]
  topGuests: TopGuestRow[]
}

function formatEuro(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function downloadCsv(filename: string, rows: string[][]): void {
  const content = rows
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await loadReportsAction({ year })
    if (result.success && result.data) {
      setData(result.data as ReportData)
    } else {
      setError(result.error ?? 'Errore')
    }
    setLoading(false)
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  function exportKpis() {
    if (!data) return
    downloadCsv(`kpi-${year}.csv`, [
      ['Metrica', 'Valore'],
      ['Ricavi totali', formatEuro(data.kpis.totalRevenue)],
      ['RevPAR', formatEuro(data.kpis.revpar)],
      ['ADR', formatEuro(data.kpis.adr)],
      ['Occupazione', `${data.kpis.occupancyRate}%`],
      ['Notti vendute', String(data.kpis.totalNightsSold)],
      ['Ospiti totali', String(data.kpis.totalGuests)],
    ])
  }

  function exportMonthly() {
    if (!data) return
    const rows = [
      ['Mese', 'Ricavi', 'Occupazione %'],
      ...data.monthlyRevenue.map((m, i) => [
        m.month,
        m.revenue.toFixed(2),
        (data.monthlyOccupancy[i]?.occupancy ?? 0).toFixed(1),
      ]),
    ]
    downloadCsv(`mensile-${year}.csv`, rows)
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6" />
            Report e analitiche
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            KPI, ricavi e performance della struttura per anno fiscale
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            label=""
            value={String(year)}
            options={yearOptions}
            onChange={(e) => setYear(parseInt(e.target.value))}
          />
          <Button variant="outline" onClick={exportKpis} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Esporta KPI
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-500">
          Caricamento report...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-500">Ricavi totali</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatEuro(data.kpis.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-500">RevPAR</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatEuro(data.kpis.revpar)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-500">ADR</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatEuro(data.kpis.adr)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-500">Occupazione</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.kpis.occupancyRate}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-500">Notti vendute</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.kpis.totalNightsSold}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-500">Ospiti</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {data.kpis.totalGuests}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Andamento mensile */}
          <Card>
            <CardContent className="py-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <TrendingUp className="h-5 w-5" />
                  Andamento mensile
                </h2>
                <Button variant="outline" size="sm" onClick={exportMonthly}>
                  <Download className="mr-2 h-3 w-3" />
                  Esporta CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                      <th className="py-2 pr-4">Mese</th>
                      <th className="py-2 pr-4 text-right">Ricavi</th>
                      <th className="py-2 pr-4 text-right">Occupazione</th>
                      <th className="py-2 pr-4">Andamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyRevenue.map((row, i) => {
                      const occ = data.monthlyOccupancy[i]?.occupancy ?? 0
                      const maxRevenue = Math.max(...data.monthlyRevenue.map((r) => r.revenue), 1)
                      const barWidth = (row.revenue / maxRevenue) * 100
                      return (
                        <tr key={row.month} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium text-gray-700">{row.month}</td>
                          <td className="py-2 pr-4 text-right text-gray-900">
                            {formatEuro(row.revenue)}
                          </td>
                          <td className="py-2 pr-4 text-right text-gray-600">{occ}%</td>
                          <td className="py-2 pr-4">
                            <div className="h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Revenue per fonte */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="py-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Calendar className="h-5 w-5" />
                  Ricavi per canale
                </h2>
                {data.bySource.length === 0 ? (
                  <p className="text-sm text-gray-500">Nessun dato</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody>
                      {data.bySource.map((row) => (
                        <tr key={row.name} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium text-gray-700">{row.name}</td>
                          <td className="py-2 pr-4 text-right text-gray-900">
                            {formatEuro(row.value)}
                          </td>
                          <td className="py-2 pr-4 text-right text-xs text-gray-500">
                            {row.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Revenue per tipo camera */}
            <Card>
              <CardContent className="py-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Bed className="h-5 w-5" />
                  Ricavi per tipologia
                </h2>
                {data.byRoomType.length === 0 ? (
                  <p className="text-sm text-gray-500">Nessun dato</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody>
                      {data.byRoomType.map((row) => (
                        <tr key={row.type} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium text-gray-700">{row.type}</td>
                          <td className="py-2 pr-4 text-right text-gray-900">
                            {formatEuro(row.revenue)}
                          </td>
                          <td className="py-2 pr-4 text-right text-xs text-gray-500">
                            {row.rooms_sold} vendite
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Ospiti */}
          {data.topGuests.length > 0 && (
            <Card>
              <CardContent className="py-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Users className="h-5 w-5" />
                  Top ospiti
                </h2>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Nome</th>
                      <th className="py-2 pr-4 text-right">Soggiorni</th>
                      <th className="py-2 pr-4 text-right">Notti</th>
                      <th className="py-2 pr-4 text-right">Ricavi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topGuests.map((g) => (
                      <tr key={g.rank} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-500">{g.rank}</td>
                        <td className="py-2 pr-4 font-medium text-gray-700">{g.name}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{g.stays}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{g.nights}</td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {formatEuro(g.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
