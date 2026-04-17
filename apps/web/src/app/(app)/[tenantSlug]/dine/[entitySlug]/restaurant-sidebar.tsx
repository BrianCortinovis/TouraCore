'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  Settings,
  ShoppingCart,
  Receipt,
  type LucideIcon,
} from 'lucide-react'

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  placeholder?: boolean
}

interface Props {
  tenantSlug: string
  entitySlug: string
  entityName: string
  managementMode: 'agency_managed' | 'self_service'
  hasRestaurantConfig: boolean
  allEntities: Array<{ id: string; slug: string; name: string; management_mode: string }>
}

export function RestaurantSidebar({ tenantSlug, entitySlug, entityName, hasRestaurantConfig }: Props) {
  const pathname = usePathname()
  const base = `/${tenantSlug}/dine/${entitySlug}`

  const items: SidebarItem[] = [
    { href: base, label: 'Panoramica', icon: LayoutDashboard },
    { href: `${base}/floor-plan`, label: 'Pianta sala', icon: LayoutGrid },
    { href: `${base}/reservations`, label: 'Prenotazioni', icon: CalendarClock },
    { href: `${base}/waitlist`, label: 'Lista attesa', icon: Users },
    { href: `${base}/menu`, label: 'Menu', icon: UtensilsCrossed },
    { href: `${base}/pos`, label: 'POS', icon: ShoppingCart },
    { href: `${base}/orders`, label: 'Ordini', icon: Receipt },
    { href: `${base}/settings`, label: 'Impostazioni', icon: Settings },
  ]

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white pt-4 lg:block">
      <div className="px-4 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Ristorante</p>
        <p className="mt-1 truncate text-sm font-semibold text-gray-900">{entityName}</p>
        {!hasRestaurantConfig && (
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
              {item.placeholder && (
                <span className="text-[9px] font-medium uppercase text-gray-400">M023</span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
