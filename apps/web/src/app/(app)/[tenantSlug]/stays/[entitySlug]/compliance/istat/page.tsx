'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Card, CardContent } from '@touracore/ui'
import {
  BarChart3, RefreshCw, ChevronLeft, ChevronRight,
  Globe, MapPin,
} from 'lucide-react'
import { loadIstatDataAction } from './actions'

interface IstatBreakdown {
  province?: string
  country?: string
  arrivals: number
  presences: number
}

interface IstatResult {
  month: number
  year: number
  italian_arrivals: number
  italian_presences: number
  foreign_arrivals: number
  foreign_presences: number
  breakdown_italian: IstatBreakdown[]
  breakdown_foreign: IstatBreakdown[]
}

const MONTH_LABELS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

export default function IstatPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<IstatResult | null>(null)
  const [reservationCount, setReservationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadIstatDataAction(month + 1, year)
      if (result.success && result.data) {
        setData(result.data.istat as IstatResult)
        setReservationCount(result.data.reservationCount as number)
      } else {
        setError(result.error ?? 'Errore')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { loadData() }, [loadData])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  const totalArrivals = (data?.italian_arrivals ?? 0) + (data?.foreign_arrivals ?? 0)
  const totalPresences = (data?.italian_presences ?? 0) + (data?.foreign_presences ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6" />
            ISTAT - Modello C/59
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Statistiche mensili arrivi e presenze per il sistema informativo turistico
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="min-w-[180px] text-center">
          <span className="text-sm font-semibold">{MONTH_LABELS[month]} {year}</span>
        </div>
        <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500">Caricamento...</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalArrivals}</p>
                <p className="mt-1 text-xs text-gray-500">Arrivi totali</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalPresences}</p>
                <p className="mt-1 text-xs text-gray-500">Presenze totali</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{data.italian_arrivals}</p>
                <p className="mt-1 text-xs text-gray-500">Arrivi italiani</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-green-700">{data.foreign_arrivals}</p>
                <p className="mt-1 text-xs text-gray-500">Arrivi stranieri</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-gray-400">{reservationCount} prenotazioni analizzate</div>

          {/* Italian breakdown */}
          {data.breakdown_italian.length > 0 && (
            <Card>
              <CardContent className="py-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MapPin className="h-4 w-4" /> Italiani per provincia
                </h3>
                <div className="divide-y">
                  <div className="flex items-center gap-4 py-2 text-xs font-medium text-gray-500">
                    <span className="w-20">Provincia</span>
                    <span className="w-20 text-right">Arrivi</span>
                    <span className="w-20 text-right">Presenze</span>
                  </div>
                  {data.breakdown_italian.map((row) => (
                    <div key={row.province} className="flex items-center gap-4 py-2 text-sm">
                      <span className="w-20 font-medium text-gray-900">{row.province}</span>
                      <span className="w-20 text-right text-gray-700">{row.arrivals}</span>
                      <span className="w-20 text-right text-gray-700">{row.presences}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Foreign breakdown */}
          {data.breakdown_foreign.length > 0 && (
            <Card>
              <CardContent className="py-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Globe className="h-4 w-4" /> Stranieri per nazionalità
                </h3>
                <div className="divide-y">
                  <div className="flex items-center gap-4 py-2 text-xs font-medium text-gray-500">
                    <span className="w-20">Paese</span>
                    <span className="w-20 text-right">Arrivi</span>
                    <span className="w-20 text-right">Presenze</span>
                  </div>
                  {data.breakdown_foreign.map((row) => (
                    <div key={row.country} className="flex items-center gap-4 py-2 text-sm">
                      <span className="w-20 font-medium text-gray-900">{row.country}</span>
                      <span className="w-20 text-right text-gray-700">{row.arrivals}</span>
                      <span className="w-20 text-right text-gray-700">{row.presences}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalArrivals === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Nessun dato per questo mese</p>
                <p className="mt-1 text-xs text-gray-400">I dati ISTAT vengono calcolati dalle prenotazioni confermate</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
