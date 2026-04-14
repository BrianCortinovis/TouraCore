'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Cog,
  LogOut,
  Shield,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/superadmin', label: 'Overview', icon: LayoutDashboard },
  { href: '/superadmin/clients', label: 'Clienti', icon: Building2 },
  { href: '/superadmin/agencies', label: 'Agenzie', icon: Briefcase },
  { href: '/superadmin/system', label: 'Sistema', icon: Cog },
]

interface SuperadminSidebarProps {
  role: string
}

export function SuperadminSidebar({ role }: SuperadminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-24 shrink-0">
      <div className="sticky top-20 space-y-2" style={{ paddingLeft: 2, paddingRight: 2 }}>
        <div className="mb-2 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
            <Shield className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Platform
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
            {role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </p>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-md py-2 transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.label}
              >
                <item.icon className="h-7 w-7" />
                <span className="text-[11px] font-medium leading-none text-center">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 pt-2">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full flex-col items-center gap-1 rounded-md py-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Esci dalla piattaforma"
            >
              <LogOut className="h-7 w-7" />
              <span className="text-[11px] font-medium leading-none">Esci</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
