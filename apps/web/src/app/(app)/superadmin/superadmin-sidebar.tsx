'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Cog,
  CreditCard,
  GitBranch,
  Layers3,
  Network,
  SearchCheck,
  Shield,
  LogOut,
  Gift,
  Package,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Command',
    items: [
      { href: '/superadmin', label: 'Overview', icon: LayoutDashboard },
      { href: '/superadmin/system', label: 'Piattaforma', icon: Cog },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/superadmin/security', label: 'Sicurezza', icon: Shield },
      { href: '/superadmin/billing', label: 'Billing', icon: CreditCard },
      { href: '/superadmin/billing/catalog', label: 'Catalogo moduli', icon: Package },
      { href: '/superadmin/billing/overrides', label: 'Override free', icon: Gift },
      { href: '/superadmin/integrations', label: 'Integrazioni', icon: Network },
    ],
  },
  {
    title: 'Suite',
    items: [
      { href: '/superadmin/tenancy', label: 'Tenancy', icon: GitBranch },
      { href: '/superadmin/architecture', label: 'Architettura', icon: Layers3 },
      { href: '/superadmin/clients', label: 'Clienti', icon: Building2 },
      { href: '/superadmin/agencies', label: 'Agenzie', icon: Briefcase },
    ],
  },
]

interface SuperadminSidebarProps {
  role: string
}

export function SuperadminSidebar({ role }: SuperadminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-72 shrink-0">
      <div className="sticky top-6 space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <SearchCheck className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Superadmin</p>
          <h2 className="mt-2 text-lg font-semibold">Control Room</h2>
          <p className="mt-1 text-sm text-white/70">
            {role === 'super_admin' ? 'Full platform access' : 'Restricted admin access'}
          </p>
        </div>

        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {group.title}
              </p>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Session</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </p>
          <form action="/auth/signout" method="POST" className="mt-3">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
