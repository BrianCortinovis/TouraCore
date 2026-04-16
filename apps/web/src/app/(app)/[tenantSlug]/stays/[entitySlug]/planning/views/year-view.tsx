'use client'

import { useMemo } from 'react'
import type { PlanningData } from '../actions'
import { getStructureTerms } from '../../../../../../structure-terms'

interface YearViewProps {
  data: PlanningData
  currentDate: Date
  onNavigateToMonth: (date: Date) => void
  propertyType?: string | null
}

const MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

export function YearView({ data, currentDate, onNavigateToMonth, propertyType }: YearViewProps) {
  const terms = getStructureTerms(propertyType)
  const year = currentDate.getFullYear()
  const totalRooms = data.rooms.length

  // Matrix [month 0-11][day 0-30] = occupancy count
  const occupancyMatrix = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 12 }, () => new Array(31).fill(0))

    for (const b of data.bookings) {
      if (b.status === 'cancelled' || b.status === 'no_show') continue
      const start = new Date(b.check_in)
      const end = new Date(b.check_out)

      const current = new Date(start)
      while (current < end) {
        if (current.getFullYear() === year) {
          const m = current.getMonth()
          const d = current.getDate() - 1
          if (m >= 0 && m < 12 && d >= 0 && d < 31) {
            const row = matrix[m]
            if (row) row[d] = (row[d] ?? 0) + 1
          }
        }
        current.setDate(current.getDate() + 1)
      }
    }
    return matrix
  }, [data.bookings, year])

  if (totalRooms === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Nessuna {terms.unitLabel} configurata. Serve almeno una {terms.unitLabel} per calcolare l&apos;occupazione.
      </div>
    )
  }

  function getColor(occupancy: number): string {
    if (occupancy === 0) return '#F9FAFB' // vuoto
    const pct = Math.min(100, (occupancy / totalRooms) * 100)
    if (pct < 25) return '#DBEAFE' // blu chiarissimo
    if (pct < 50) return '#93C5FD' // blu chiaro
    if (pct < 75) return '#3B82F6' // blu
    if (pct < 90) return '#2563EB' // blu scuro
    return '#1E40AF' // blu molto scuro (full)
  }

  function daysInMonth(month: number): number {
    return new Date(year, month + 1, 0).getDate()
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Occupazione annuale
          </h3>
          <p className="text-xs text-gray-500">
            Click su un mese per visualizzare il dettaglio
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Libero</span>
          <div className="flex gap-px">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }} />
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: '#DBEAFE' }} />
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: '#93C5FD' }} />
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: '#2563EB' }} />
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: '#1E40AF' }} />
          </div>
          <span>Pieno</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1 pl-28">
          {Array.from({ length: 31 }, (_, i) => (
            <div
              key={i}
              className="w-5 text-center text-[9px] text-gray-400"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {MONTHS.map((monthName, monthIdx) => {
          const dim = daysInMonth(monthIdx)
          const row = occupancyMatrix[monthIdx] ?? []
          const monthTotal = row.slice(0, dim).reduce((sum, v) => sum + v, 0)
          const monthCapacity = totalRooms * dim
          const monthPct = monthCapacity > 0 ? Math.round((monthTotal / monthCapacity) * 100) : 0

          return (
            <button
              key={monthName}
              onClick={() => onNavigateToMonth(new Date(year, monthIdx, 1))}
              className="group flex w-full items-center gap-1 rounded p-1 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex w-24 shrink-0 items-center justify-between pr-3">
                <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">
                  {monthName}
                </span>
                <span className="text-[10px] text-gray-400">{monthPct}%</span>
              </div>
              <div className="flex gap-px">
                {Array.from({ length: 31 }, (_, dayIdx) => {
                  if (dayIdx >= dim) {
                    return <div key={dayIdx} className="h-5 w-5" />
                  }
                  const occ = row[dayIdx] ?? 0
                  const pct = totalRooms > 0 ? Math.round((occ / totalRooms) * 100) : 0
                  return (
                    <div
                      key={dayIdx}
                      className="h-5 w-5 rounded-sm border border-white"
                      style={{ backgroundColor: getColor(occ) }}
                      title={`${monthName} ${dayIdx + 1}: ${occ}/${totalRooms} (${pct}%)`}
                    />
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
