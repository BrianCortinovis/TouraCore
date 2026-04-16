'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Badge, Card, CardContent } from '@touracore/ui'
import {
  LogOut, Users, Calendar, Mail,
  CheckCircle, AlertCircle, Clock, CreditCard,
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { loadDeparturesAction, checkOutAction } from './actions'

interface BookingRow {
  id: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  check_in: string
  check_out: string
  total_amount: number
  currency: string
  status: string
  actual_check_in: string | null
  guests: {
    first_name: string
    last_name: string
  } | null
}

export default function CheckOutPage() {
  const [departures, setDepartures] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await loadDeparturesAction()
      if (result.success && result.data) {
        setDepartures((result.data.departures ?? []) as BookingRow[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const handleCheckOut = async (bookingId: string) => {
    setProcessingId(bookingId)
    setError('')
    setSuccess('')

    const result = await checkOutAction(bookingId)
    setProcessingId(null)

    if (result.success) {
      setSuccess('Check-out completato')
      void loadData()
    } else {
      setError(result.error ?? 'Errore durante il check-out')
    }
  }

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: it })

  const totalOutstanding = departures.reduce(
    (sum, b) => sum + Number(b.total_amount),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogOut className="h-6 w-6" />
            Check-out
          </h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          Aggiorna
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{departures.length}</p>
            <p className="text-sm text-gray-500">Partenze previste</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {totalOutstanding.toFixed(2)} EUR
            </p>
            <p className="text-sm text-gray-500">Valore totale</p>
          </CardContent>
        </Card>
      </div>

      {/* Departures list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : departures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            Nessuna partenza prevista per oggi
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {departures.map((booking) => {
            const nights = Math.max(
              1,
              Math.round(
                (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )

            return (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{booking.guest_name}</span>
                    <Badge variant="success">In struttura</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {booking.guest_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {booking.guest_email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {nights} {nights === 1 ? 'notte' : 'notti'}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {Number(booking.total_amount).toFixed(2)} {booking.currency}
                    </span>
                    {booking.actual_check_in && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Entrato: {format(new Date(booking.actual_check_in), 'dd/MM HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleCheckOut(booking.id)}
                  disabled={processingId === booking.id}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  {processingId === booking.id ? 'Check-out...' : 'Check-out'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
