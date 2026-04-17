'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Check, Hotel, UtensilsCrossed, Sparkles, MapPin, Bike, Snowflake } from 'lucide-react'

type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

const MODULE_TO_VERTICAL: Record<ModuleCode, string> = {
  hospitality: 'stays',
  restaurant: 'dine',
  wellness: 'wellness',
  experiences: 'activities',
  bike_rental: 'bike',
  moto_rental: 'moto',
  ski_school: 'ski',
}

const MODULE_LABELS: Record<ModuleCode, string> = {
  hospitality: 'Ospitalità',
  restaurant: 'Ristorazione',
  wellness: 'Wellness',
  experiences: 'Esperienze',
  bike_rental: 'Bike',
  moto_rental: 'Moto',
  ski_school: 'Scuola sci',
}

const MODULE_ICONS: Record<ModuleCode, React.ElementType> = {
  hospitality: Hotel,
  restaurant: UtensilsCrossed,
  wellness: Sparkles,
  experiences: MapPin,
  bike_rental: Bike,
  moto_rental: Bike,
  ski_school: Snowflake,
}

interface Props {
  tenantSlug: string
  activeModules: ModuleCode[]
}

function getCurrentVerticalFromPath(path: string): ModuleCode | null {
  const parts = path.split('/').filter(Boolean)
  const segment = parts[1]
  if (!segment) return null
  const entries = Object.entries(MODULE_TO_VERTICAL) as Array<[ModuleCode, string]>
  const match = entries.find(([, v]) => v === segment)
  return match?.[0] ?? null
}

export function VerticalSwitcher({ tenantSlug, activeModules }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const current = useMemo(() => getCurrentVerticalFromPath(pathname), [pathname])
  const displayLabel = current ? MODULE_LABELS[current] : 'Seleziona vertical'
  const Icon = current ? MODULE_ICONS[current] : Hotel

  if (activeModules.length <= 1) {
    // solo 1 vertical: no switcher, solo chip informativo
    if (activeModules.length === 1 && current === activeModules[0]) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">{displayLabel}</span>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-700">{displayLabel}</span>
        <ChevronDown
          className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {activeModules.map((code) => {
            const VerticalIcon = MODULE_ICONS[code]
            const lastEntitySlug =
              typeof window !== 'undefined'
                ? window.localStorage.getItem(`tc.last-entity.${tenantSlug}.${code}`)
                : null
            const vertical = MODULE_TO_VERTICAL[code]
            const href = lastEntitySlug
              ? `/${tenantSlug}/${vertical}/${lastEntitySlug}`
              : `/${tenantSlug}/${vertical}`
            return (
              <Link
                key={code}
                href={href}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <VerticalIcon className="h-4 w-4 text-gray-500" />
                <span className="flex-1 truncate text-gray-700">{MODULE_LABELS[code]}</span>
                {code === current && <Check className="h-4 w-4 text-blue-600" />}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
