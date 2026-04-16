'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Badge, Input, Select, Modal } from '@touracore/ui'
import { Plus, Trash2, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import {
  loadOfferSlotsDataAction,
  addAvailabilityRuleAction,
  removeAvailabilityRuleAction,
  bookSlotAction,
  cancelSlotBookingAction,
  completeSlotBookingAction,
} from './actions'

interface SlotRule {
  id: string
  offer_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface AvailableSlot {
  start: string
  end: string
  capacity: number
  booked: number
  available: number
}

interface SlotBookingRow {
  id: string
  offer_id: string
  slot_date: string
  slot_start: string
  slot_end: string
  participants: number
  status: string
  notes: string | null
  guest: { first_name: string; last_name: string } | null
}

interface SlotManagerProps {
  offerId: string
  offerName: string
  slotDurationMinutes: number
  maxConcurrent: number
  onClose: () => void
}

const DAY_LABELS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function SlotManager({
  offerId,
  offerName,
  slotDurationMinutes,
  maxConcurrent,
  onClose,
}: SlotManagerProps) {
  const [tab, setTab] = useState<'grid' | 'bookings'>('grid')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [rules, setRules] = useState<SlotRule[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [bookings, setBookings] = useState<SlotBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form aggiungi regola
  const [newRuleDay, setNewRuleDay] = useState('1')
  const [newRuleStart, setNewRuleStart] = useState('09:00')
  const [newRuleEnd, setNewRuleEnd] = useState('18:00')

  // Form prenotazione manuale
  const [bookingModalSlot, setBookingModalSlot] = useState<AvailableSlot | null>(null)
  const [bookingParticipants, setBookingParticipants] = useState('1')
  const [bookingNotes, setBookingNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loadOfferSlotsDataAction(offerId, selectedDate)
      if (result.success && result.data) {
        setRules(result.data.rules)
        setAvailableSlots(result.data.availableSlots)
        setBookings(result.data.bookings)
      } else {
        setError(result.error ?? 'Errore caricamento')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento')
    } finally {
      setLoading(false)
    }
  }, [offerId, selectedDate])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAddRule() {
    if (newRuleStart >= newRuleEnd) {
      setError('L\'orario di inizio deve precedere la fine')
      return
    }
    const result = await addAvailabilityRuleAction(
      offerId,
      parseInt(newRuleDay),
      newRuleStart,
      newRuleEnd,
    )
    if (!result.success) {
      setError(result.error ?? 'Errore')
      return
    }
    setError(null)
    await load()
  }

  async function handleRemoveRule(ruleId: string) {
    if (!confirm('Rimuovere questa fascia oraria?')) return
    await removeAvailabilityRuleAction(ruleId)
    await load()
  }

  async function handleBookSlot() {
    if (!bookingModalSlot) return
    const result = await bookSlotAction({
      offerId,
      slotDate: selectedDate,
      slotStart: bookingModalSlot.start,
      participants: parseInt(bookingParticipants) || 1,
      notes: bookingNotes.trim() || undefined,
    })
    if (!result.success) {
      setError(result.error ?? 'Errore prenotazione')
      return
    }
    setBookingModalSlot(null)
    setBookingParticipants('1')
    setBookingNotes('')
    setError(null)
    await load()
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm('Cancellare questa prenotazione?')) return
    await cancelSlotBookingAction(bookingId)
    await load()
  }

  async function handleCompleteBooking(bookingId: string) {
    await completeSlotBookingAction(bookingId)
    await load()
  }

  // Raggruppa regole per giorno settimana
  const rulesByDay = new Map<number, SlotRule[]>()
  for (const rule of rules) {
    const list = rulesByDay.get(rule.day_of_week) ?? []
    list.push(rule)
    rulesByDay.set(rule.day_of_week, list)
  }

  const dayOptions = DAY_LABELS.map((label, idx) => ({ value: String(idx), label }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Clock className="h-5 w-5" />
            Slot orari — {offerName}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Durata slot: {slotDurationMinutes} min · Max {maxConcurrent}{' '}
            {maxConcurrent === 1 ? 'ospite' : 'ospiti'} contemporanei
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Chiudi
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('grid')}
          className={`px-4 py-2 text-sm font-medium transition ${
            tab === 'grid'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Disponibilità settimanale
        </button>
        <button
          type="button"
          onClick={() => setTab('bookings')}
          className={`px-4 py-2 text-sm font-medium transition ${
            tab === 'bookings'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Prenotazioni del giorno
        </button>
      </div>

      {tab === 'grid' && (
        <div className="space-y-4">
          {/* Form aggiungi regola */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">
              Aggiungi fascia oraria
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <Select
                label="Giorno"
                value={newRuleDay}
                options={dayOptions}
                onChange={(e) => setNewRuleDay(e.target.value)}
              />
              <Input
                label="Dalle"
                type="time"
                value={newRuleStart}
                onChange={(e) => setNewRuleStart(e.target.value)}
              />
              <Input
                label="Alle"
                type="time"
                value={newRuleEnd}
                onChange={(e) => setNewRuleEnd(e.target.value)}
              />
              <div className="flex items-end">
                <Button onClick={handleAddRule} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi
                </Button>
              </div>
            </div>
          </div>

          {/* Griglia settimanale */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {DAY_SHORT.map((day, idx) => (
                <div
                  key={day}
                  className="border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-700 last:border-r-0"
                >
                  {day}
                  {idx === 0 && <span className="ml-1 text-red-500">·</span>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div
                  key={day}
                  className="min-h-[100px] space-y-1 border-r border-gray-200 p-2 last:border-r-0"
                >
                  {(rulesByDay.get(day) ?? []).map((rule) => (
                    <div
                      key={rule.id}
                      className="group flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs text-blue-800"
                    >
                      <span>
                        {formatTime(rule.start_time)}–{formatTime(rule.end_time)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="opacity-0 transition group-hover:opacity-100"
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                  {(rulesByDay.get(day) ?? []).length === 0 && (
                    <p className="text-center text-xs text-gray-300">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              label="Data"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {loading && (
            <p className="py-6 text-center text-sm text-gray-500">Caricamento...</p>
          )}

          {!loading && (
            <>
              {/* Slot disponibili */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Slot disponibili
                </h4>
                {availableSlots.length === 0 ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Nessuno slot configurato per questo giorno. Aggiungi una fascia oraria
                    nella tab &quot;Disponibilità settimanale&quot;.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                    {availableSlots.map((slot) => {
                      const full = slot.available === 0
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={full}
                          onClick={() => setBookingModalSlot(slot)}
                          className={`rounded border px-2 py-2 text-xs transition ${
                            full
                              ? 'cursor-not-allowed border-red-200 bg-red-50 text-red-700'
                              : 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                          }`}
                        >
                          <div className="font-mono font-semibold">
                            {slot.start}–{slot.end}
                          </div>
                          <div className="mt-0.5 text-[10px]">
                            {slot.booked}/{slot.capacity}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Lista prenotazioni */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Prenotazioni del giorno ({bookings.length})
                </h4>
                {bookings.length === 0 ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    Nessuna prenotazione per questa data.
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border border-gray-200 bg-white">
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-mono text-sm font-semibold text-gray-900">
                              {formatTime(b.slot_start)}–{formatTime(b.slot_end)}
                            </span>
                            <Badge
                              variant={
                                b.status === 'confirmed'
                                  ? 'default'
                                  : b.status === 'completed'
                                    ? 'success'
                                    : 'secondary'
                              }
                            >
                              {b.status}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {b.guest
                              ? `${b.guest.first_name} ${b.guest.last_name}`
                              : 'Ospite non assegnato'}
                            {' · '}
                            {b.participants}{' '}
                            {b.participants === 1 ? 'persona' : 'persone'}
                            {b.notes && ` · ${b.notes}`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {b.status === 'confirmed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteBooking(b.id)}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelBooking(b.id)}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal prenotazione manuale */}
      {bookingModalSlot && (
        <Modal
          isOpen={true}
          onClose={() => setBookingModalSlot(null)}
          title={`Prenota slot ${bookingModalSlot.start}–${bookingModalSlot.end}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Disponibilità: {bookingModalSlot.available} su {bookingModalSlot.capacity}{' '}
              posti
            </p>
            <Input
              label="Numero partecipanti"
              type="number"
              min="1"
              max={String(bookingModalSlot.available)}
              value={bookingParticipants}
              onChange={(e) => setBookingParticipants(e.target.value)}
            />
            <Input
              label="Note (opzionale)"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="Es. terapista preferito, allergie..."
            />
            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" onClick={() => setBookingModalSlot(null)}>
                Annulla
              </Button>
              <Button onClick={handleBookSlot}>Conferma prenotazione</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
