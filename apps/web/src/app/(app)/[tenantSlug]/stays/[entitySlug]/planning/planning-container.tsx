'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getPlanningDataAction, type PlanningData } from './actions'
import {
  type PlanningView,
  computeKPIs,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  toIsoDate,
  addDays,
} from './planning-types'
import { PlanningToolbar } from './planning-toolbar'
import { PlanningKPIBar } from './planning-kpi-bar'
import { MonthView } from './views/month-view'
import { WeekView } from './views/week-view'
import { DayView } from './views/day-view'
import { YearView } from './views/year-view'
import { ReservationDrawer } from './reservation-drawer'

interface PlanningContainerProps {
  entityId: string
  entityName: string
}

export function PlanningContainer({ entityId, entityName }: PlanningContainerProps) {
  const [view, setView] = useState<PlanningView>('month')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [data, setData] = useState<PlanningData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Range di date da caricare in base alla vista
  const { fromDate, toDate } = useMemo(() => {
    const d = currentDate
    switch (view) {
      case 'day': {
        // Day view carica la giornata + 2 giorni padding per sicurezza
        return {
          fromDate: addDays(d, -1),
          toDate: addDays(d, 2),
        }
      }
      case 'week': {
        return { fromDate: startOfWeek(d), toDate: addDays(endOfWeek(d), 1) }
      }
      case 'month': {
        const start = startOfMonth(d)
        const end = endOfMonth(d)
        return { fromDate: addDays(start, -2), toDate: addDays(end, 2) }
      }
      case 'year': {
        return { fromDate: startOfYear(d), toDate: addDays(endOfYear(d), 1) }
      }
    }
  }, [view, currentDate])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await getPlanningDataAction(
      entityId,
      toIsoDate(fromDate),
      toIsoDate(toDate)
    )
    if (result.success && result.data) {
      setData(result.data)
    } else {
      setError(result.error ?? 'Errore nel caricamento dati')
    }
    setIsLoading(false)
  }, [entityId, fromDate, toDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const kpis = useMemo(() => {
    if (!data) return null
    return computeKPIs(data.rooms, data.bookings, new Date())
  }, [data])

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId || !data) return null
    return data.bookings.find((b) => b.id === selectedBookingId) ?? null
  }, [selectedBookingId, data])

  function handleNavigate(direction: 'prev' | 'next' | 'today') {
    if (direction === 'today') {
      setCurrentDate(new Date())
      return
    }
    const delta = direction === 'next' ? 1 : -1
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + delta)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + delta * 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + delta)
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + delta)
        break
    }
    setCurrentDate(newDate)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <PlanningToolbar
        entityName={entityName}
        view={view}
        currentDate={currentDate}
        onViewChange={setView}
        onNavigate={handleNavigate}
      />

      {kpis && <PlanningKPIBar kpis={kpis} />}

      <div className="flex-1 min-h-0 overflow-hidden mt-4 rounded-lg border border-gray-200 bg-white">
        {isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Caricamento planning...
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center text-sm text-red-600">
            {error}
          </div>
        )}
        {!isLoading && !error && data && (
          <>
            {view === 'month' && (
              <MonthView
                data={data}
                currentDate={currentDate}
                onBookingClick={setSelectedBookingId}
              />
            )}
            {view === 'week' && (
              <WeekView
                data={data}
                currentDate={currentDate}
                onBookingClick={setSelectedBookingId}
              />
            )}
            {view === 'day' && (
              <DayView
                data={data}
                currentDate={currentDate}
                onBookingClick={setSelectedBookingId}
              />
            )}
            {view === 'year' && (
              <YearView
                data={data}
                currentDate={currentDate}
                onNavigateToMonth={(month) => {
                  setCurrentDate(month)
                  setView('month')
                }}
              />
            )}
          </>
        )}
      </div>

      {selectedBooking && (
        <ReservationDrawer
          booking={selectedBooking}
          rooms={data?.rooms ?? []}
          onClose={() => setSelectedBookingId(null)}
        />
      )}
    </div>
  )
}
