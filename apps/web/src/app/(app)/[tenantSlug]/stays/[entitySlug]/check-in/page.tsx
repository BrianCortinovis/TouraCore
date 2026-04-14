'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Badge, Card, CardContent, Input, Modal } from '@touracore/ui'
import {
  LogIn, Users, Calendar, Mail, Phone, FileText,
  CheckCircle, AlertCircle, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { loadArrivalsAction, loadCheckedInAction, checkInAction } from './actions'
import type { StaffCheckInData } from '@touracore/hospitality/src/actions/checkin'

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
  guest_id: string | null
  actual_check_in: string | null
  guests: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    document_type: string | null
    document_number: string | null
  } | null
}

export default function CheckInPage() {
  const [arrivals, setArrivals] = useState<BookingRow[]>([])
  const [checkedIn, setCheckedIn] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [docType, setDocType] = useState<string>('id_card')
  const [docNumber, setDocNumber] = useState('')
  const [docIssuedBy, setDocIssuedBy] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [processing, setProcessing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [arrResult, ciResult] = await Promise.all([
      loadArrivalsAction(),
      loadCheckedInAction(),
    ])
    if (arrResult.success && arrResult.data) {
      setArrivals((arrResult.data.arrivals ?? []) as BookingRow[])
    }
    if (ciResult.success && ciResult.data) {
      setCheckedIn((ciResult.data.bookings ?? []) as BookingRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const openCheckIn = (booking: BookingRow) => {
    setSelectedBooking(booking)
    setDocType(booking.guests?.document_type ?? 'id_card')
    setDocNumber(booking.guests?.document_number ?? '')
    setDocIssuedBy('')
    setPrivacyConsent(false)
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const handleCheckIn = async () => {
    if (!selectedBooking) return
    if (!privacyConsent) {
      setError('Consenso privacy obbligatorio')
      return
    }

    setProcessing(true)
    setError('')

    const data: StaffCheckInData = {
      reservation_id: selectedBooking.id,
      guest_id: selectedBooking.guest_id ?? undefined,
      document_type: docType as StaffCheckInData['document_type'],
      document_number: docNumber || undefined,
      document_issued_by: docIssuedBy || undefined,
      privacy_consent: privacyConsent,
    }

    const result = await checkInAction(data)
    setProcessing(false)

    if (result.success) {
      setSuccess('Check-in completato')
      setShowModal(false)
      void loadData()
    } else {
      setError(result.error ?? 'Errore durante il check-in')
    }
  }

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: it })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogIn className="h-6 w-6" />
            Check-in
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

      {/* Arrivi di oggi */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Arrivi di oggi
          <Badge variant="secondary">{arrivals.length}</Badge>
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Caricamento...</div>
        ) : arrivals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              Nessun arrivo previsto per oggi
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg divide-y bg-white">
            {arrivals.map((booking) => (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{booking.guest_name}</span>
                    <Badge variant="warning">Confermata</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {booking.guest_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {booking.guest_email}
                      </span>
                    )}
                    {booking.guest_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {booking.guest_phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {booking.check_in} → {booking.check_out}
                    </span>
                  </div>
                  {booking.guests?.document_type && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FileText className="h-3 w-3" />
                      Documento: {booking.guests.document_type} {booking.guests.document_number}
                    </div>
                  )}
                </div>
                <Button onClick={() => openCheckIn(booking)}>
                  <LogIn className="h-4 w-4 mr-1" />
                  Check-in
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ospiti attualmente in casa */}
      {checkedIn.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            In struttura
            <Badge variant="success">{checkedIn.length}</Badge>
          </h2>
          <div className="border rounded-lg divide-y bg-white">
            {checkedIn.map((booking) => (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{booking.guest_name}</span>
                    <Badge variant="success">Check-in</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Check-out: {booking.check_out}
                    </span>
                    {booking.actual_check_in && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Entrato: {format(new Date(booking.actual_check_in), 'HH:mm', { locale: it })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal check-in */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Check-in: ${selectedBooking?.guest_name ?? ''}`}
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="id_card">Carta d&apos;identit&agrave;</option>
              <option value="passport">Passaporto</option>
              <option value="driving_license">Patente</option>
              <option value="residence_permit">Permesso di soggiorno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero documento
            </label>
            <Input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Es. CA12345AB"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rilasciato da
            </label>
            <Input
              value={docIssuedBy}
              onChange={(e) => setDocIssuedBy(e.target.value)}
              placeholder="Es. Comune di Milano"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="privacy"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="privacy" className="text-sm text-gray-700">
              Consenso privacy (obbligatorio)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annulla
            </Button>
            <Button onClick={handleCheckIn} disabled={processing || !privacyConsent}>
              {processing ? 'Check-in in corso...' : 'Conferma check-in'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
