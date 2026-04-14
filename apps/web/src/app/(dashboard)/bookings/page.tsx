'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Badge, Input, Card, CardContent } from '@touracore/ui'
import type { Booking, BookingStatus } from '@touracore/booking'
import { VALID_TRANSITIONS } from '@touracore/booking'
import {
  listBookingsAction,
  transitionStatusAction,
  getBookingStatsAction,
} from './actions'

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'warning',
  confirmed: 'success',
  checked_in: 'success',
  checked_out: 'default',
  canceled: 'destructive',
  completed: 'default',
  no_show: 'secondary',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'In attesa',
  confirmed: 'Confermata',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  canceled: 'Cancellata',
  completed: 'Completata',
  no_show: 'No show',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<Record<BookingStatus, number>>({
    pending: 0, confirmed: 0, checked_in: 0, checked_out: 0, canceled: 0, completed: 0, no_show: 0,
  })
  const [loading, setLoading] = useState(true)

  const perPage = 20
  const totalPages = Math.ceil(count / perPage)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [bookingResult, statsResult] = await Promise.all([
      listBookingsAction(page, statusFilter || undefined, search || undefined),
      getBookingStatsAction(),
    ])
    setBookings(bookingResult.data as Booking[])
    setCount(bookingResult.count)
    setStats(statsResult)
    setLoading(false)
  }, [page, statusFilter, search])

  useEffect(() => { void loadData() }, [loadData])

  const handleTransition = async (bookingId: string, newStatus: string) => {
    const result = await transitionStatusAction(bookingId, newStatus)
    if (result.success) void loadData()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.entries(STATUS_LABELS) as Array<[BookingStatus, string]>).map(([status, label]) => (
          <Card key={status} className="cursor-pointer" onClick={() => setStatusFilter(status === statusFilter ? '' : status)}>
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
          placeholder="Cerca ospite..."
          className="max-w-sm"
          onKeyDown={(e) => e.key === 'Enter' && loadData()}
        />
        <Button variant="outline" onClick={() => { setStatusFilter(''); setSearch(''); setPage(1) }}>
          Reset filtri
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Nessuna prenotazione</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {bookings.map((b) => (
            <div key={b.id} className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b.guest_name}</span>
                  <Badge variant={STATUS_COLORS[b.status] as 'warning' | 'success' | 'destructive' | 'default' | 'secondary'}>
                    {STATUS_LABELS[b.status]}
                  </Badge>
                  <Badge variant="secondary">{b.source}</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {b.guest_email} — {b.check_in} → {b.check_out}
                </p>
                <p className="text-sm font-medium">
                  {Number(b.total_amount).toFixed(2)} {b.currency}
                </p>
              </div>
              <div className="flex gap-2">
                {VALID_TRANSITIONS[b.status]?.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    size="sm"
                    variant={nextStatus === 'canceled' ? 'destructive' : 'outline'}
                    onClick={() => handleTransition(b.id, nextStatus)}
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
