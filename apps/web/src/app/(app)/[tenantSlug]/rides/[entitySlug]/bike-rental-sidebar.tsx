'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarClock,
  Bike,
  MapPin,
  Wrench,
  BarChart3,
  Settings,
  Plug,
  Tag,
  ShieldCheck,
  Globe,
  type LucideIcon,
} from 'lucide-react'

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  placeholder?: boolean
  milestone?: string
}

interface Props {
  tenantSlug: string
  entitySlug: string
  entityName: string
  hasRentalConfig: boolean
}

export function BikeRentalSidebar({ tenantSlug, entitySlug, entityName, hasRentalConfig }: Props) {
  const pathname = usePathname()
  const base = `/${tenantSlug}/rides/${entitySlug}`

  const items: SidebarItem[] = [
    { href: base, label: 'Panoramica', icon: LayoutDashboard },
    { href: `${base}/fleet`, label: 'Flotta', icon: Bike },
    { href: `${base}/reservations`, label: 'Prenotazioni', icon: CalendarClock },
    { href: `${base}/booking-engine`, label: 'Widget prenotazioni', icon: Globe },
    { href: `${base}/locations`, label: 'Depositi', icon: MapPin },
    { href: `${base}/maintenance`, label: 'Manutenzione', icon: Wrench, placeholder: true, milestone: 'M043' },
    { href: `${base}/pricing`, label: 'Tariffe & Promo', icon: Tag, placeholder: true, milestone: 'M040' },
    { href: `${base}/analytics`, label: 'Analytics', icon: BarChart3, placeholder: true, milestone: 'M045' },
    { href: `${base}/channels`, label: 'Channel Manager', icon: Plug },
    { href: `${base}/compliance`, label: 'Fiscale & GDPR', icon: ShieldCheck, placeholder: true, milestone: 'M044' },
    { href: `${base}/settings`, label: 'Impostazioni', icon: Settings },
  ]

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white pt-4 lg:block">
      <div className="px-4 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Noleggio Bici</p>
        <p className="mt-1 truncate text-sm font-semibold text-gray-900">{entityName}</p>
        {!hasRentalConfig && (
          <p className="mt-1 text-[10px] text-amber-600">Setup iniziale richiesto</p>
        )}
      </div>
      <nav className="space-y-0.5 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== base && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.placeholder ? '#' : item.href}
              aria-disabled={item.placeholder}
              onClick={(e) => item.placeholder && e.preventDefault()}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : item.placeholder
                    ? 'cursor-not-allowed text-gray-400'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate font-medium">{item.label}</span>
              {item.placeholder && item.milestone && (
                <span className="text-[9px] font-medium uppercase text-gray-400">{item.milestone}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
