'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@touracore/ui'
import {
  getPropertyBySlugAction,
  searchAvailabilityAction,
  createPublicBookingAction,
  type AvailabilityItem,
} from './actions'

type Step = 'search' | 'results' | 'form' | 'confirmation'

interface BookingConfirmation {
  reservationCode: string
  checkIn: string
  checkOut: string
  totalAmount: number
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]!
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function PublicBookingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [property, setProperty] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('search')

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '')
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2)

  const [results, setResults] = useState<AvailabilityItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<AvailabilityItem | null>(null)

  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [booking, setBooking] = useState(false)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const [error, setError] = useState('')

  const loadProperty = useCallback(async () => {
    setLoading(true)
    const p = await getPropertyBySlugAction(slug)
    setProperty(p as Record<string, unknown> | null)
    setLoading(false)
  }, [slug])

  useEffect(() => { loadProperty() }, [loadProperty])

  useEffect(() => {
    if (property && checkIn && checkOut) {
      handleSearch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property])

  async function handleSearch() {
    if (!property || !checkIn || !checkOut) return
    setSearching(true)
    setError('')
    const data = await searchAvailabilityAction(
      property.id as string,
      checkIn,
      checkOut,
      guests
    )
    setResults(data)
    setStep('results')
    setSearching(false)
  }

  function selectRoom(item: AvailabilityItem) {
    setSelectedRoom(item)
    setStep('form')
  }

  async function handleBook() {
    if (!property || !selectedRoom) return
    setBooking(true)
    setError('')

    const res = await createPublicBookingAction({
      entityId: property.id as string,
      roomTypeId: selectedRoom.roomType.id,
      checkIn,
      checkOut,
      adults: guests,
      children: 0,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      totalAmount: selectedRoom.offer?.totalPrice ?? 0,
    })

    if (res.success) {
      setConfirmation(res.data as BookingConfirmation)
      setStep('confirmation')
    } else {
      setError(res.error || 'Errore nella prenotazione')
    }
    setBooking(false)
  }

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Struttura non trovata.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <h1 className="text-lg font-bold text-gray-900">{property.name as string}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {step === 'confirmation' && confirmation ? (
          <Card>
            <CardHeader>
              <CardTitle>Prenotazione confermata!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-6 text-center">
                  <p className="text-lg font-semibold text-green-800">
                    Codice: {confirmation.reservationCode}
                  </p>
                  <p className="mt-2 text-sm text-green-700">
                    Conserva questo codice per gestire la tua prenotazione.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Check-in</span>
                    <p className="font-medium">{formatDate(confirmation.checkIn)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Check-out</span>
                    <p className="font-medium">{formatDate(confirmation.checkOut)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Totale</span>
                    <p className="font-medium">€{confirmation.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Camera</span>
                    <p className="font-medium">{selectedRoom?.roomType.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Search bar */}
            <Card>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4 pt-4">
                  <div className="flex-1 min-w-[140px]">
                    <Input
                      label="Check-in"
                      type="date"
                      value={checkIn}
                      min={getTodayStr()}
                      onChange={(e) => {
                        setCheckIn(e.target.value)
                        if (checkOut && e.target.value >= checkOut) {
                          const d = new Date(e.target.value)
                          d.setDate(d.getDate() + 1)
                          setCheckOut(d.toISOString().split('T')[0]!)
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Input
                      label="Check-out"
                      type="date"
                      value={checkOut}
                      min={checkIn || getTodayStr()}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Ospiti</label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleSearch} disabled={searching || !checkIn || !checkOut || nights <= 0}>
                    {searching ? 'Ricerca...' : 'Cerca'}
                  </Button>
                </div>
                {nights > 0 && (
                  <p className="mt-2 text-sm text-gray-500">{nights} {nights === 1 ? 'notte' : 'notti'}</p>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {step === 'results' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Camere disponibili</h2>
                {results.length === 0 ? (
                  <p className="text-gray-500">Nessuna camera disponibile per le date selezionate.</p>
                ) : (
                  results.map((item) => (
                    <Card key={item.roomType.id}>
                      <CardContent>
                        <div className="flex items-center justify-between gap-4 pt-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{item.roomType.name}</h3>
                            {item.roomType.description && (
                              <p className="mt-1 text-sm text-gray-500">{item.roomType.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                              <span>Max {item.roomType.max_occupancy} ospiti</span>
                              {item.roomType.size_sqm && <span>· {item.roomType.size_sqm} mq</span>}
                              {item.roomType.bed_configuration && <span>· {item.roomType.bed_configuration}</span>}
                            </div>
                            <div className="mt-2">
                              <Badge variant={item.availableRooms > 0 ? 'success' : 'destructive'}>
                                {item.availableRooms > 0 ? `${item.availableRooms} disponibil${item.availableRooms === 1 ? 'e' : 'i'}` : 'Non disponibile'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            {item.offer && item.offer.allowed ? (
                              <>
                                {item.offer.appliedDiscount && (
                                  <p className="text-sm text-gray-400 line-through">
                                    €{item.offer.baseTotalPrice.toFixed(2)}
                                  </p>
                                )}
                                <p className="text-2xl font-bold text-gray-900">
                                  €{item.offer.totalPrice.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  €{item.offer.effectivePricePerNight.toFixed(2)} / notte
                                </p>
                                {item.offer.appliedDiscount && (
                                  <Badge variant="warning" className="mt-1">
                                    {item.offer.appliedDiscount.label || 'Sconto soggiorno'}
                                  </Badge>
                                )}
                                <div className="mt-3">
                                  <Button
                                    onClick={() => selectRoom(item)}
                                    disabled={item.availableRooms < 1}
                                    size="sm"
                                  >
                                    Prenota
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">
                                {item.offer?.error || 'Prezzo non disponibile'}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Booking form */}
            {step === 'form' && selectedRoom && (
              <Card>
                <CardHeader>
                  <CardTitle>Completa la prenotazione</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-blue-900">{selectedRoom.roomType.name}</p>
                          <p className="text-sm text-blue-700">
                            {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} {nights === 1 ? 'notte' : 'notti'}
                          </p>
                        </div>
                        <p className="text-xl font-bold text-blue-900">
                          €{selectedRoom.offer?.totalPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Nome e cognome"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Email"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          required
                        />
                        <Input
                          label="Telefono"
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Richieste speciali
                        </label>
                        <textarea
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <Button variant="ghost" onClick={() => setStep('results')}>
                        Indietro
                      </Button>
                      <Button
                        onClick={handleBook}
                        disabled={booking || !guestName || !guestEmail}
                      >
                        {booking ? 'Prenotazione in corso...' : 'Conferma prenotazione'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-4">
        <p className="text-center text-xs text-gray-400">
          Powered by TouraCore
        </p>
      </footer>
    </div>
  )
}
