'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Settings,
  Plug,
  Gift,
} from 'lucide-react'

interface AgencySidebarProps {
  agencyName: string
}

export function AgencySidebar({ agencyName }: AgencySidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/agency', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/agency/clients', label: 'Clienti', icon: Building2 },
    { href: '/agency/billing', label: 'Billing', icon: Gift },
    { href: '/agency/settings/integrations', label: 'Integrazioni', icon: Plug },
    { href: '/agency/settings', label: 'Impostazioni', icon: Settings },
  ]

  return (
    <aside className="w-24 shrink-0">
      <div className="sticky top-20 space-y-2" style={{ paddingLeft: 2, paddingRight: 2 }}>
        <div className="mb-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Agenzia
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-gray-700" title={agencyName}>
            {agencyName}
          </p>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-md py-2 transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.label}
              >
                <item.icon className="h-7 w-7" />
                <span className="text-center text-[11px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
