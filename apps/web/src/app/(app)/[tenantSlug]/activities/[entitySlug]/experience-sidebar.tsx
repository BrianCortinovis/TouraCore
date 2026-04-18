'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  CalendarRange,
  CalendarClock,
  Users,
  ClipboardList,
  Printer,
  QrCode,
  FileCheck2,
  Plug,
  Settings,
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
}

export function ExperienceSidebar({ tenantSlug, entitySlug, entityName }: Props) {
  const pathname = usePathname()
  const base = `/${tenantSlug}/activities/${entitySlug}`

  const items: SidebarItem[] = [
    { href: base, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${base}/catalog`, label: 'Catalogo prodotti', icon: Package, placeholder: true, milestone: 'M052' },
    { href: `${base}/schedule`, label: 'Schedule', icon: CalendarRange, placeholder: true, milestone: 'M053' },
    { href: `${base}/slots`, label: 'Slot inventory', icon: CalendarClock, placeholder: true, milestone: 'M053' },
    { href: `${base}/resources`, label: 'Risorse (guide/mezzi)', icon: Users, placeholder: true, milestone: 'M054' },
    { href: `${base}/reservations`, label: 'Prenotazioni', icon: ClipboardList, placeholder: true, milestone: 'M055' },
    { href: `${base}/manifest`, label: 'Manifest giorno', icon: Printer, placeholder: true, milestone: 'M057' },
    { href: `${base}/checkin`, label: 'Check-in QR', icon: QrCode, placeholder: true, milestone: 'M057' },
    { href: `${base}/waivers`, label: 'Waiver digitali', icon: FileCheck2, placeholder: true, milestone: 'M056' },
    { href: `${base}/channels`, label: 'Channel Manager', icon: Plug, placeholder: true, milestone: 'M059' },
    { href: `${base}/settings`, label: 'Impostazioni', icon: Settings, placeholder: true, milestone: 'M052' },
  ]

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white pt-4 lg:block">
      <div className="px-4 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Esperienza</p>
        <p className="mt-1 truncate text-sm font-semibold text-gray-900">{entityName}</p>
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
