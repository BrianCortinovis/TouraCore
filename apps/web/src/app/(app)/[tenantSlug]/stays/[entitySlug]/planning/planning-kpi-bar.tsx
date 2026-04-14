'use client'

import {
  Gauge,
  LogIn,
  LogOut,
  Bed,
  DoorOpen,
  Euro,
} from 'lucide-react'
import type { PlanningKPI } from './planning-types'

interface PlanningKPIBarProps {
  kpis: PlanningKPI
}

export function PlanningKPIBar({ kpis }: PlanningKPIBarProps) {
  const items = [
    {
      icon: Gauge,
      label: 'Occupazione',
      value: `${kpis.occupancyPct}%`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: LogIn,
      label: 'Arrivi oggi',
      value: kpis.arrivals,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: LogOut,
      label: 'Partenze oggi',
      value: kpis.departures,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      icon: Bed,
      label: 'In casa',
      value: kpis.inHouse,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      icon: DoorOpen,
      label: 'Libere',
      value: kpis.available,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
    {
      icon: Euro,
      label: 'Incasso oggi',
      value: `€ ${kpis.revenueToday.toFixed(0)}`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
        >
          <div className={`rounded-md p-2 ${item.bg}`}>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500">{item.label}</p>
            <p className="text-lg font-semibold text-gray-900">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
