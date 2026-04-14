'use client'

import { useMemo } from 'react'
import type { PlanningData, PlanningBooking, PlanningBlock } from '../actions'
import {
  STATUS_STYLES,
  groupRoomsByType,
  buildBookingIndex,
  buildBlockIndex,
  dateRange,
  startOfMonth,
  endOfMonth,
  isWeekend,
  isToday,
  toIsoDate,
} from '../planning-types'

interface MonthViewProps {
  data: PlanningData
  currentDate: Date
  onBookingClick: (id: string) => void
}

const ROW_HEIGHT = 44
const ROOM_COL_WIDTH = 220
const DAY_COL_WIDTH = 44

export function MonthView({ data, currentDate, onBookingClick }: MonthViewProps) {
  const days = useMemo(() => {
    return dateRange(startOfMonth(currentDate), endOfMonth(currentDate))
  }, [currentDate])

  const groups = useMemo(() => groupRoomsByType(data.rooms), [data.rooms])
  const bookingIndex = useMemo(() => buildBookingIndex(data.bookings), [data.bookings])
  const blockIndex = useMemo(() => buildBlockIndex(data.blocks), [data.blocks])

  if (data.rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Nessuna camera creata. Configura le camere della struttura prima di usare il planning.
      </div>
    )
  }

  const totalWidth = ROOM_COL_WIDTH + days.length * DAY_COL_WIDTH

  return (
    <div className="h-full overflow-auto">
      <div style={{ width: totalWidth }} className="relative">
        {/* Header date */}
        <div
          className="sticky top-0 z-30 flex bg-gray-50 border-b border-gray-200"
          style={{ width: totalWidth }}
        >
          <div
            className="sticky left-0 z-40 shrink-0 border-r border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500"
            style={{ width: ROOM_COL_WIDTH }}
          >
            Camera
          </div>
          {days.map((day) => {
            const weekend = isWeekend(day)
            const today = isToday(day)
            return (
              <div
                key={toIsoDate(day)}
                className={`shrink-0 border-r border-gray-200 py-2 text-center text-xs ${
                  weekend ? 'bg-gray-100' : ''
                } ${today ? 'bg-blue-100 font-semibold' : ''}`}
                style={{ width: DAY_COL_WIDTH }}
              >
                <div className={`text-[10px] uppercase ${today ? 'text-blue-700' : 'text-gray-500'}`}>
                  {day.toLocaleDateString('it-IT', { weekday: 'short' })}
                </div>
                <div className={`text-sm ${today ? 'text-blue-700' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Body: un gruppo per tipologia */}
        {groups.map((group) => (
          <div key={group.type_id}>
            {/* Header gruppo */}
            <div
              className="sticky left-0 z-20 border-b border-t border-gray-200 bg-gray-100 px-3 py-1.5"
              style={{ width: totalWidth }}
            >
              <div className="sticky left-0" style={{ width: ROOM_COL_WIDTH }}>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  {group.type_name}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {group.rooms.length}{' '}
                  {group.rooms.length === 1 ? 'camera' : 'camere'}
                </span>
              </div>
            </div>

            {group.rooms.map((room) => {
              const roomBookings = bookingIndex.get(room.id) ?? []
              const roomBlocks = blockIndex.get(room.id) ?? []

              return (
                <div
                  key={room.id}
                  className="relative flex border-b border-gray-100 hover:bg-gray-50/40"
                  style={{ width: totalWidth, height: ROW_HEIGHT }}
                >
                  {/* Nome camera sticky */}
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center border-r border-gray-200 bg-white px-3"
                    style={{ width: ROOM_COL_WIDTH }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {room.room_number}
                      </p>
                      {room.floor !== null && (
                        <p className="text-[10px] text-gray-400">Piano {room.floor}</p>
                      )}
                    </div>
                  </div>

                  {/* Celle giorno (sfondo) */}
                  {days.map((day) => {
                    const weekend = isWeekend(day)
                    const today = isToday(day)
                    return (
                      <div
                        key={toIsoDate(day)}
                        className={`shrink-0 border-r border-gray-100 ${
                          weekend ? 'bg-gray-50/50' : ''
                        } ${today ? 'bg-blue-50/40' : ''}`}
                        style={{ width: DAY_COL_WIDTH }}
                      />
                    )
                  })}

                  {/* Blocks sovrapposti */}
                  {roomBlocks.map((block) => (
                    <BlockBar key={block.id} block={block} days={days} />
                  ))}

                  {/* Bookings sovrapposti */}
                  {roomBookings.map((booking) => (
                    <BookingBar
                      key={booking.id}
                      booking={booking}
                      days={days}
                      onClick={() => onBookingClick(booking.id)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

interface BookingBarProps {
  booking: PlanningBooking
  days: Date[]
  onClick: () => void
}

function BookingBar({ booking, days, onClick }: BookingBarProps) {
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  if (!firstDay || !lastDay) return null

  const checkIn = new Date(booking.check_in)
  const checkOut = new Date(booking.check_out)

  // Clamp visible range
  const visibleStart = checkIn < firstDay ? firstDay : checkIn
  const visibleEnd = checkOut > new Date(lastDay.getTime() + 86400000) ? new Date(lastDay.getTime() + 86400000) : checkOut

  const startIdx = Math.max(
    0,
    Math.floor((visibleStart.getTime() - firstDay.getTime()) / 86400000)
  )
  const endIdx = Math.min(
    days.length,
    Math.ceil((visibleEnd.getTime() - firstDay.getTime()) / 86400000)
  )

  const span = endIdx - startIdx
  if (span <= 0) return null

  const style = STATUS_STYLES[booking.status]
  const isStartVisible = checkIn >= firstDay
  const isEndVisible = checkOut <= new Date(lastDay.getTime() + 86400000)

  // Check-in parte a metà della cella, check-out finisce a metà cella
  const leftOffset = ROOM_COL_WIDTH + startIdx * DAY_COL_WIDTH + (isStartVisible ? DAY_COL_WIDTH / 2 : 0)
  const width =
    span * DAY_COL_WIDTH -
    (isStartVisible ? DAY_COL_WIDTH / 2 : 0) -
    (isEndVisible ? DAY_COL_WIDTH / 2 : 0)

  if (width <= 0) return null

  return (
    <button
      onClick={onClick}
      className="absolute flex items-center gap-1 overflow-hidden rounded px-2 text-xs font-medium shadow-sm transition-all hover:shadow-md hover:z-30 focus:outline-none focus:ring-2 focus:ring-blue-500"
      style={{
        left: leftOffset,
        width,
        top: 6,
        height: 32,
        backgroundColor: style.bg,
        borderLeft: `3px solid ${style.border}`,
        color: style.text,
        zIndex: 15,
      }}
      title={`${booking.guest_name} · ${booking.check_in} → ${booking.check_out} · ${style.label}`}
    >
      <span className="truncate">{booking.guest_name}</span>
      {booking.adults > 0 && (
        <span className="shrink-0 opacity-60">· {booking.adults + booking.children}</span>
      )}
    </button>
  )
}

interface BlockBarProps {
  block: PlanningBlock
  days: Date[]
}

function BlockBar({ block, days }: BlockBarProps) {
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  if (!firstDay || !lastDay) return null

  const from = new Date(block.date_from)
  const to = new Date(block.date_to)
  const visibleStart = from < firstDay ? firstDay : from
  const visibleEnd = to > lastDay ? lastDay : to

  const startIdx = Math.max(
    0,
    Math.floor((visibleStart.getTime() - firstDay.getTime()) / 86400000)
  )
  const endIdx = Math.min(
    days.length,
    Math.ceil((visibleEnd.getTime() - firstDay.getTime()) / 86400000) + 1
  )

  const span = endIdx - startIdx
  if (span <= 0) return null

  return (
    <div
      className="absolute rounded"
      style={{
        left: ROOM_COL_WIDTH + startIdx * DAY_COL_WIDTH,
        width: span * DAY_COL_WIDTH,
        top: 6,
        height: 32,
        background:
          'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 6px, #FACC15 6px, #FACC15 12px)',
        border: '1px solid #EAB308',
        opacity: 0.7,
        zIndex: 10,
      }}
      title={block.reason ?? 'Manutenzione'}
    />
  )
}
