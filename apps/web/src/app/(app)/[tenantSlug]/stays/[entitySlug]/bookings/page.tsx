'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Badge, Input, Card, CardContent } from '@touracore/ui'
import { useParams } from 'next/navigation'
import { getReservationsAction, updateReservationStatusAction, getReservationStatsAction } from './actions'

type ReservationStatus = 'inquiry' | 'option' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'

interface ReservationRow {
  id: string
  reservation_code: string
  guest_name: string
  guest_email: string | null
  check_in: string
  check_out: string
  status: ReservationStatus
  source: string
  total_amount: number
  paid_amount: number
  currency: string
  room_number: string | null
}

const STATUS_COLORS: Record<ReservationStatus, string> = {
  inquiry: 'secondary',
  option: 'warning',
  confirmed: 'success',
  checked_in: 'success',
  checked_out: 'default',
  cancelled: 'destructive',
  no_show: 'secondary',
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  inquiry: 'Richiesta',
  option: 'Opzione',
  confirmed: 'Confermata',
  checked_in: 'In casa',
  checked_out: 'Partito',
  cancelled: 'Cancellata',
  no_show: 'No show',
}

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Diretto',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  airbnb: 'Airbnb',
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  phone: 'Telefono',
  walk_in: 'Walk-in',
  website: 'Sito web',
  email: 'Email',
  agency: 'Agenzia',
  other: 'Altro',
}

const VALID_TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  inquiry: ['option', 'confirmed', 'cancelled'],
  option: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
}

export default function EntityBookingsPage() {
  const params = useParams()
  const entitySlug = params.entitySlug as string

  const [reservations, setReservations] = useState<ReservationRow[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<Record<ReservationStatus, number>>({
    inquiry: 0, option: 0, confirmed: 0, checked_in: 0, checked_out: 0, cancelled: 0, no_show: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const perPage = 25
  const totalPages = Math.ceil(count / perPage)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resResult, statsResult] = await Promise.all([
        getReservationsAction(entitySlug, page, statusFilter || undefined, search || undefined),
        getReservationStatsAction(entitySlug),
      ])
      setReservations(resResult.data)
      setCount(resResult.total)
      setStats(statsResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento')
    } finally {
      setLoading(false)
    }
  }, [entitySlug, page, statusFilter, search])

  useEffect(() => { void loadData() }, [loadData])

  const handleTransition = async (resId: string, newStatus: ReservationStatus) => {
    const result = await updateReservationStatusAction(entitySlug, resId, newStatus)
    if (result.success) void loadData()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {(Object.entries(STATUS_LABELS) as Array<[ReservationStatus, string]>).map(([status, label]) => (
          <Card
            key={status}
            className={`cursor-pointer transition-shadow ${status === statusFilter ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats[status]}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca ospite o codice..."
          className="max-w-sm"
          onKeyDown={(e) => e.key === 'Enter' && loadData()}
        />
        <Button variant="outline" onClick={() => { setStatusFilter(''); setSearch(''); setPage(1) }}>
          Reset filtri
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Caricamento...</div>
      ) : reservations.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p className="text-lg">Nessuna prenotazione trovata</p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-white">
          {reservations.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{r.reservation_code}</span>
                  <span className="font-medium">{r.guest_name}</span>
                  <Badge variant={STATUS_COLORS[r.status] as 'warning' | 'success' | 'destructive' | 'default' | 'secondary'}>
                    {STATUS_LABELS[r.status]}
                  </Badge>
                  <Badge variant="secondary">{SOURCE_LABELS[r.source] ?? r.source}</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {r.guest_email} — {r.check_in} → {r.check_out}
                  {r.room_number && <span> — Camera {r.room_number}</span>}
                </p>
                <p className="text-sm font-medium">
                  {Number(r.total_amount).toFixed(2)} {r.currency}
                  {r.paid_amount > 0 && r.paid_amount < r.total_amount && (
                    <span className="ml-2 text-orange-600">
                      (saldo: {(r.total_amount - r.paid_amount).toFixed(2)} {r.currency})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {VALID_TRANSITIONS[r.status]?.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    size="sm"
                    variant={nextStatus === 'cancelled' ? 'destructive' : 'outline'}
                    onClick={() => handleTransition(r.id, nextStatus)}
                  >
                    {STATUS_LABELS[nextStatus]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            Precedente
          </Button>
          <span className="text-sm text-gray-600">Pagina {page} di {totalPages}</span>
          <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Successiva
          </Button>
        </div>
      )}
    </div>
  )
}
