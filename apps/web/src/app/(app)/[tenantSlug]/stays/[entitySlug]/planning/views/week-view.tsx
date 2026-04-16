'use client'

import { useMemo } from 'react'
import type { PlanningData, PlanningBooking, PlanningBlock } from '../actions'
import { getStructureTerms } from '../../../../../../structure-terms'
import {
  STATUS_STYLES,
  groupRoomsByType,
  buildBookingIndex,
  buildBlockIndex,
  dateRange,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isToday,
  toIsoDate,
} from '../planning-types'

interface WeekViewProps {
  data: PlanningData
  currentDate: Date
  onBookingClick: (id: string) => void
  propertyType?: string | null
}

const ROW_HEIGHT = 56
const ROOM_COL_WIDTH = 240
const DAY_COL_WIDTH = 160

export function WeekView({ data, currentDate, onBookingClick, propertyType }: WeekViewProps) {
  const terms = getStructureTerms(propertyType)
  const days = useMemo(() => {
    return dateRange(startOfWeek(currentDate), endOfWeek(currentDate))
  }, [currentDate])

  const groups = useMemo(() => groupRoomsByType(data.rooms), [data.rooms])
  const bookingIndex = useMemo(() => buildBookingIndex(data.bookings), [data.bookings])
  const blockIndex = useMemo(() => buildBlockIndex(data.blocks), [data.blocks])

  if (data.rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Nessuna {terms.unitLabel} configurata.
      </div>
    )
  }

  const totalWidth = ROOM_COL_WIDTH + days.length * DAY_COL_WIDTH

  return (
    <div className="h-full overflow-auto">
      <div style={{ width: totalWidth }} className="relative">
        <div
          className="sticky top-0 z-30 flex bg-gray-50 border-b border-gray-200"
          style={{ width: totalWidth }}
        >
          <div
            className="sticky left-0 z-40 shrink-0 border-r border-gray-200 bg-gray-50 px-3 py-3 text-xs font-medium text-gray-500"
            style={{ width: ROOM_COL_WIDTH }}
          >
            {terms.unitLabelTitle}
          </div>
          {days.map((day) => {
            const weekend = isWeekend(day)
            const today = isToday(day)
            return (
              <div
                key={toIsoDate(day)}
                className={`shrink-0 border-r border-gray-200 py-3 text-center ${
                  weekend ? 'bg-gray-100' : ''
                } ${today ? 'bg-blue-100 font-semibold' : ''}`}
                style={{ width: DAY_COL_WIDTH }}
              >
                <div className={`text-xs uppercase ${today ? 'text-blue-700' : 'text-gray-500'}`}>
                  {day.toLocaleDateString('it-IT', { weekday: 'long' })}
                </div>
                <div className={`text-lg ${today ? 'text-blue-700' : 'text-gray-900'}`}>
                  {day.getDate()}{' '}
                  <span className="text-xs font-normal text-gray-400">
                    {day.toLocaleDateString('it-IT', { month: 'short' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {groups.map((group) => (
          <div key={group.type_id}>
            <div
              className="sticky left-0 z-20 border-b border-t border-gray-200 bg-gray-100 px-3 py-2"
              style={{ width: totalWidth }}
            >
              <div style={{ width: ROOM_COL_WIDTH }}>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  {group.type_name}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {group.rooms.length}{' '}
                  {group.rooms.length === 1 ? terms.unitLabel : terms.unitLabelPlural}
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
                  <div
                    className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-gray-200 bg-white px-3"
                    style={{ width: ROOM_COL_WIDTH }}
                  >
                    <p className="truncate text-sm font-medium text-gray-900">
                      {room.room_number}
                    </p>
                    {room.floor !== null && (
                      <p className="text-xs text-gray-400">Piano {room.floor}</p>
                    )}
                  </div>

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

                  {roomBlocks.map((block) => (
                    <BlockBar key={block.id} block={block} days={days} />
                  ))}

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

  const lastDayEnd = new Date(lastDay.getTime() + 86400000)
  const visibleStart = checkIn < firstDay ? firstDay : checkIn
  const visibleEnd = checkOut > lastDayEnd ? lastDayEnd : checkOut

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
  const isEndVisible = checkOut <= lastDayEnd

  const leftOffset = ROOM_COL_WIDTH + startIdx * DAY_COL_WIDTH + (isStartVisible ? DAY_COL_WIDTH / 2 : 0)
  const width =
    span * DAY_COL_WIDTH -
    (isStartVisible ? DAY_COL_WIDTH / 2 : 0) -
    (isEndVisible ? DAY_COL_WIDTH / 2 : 0)

  if (width <= 0) return null

  return (
    <button
      onClick={onClick}
      className="absolute flex items-center gap-2 overflow-hidden rounded px-3 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:z-30 focus:outline-none focus:ring-2 focus:ring-blue-500"
      style={{
        left: leftOffset,
        width,
        top: 10,
        height: 36,
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        color: style.text,
        zIndex: 15,
      }}
      title={`${booking.guest_name} · ${booking.check_in} → ${booking.check_out}`}
    >
      <span className="truncate font-semibold">{booking.guest_name}</span>
      {booking.adults > 0 && (
        <span className="shrink-0 text-xs opacity-70">{booking.adults + booking.children} osp.</span>
      )}
    </button>
  )
}

function BlockBar({ block, days }: { block: PlanningBlock; days: Date[] }) {
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
        top: 10,
        height: 36,
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
