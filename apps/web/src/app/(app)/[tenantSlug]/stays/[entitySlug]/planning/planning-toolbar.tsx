'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PlanningView } from './planning-types'
import { formatMonthYear, startOfWeek, endOfWeek, formatDayMonth } from './planning-types'

interface PlanningToolbarProps {
  entityName: string
  view: PlanningView
  currentDate: Date
  onViewChange: (v: PlanningView) => void
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
}

const VIEW_LABELS: Record<PlanningView, string> = {
  day: 'Giorno',
  week: 'Settimana',
  month: 'Mese',
  year: 'Anno',
}

export function PlanningToolbar({
  entityName,
  view,
  currentDate,
  onViewChange,
  onNavigate,
}: PlanningToolbarProps) {
  function getTitle(): string {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      case 'week': {
        const start = startOfWeek(currentDate)
        const end = endOfWeek(currentDate)
        return `${formatDayMonth(start)} — ${formatDayMonth(end)} ${end.getFullYear()}`
      }
      case 'month':
        return formatMonthYear(currentDate)
      case 'year':
        return String(currentDate.getFullYear())
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Planning
          </p>
          <h1 className="text-lg font-semibold text-gray-900">{entityName}</h1>
        </div>

        <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
          <button
            onClick={() => onNavigate('prev')}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigate('today')}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Oggi
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Successivo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-base font-semibold text-gray-900 capitalize">
          {getTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {(['day', 'week', 'month', 'year'] as PlanningView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === v
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  )
}
