'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, CalendarRange, CalendarClock, Users,
  ClipboardList, Printer, QrCode, FileCheck2, Plug, Settings, Globe,
  type LucideIcon,
} from 'lucide-react'

interface SidebarItem { href: string; label: string; icon: LucideIcon }
interface Props { tenantSlug: string; entitySlug: string; entityName: string }

export function ExperienceSidebar({ tenantSlug, entitySlug, entityName }: Props) {
  const pathname = usePathname()
  const base = `/${tenantSlug}/activities/${entitySlug}`

  const items: SidebarItem[] = [
    { href: base, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${base}/catalog`, label: 'Catalogo prodotti', icon: Package },
    { href: `${base}/schedule`, label: 'Schedule', icon: CalendarRange },
    { href: `${base}/slots`, label: 'Slot inventory', icon: CalendarClock },
    { href: `${base}/resources`, label: 'Risorse (guide/mezzi)', icon: Users },
    { href: `${base}/reservations`, label: 'Prenotazioni', icon: ClipboardList },
    { href: `${base}/booking-engine`, label: 'Widget prenotazioni', icon: Globe },
    { href: `${base}/manifest`, label: 'Manifest giorno', icon: Printer },
    { href: `${base}/checkin`, label: 'Check-in QR', icon: QrCode },
    { href: `${base}/waivers`, label: 'Waiver digitali', icon: FileCheck2 },
    { href: `${base}/channels`, label: 'Channel Manager', icon: Plug },
    { href: `${base}/settings`, label: 'Impostazioni', icon: Settings },
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
              href={item.href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
