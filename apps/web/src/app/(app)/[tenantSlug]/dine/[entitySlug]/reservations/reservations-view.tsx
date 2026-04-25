'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, List, LayoutGrid, Clock } from 'lucide-react'
import { createReservation, updateReservationStatus, moveReservation } from './actions'

interface TableT {
  id: string
  code: string
  roomId: string
  seatsDefault: number
  seatsMax: number
}

interface Room {
  id: string
  name: string
}

interface Reservation {
  id: string
  guestName: string
  guestPhone: string | null
  partySize: number
  slotDate: string
  slotTime: string
  durationMinutes: number
  status: 'pending' | 'confirmed' | 'seated' | 'finished' | 'cancelled' | 'no_show'
  tableIds: string[]
  serviceLabel: string | null
  specialRequests: string | null
  allergies: string[]
  occasion: string | null
  source: string
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  currentDate: string
  currentView: 'list' | 'timeline' | 'grid'
  rooms: Room[]
  tables: TableT[]
  reservations: Reservation[]
}

const STATUS_COLORS: Record<Reservation['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  seated: 'bg-green-100 text-green-800 border-green-300',
  finished: 'bg-gray-100 text-gray-700 border-gray-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
  no_show: 'bg-red-100 text-red-800 border-red-400',
}

const STATUS_LABELS: Record<Reservation['status'], string> = {
  pending: 'In attesa',
  confirmed: 'Confermata',
  seated: 'Seduto',
  finished: 'Completata',
  cancelled: 'Annullata',
  no_show: 'No show',
}

export function ReservationsView(props: Props) {
  const { tenantSlug, entitySlug, restaurantId, currentDate, currentView, rooms, tables, reservations } = props
  const [showDialog, setShowDialog] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setView(view: 'list' | 'timeline' | 'grid') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`${pathname}?${params.toString()}`)
  }

  function setDate(date: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', date)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <input
          type="date"
          value={currentDate}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <div className="flex rounded-md border border-gray-300">
          {(['list', 'timeline', 'grid'] as const).map((v) => {
            const Icon = v === 'list' ? List : v === 'timeline' ? Clock : LayoutGrid
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs ${
                  currentView === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {v === 'list' ? 'Lista' : v === 'timeline' ? 'Timeline' : 'Griglia'}
              </button>
            )
          })}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuova prenotazione
        </button>
      </div>

      {currentView === 'list' && (
        <ListView
          reservations={reservations}
          tables={tables}
          onSelect={setSelectedReservation}
        />
      )}
      {currentView === 'timeline' && (
        <TimelineView
          reservations={reservations}
          rooms={rooms}
          tables={tables}
          onSelect={setSelectedReservation}
          onMoveTable={(reservationId, tableIds) => {
            void moveReservation({ reservationId, tableIds, tenantSlug, entitySlug })
          }}
        />
      )}
      {currentView === 'grid' && (
        <GridView reservations={reservations} tables={tables} onSelect={setSelectedReservation} />
      )}

      {showDialog && (
        <NewReservationDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          currentDate={currentDate}
          onClose={() => setShowDialog(false)}
        />
      )}

      {selectedReservation && (
        <ReservationDrawer
          reservation={selectedReservation}
          tables={tables}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setSelectedReservation(null)}
        />
      )}
    </>
  )
}

function ListView({
  reservations,
  tables,
  onSelect,
}: {
  reservations: Reservation[]
  tables: TableT[]
  onSelect: (r: Reservation) => void
}) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
        Nessuna prenotazione per questa data.
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">Ora</th>
            <th className="px-4 py-2 text-left">Ospite</th>
            <th className="px-4 py-2 text-left">Coperti</th>
            <th className="px-4 py-2 text-left">Tavoli</th>
            <th className="px-4 py-2 text-left">Stato</th>
            <th className="px-4 py-2 text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => {
            const tableCodes = r.tableIds
              .map((tid) => tables.find((t) => t.id === tid)?.code)
              .filter(Boolean)
              .join(', ')
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-medium">{r.slotTime.slice(0, 5)}</td>
                <td className="px-4 py-2">
                  <p className="font-medium text-gray-900">{r.guestName}</p>
                  {r.guestPhone && <p className="text-xs text-gray-500">{r.guestPhone}</p>}
                </td>
                <td className="px-4 py-2">{r.partySize}</td>
                <td className="px-4 py-2 text-gray-600">{tableCodes || '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {r.allergies.length > 0 && <span className="mr-2 rounded bg-red-50 px-1.5 py-0.5 text-red-700">⚠ {r.allergies.join(', ')}</span>}
                  {r.occasion && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">{r.occasion}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TimelineView({
  reservations,
  rooms,
  tables,
  onSelect,
}: {
  reservations: Reservation[]
  rooms: Room[]
  tables: TableT[]
  onSelect: (r: Reservation) => void
  onMoveTable: (reservationId: string, tableIds: string[]) => void
}) {
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 12)
  const SLOT_WIDTH = 60

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <div className="min-w-max">
        <div className="sticky top-0 z-10 grid border-b border-gray-200 bg-gray-50 text-xs"
             style={{ gridTemplateColumns: `120px repeat(${HOURS.length}, ${SLOT_WIDTH}px)` }}>
          <div className="border-r border-gray-200 p-2 font-medium text-gray-500">Tavolo</div>
          {HOURS.map((h) => (
            <div key={h} className="border-r border-gray-200 p-2 text-center font-medium text-gray-500">
              {h}:00
            </div>
          ))}
        </div>
        {rooms.map((room) => {
          const roomTables = tables.filter((t) => t.roomId === room.id)
          return (
            <div key={room.id}>
              <div className="bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase text-gray-500">
                {room.name}
              </div>
              {roomTables.map((t) => {
                const tableRes = reservations.filter((r) => r.tableIds.includes(t.id))
                return (
                  <div key={t.id} className="grid border-b border-gray-100 text-xs"
                       style={{ gridTemplateColumns: `120px repeat(${HOURS.length}, ${SLOT_WIDTH}px)`, minHeight: 36 }}>
                    <div className="flex items-center border-r border-gray-200 px-2 font-medium">
                      {t.code} <span className="ml-1 text-gray-400">({t.seatsDefault})</span>
                    </div>
                    <div className="relative col-span-12">
                      {tableRes.map((r) => {
                        const startHour = parseInt(r.slotTime.slice(0, 2), 10) + parseInt(r.slotTime.slice(3, 5), 10) / 60
                        const left = (startHour - 12) * SLOT_WIDTH
                        const width = (r.durationMinutes / 60) * SLOT_WIDTH
                        return (
                          <button
                            key={r.id}
                            onClick={() => onSelect(r)}
                            className={`absolute top-1 bottom-1 rounded border px-2 text-left text-[10px] font-medium ${STATUS_COLORS[r.status]}`}
                            style={{ left, width }}
                          >
                            {r.guestName} · {r.partySize}p
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GridView({
  reservations,
  tables,
  onSelect,
}: {
  reservations: Reservation[]
  tables: TableT[]
  onSelect: (r: Reservation) => void
}) {
  const SLOTS = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00']

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-max text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 p-2 text-left font-medium text-gray-500">Slot</th>
            {tables.map((t) => (
              <th key={t.id} className="border-b border-gray-200 p-2 font-medium text-gray-500">
                {t.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="border-b border-gray-100 p-2 font-medium">{slot}</td>
              {tables.map((t) => {
                const r = reservations.find(
                  (res) => res.slotTime.startsWith(slot) && res.tableIds.includes(t.id),
                )
                return (
                  <td key={t.id} className="border-b border-l border-gray-100 p-1">
                    {r ? (
                      <button
                        onClick={() => onSelect(r)}
                        className={`block w-full rounded border px-1 py-0.5 text-left text-[10px] ${STATUS_COLORS[r.status]}`}
                      >
                        {r.guestName.slice(0, 8)} · {r.partySize}p
                      </button>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NewReservationDialog({
  restaurantId,
  tenantSlug,
  entitySlug,
  currentDate,
  onClose,
}: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  currentDate: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    partySize: 2,
    slotDate: currentDate,
    slotTime: '20:00',
    durationMinutes: 90,
    serviceLabel: 'Cena',
    specialRequests: '',
    allergiesText: '',
    occasion: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await createReservation({
          restaurantId,
          tenantSlug,
          entitySlug,
          guestName: form.guestName,
          guestPhone: form.guestPhone || undefined,
          guestEmail: form.guestEmail || undefined,
          partySize: form.partySize,
          slotDate: form.slotDate,
          slotTime: form.slotTime,
          durationMinutes: form.durationMinutes,
          serviceLabel: form.serviceLabel || undefined,
          specialRequests: form.specialRequests || undefined,
          allergies: form.allergiesText.split(',').map((a) => a.trim()).filter(Boolean),
          occasion: form.occasion || undefined,
        })
        if (result.autoAssignedTableIds.length === 0) {
          setError('Nessun tavolo disponibile per questo slot. Prenotazione creata in stato pending.')
          setTimeout(onClose, 2000)
        } else {
          onClose()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuova prenotazione</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Ospite</label>
            <input
              required
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Telefono</label>
            <input
              value={form.guestPhone}
              onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Email</label>
            <input
              type="email"
              value={form.guestEmail}
              onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Coperti</label>
            <input
              type="number"
              min={1}
              max={40}
              value={form.partySize}
              onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Servizio</label>
            <select
              value={form.serviceLabel}
              onChange={(e) => setForm({ ...form, serviceLabel: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            >
              <option>Pranzo</option>
              <option>Cena</option>
              <option>Brunch</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Data</label>
            <input
              type="date"
              value={form.slotDate}
              onChange={(e) => setForm({ ...form, slotDate: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Ora</label>
            <input
              type="time"
              value={form.slotTime}
              onChange={(e) => setForm({ ...form, slotTime: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Durata (min)</label>
            <input
              type="number"
              min={15}
              max={480}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Occasione</label>
            <input
              value={form.occasion}
              onChange={(e) => setForm({ ...form, occasion: e.target.value })}
              placeholder="compleanno"
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Allergie (separate da virgola)</label>
            <input
              value={form.allergiesText}
              onChange={(e) => setForm({ ...form, allergiesText: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Richieste speciali</label>
            <textarea
              rows={2}
              value={form.specialRequests}
              onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Salvo…' : 'Crea + Auto-assegna'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ReservationDrawer({
  reservation,
  tables,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  reservation: Reservation
  tables: TableT[]
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  function changeStatus(newStatus: Reservation['status']) {
    startTransition(async () => {
      await updateReservationStatus({
        reservationId: reservation.id,
        tenantSlug,
        entitySlug,
        status: newStatus,
      })
      onClose()
    })
  }

  const tableCodes = reservation.tableIds
    .map((tid) => tables.find((t) => t.id === tid)?.code)
    .filter(Boolean)
    .join(', ')

  const transitions: Record<Reservation['status'], Reservation['status'][]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated: ['finished', 'cancelled'],
    finished: [],
    cancelled: [],
    no_show: [],
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
      <div className="h-full w-96 overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{reservation.guestName}</h2>
            <p className="text-xs text-gray-500">{reservation.guestPhone ?? '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Coperti</span>
            <span className="font-medium">{reservation.partySize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Slot</span>
            <span className="font-medium">{reservation.slotDate} {reservation.slotTime.slice(0, 5)} · {reservation.durationMinutes}min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tavoli</span>
            <span className="font-medium">{tableCodes || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Stato</span>
            <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[reservation.status]}`}>
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Origine</span>
            <span className="font-medium">{reservation.source}</span>
          </div>
          {reservation.allergies.length > 0 && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              ⚠ Allergie: {reservation.allergies.join(', ')}
            </div>
          )}
          {reservation.occasion && (
            <div className="rounded border border-purple-200 bg-purple-50 p-2 text-xs text-purple-700">
              🎉 {reservation.occasion}
            </div>
          )}
          {reservation.specialRequests && (
            <div className="rounded bg-gray-50 p-2 text-xs text-gray-700">
              {reservation.specialRequests}
            </div>
          )}
        </div>

        {transitions[reservation.status].length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Cambia stato</p>
            <div className="flex flex-wrap gap-2">
              {transitions[reservation.status].map((newStatus) => (
                <button
                  key={newStatus}
                  onClick={() => changeStatus(newStatus)}
                  disabled={pending}
                  className={`rounded border px-2 py-1 text-xs font-medium ${STATUS_COLORS[newStatus]} hover:opacity-80`}
                >
                  → {STATUS_LABELS[newStatus]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
