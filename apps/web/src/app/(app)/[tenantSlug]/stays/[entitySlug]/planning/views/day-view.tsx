'use client'

import { useMemo } from 'react'
import { LogIn, LogOut, Bed, Users } from 'lucide-react'
import type { PlanningData, PlanningBooking } from '../actions'
import { getStructureTerms } from '../../../../../../structure-terms'
import { STATUS_STYLES, toIsoDate } from '../planning-types'

interface DayViewProps {
  data: PlanningData
  currentDate: Date
  onBookingClick: (id: string) => void
  propertyType?: string | null
}

export function DayView({ data, currentDate, onBookingClick, propertyType }: DayViewProps) {
  const terms = getStructureTerms(propertyType)
  const todayIso = toIsoDate(currentDate)

  const { arrivals, departures, inHouse } = useMemo(() => {
    const arr: PlanningBooking[] = []
    const dep: PlanningBooking[] = []
    const ih: PlanningBooking[] = []

    for (const b of data.bookings) {
      if (b.status === 'cancelled' || b.status === 'no_show' || b.status === 'checked_out') continue
      if (b.check_in === todayIso) arr.push(b)
      if (b.check_out === todayIso) dep.push(b)
      if (b.check_in <= todayIso && b.check_out > todayIso) ih.push(b)
    }
    return { arrivals: arr, departures: dep, inHouse: ih }
  }, [data.bookings, todayIso])

  const roomMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of data.rooms) m.set(r.id, r.room_number)
    return m
  }, [data.rooms])

  if (data.rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Nessuna {terms.unitLabel} configurata.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <ColumnSection
          title="Arrivi"
          icon={<LogIn className="h-4 w-4 text-green-600" />}
          accentColor="border-green-200 bg-green-50"
          count={arrivals.length}
          bookings={arrivals}
          roomMap={roomMap}
          onBookingClick={onBookingClick}
          emptyMessage="Nessun arrivo oggi"
        />
        <ColumnSection
          title="Partenze"
          icon={<LogOut className="h-4 w-4 text-orange-600" />}
          accentColor="border-orange-200 bg-orange-50"
          count={departures.length}
          bookings={departures}
          roomMap={roomMap}
          onBookingClick={onBookingClick}
          emptyMessage="Nessuna partenza oggi"
        />
        <ColumnSection
          title="In casa"
          icon={<Bed className="h-4 w-4 text-purple-600" />}
          accentColor="border-purple-200 bg-purple-50"
          count={inHouse.length}
          bookings={inHouse}
          roomMap={roomMap}
          onBookingClick={onBookingClick}
          emptyMessage="Nessun ospite in casa"
        />
      </div>
    </div>
  )
}

interface ColumnSectionProps {
  title: string
  icon: React.ReactNode
  accentColor: string
  count: number
  bookings: PlanningBooking[]
  roomMap: Map<string, string>
  onBookingClick: (id: string) => void
  emptyMessage: string
}

function ColumnSection({
  title,
  icon,
  accentColor,
  count,
  bookings,
  roomMap,
  onBookingClick,
  emptyMessage,
}: ColumnSectionProps) {
  return (
    <div className="flex flex-col">
      <div className={`flex items-center gap-2 rounded-t-lg border border-b-0 ${accentColor} px-4 py-3`}>
        {icon}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
          {count}
        </span>
      </div>

      <div className="flex-1 space-y-2 rounded-b-lg border border-gray-200 bg-white p-3">
        {bookings.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400">{emptyMessage}</p>
        )}
        {bookings.map((booking) => {
          const style = STATUS_STYLES[booking.status]
          const roomNumber = booking.room_id
            ? (roomMap.get(booking.room_id) ?? '—')
            : 'Non assegnata'

          return (
            <button
              key={booking.id}
              onClick={() => onBookingClick(booking.id)}
              className="flex w-full items-start gap-3 rounded-md border border-gray-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div
                className="h-10 w-1 shrink-0 rounded"
                style={{ backgroundColor: style.border }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {booking.guest_name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Camera {roomNumber}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    {new Date(booking.check_in).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    →{' '}
                    {new Date(booking.check_out).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  {booking.adults > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {booking.adults + booking.children}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                }}
              >
                {style.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
