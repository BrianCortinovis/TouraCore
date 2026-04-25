'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User,
  Building2,
  CreditCard,
  Users,
  Bell,
  Package,
  Plug,
  LayoutGrid,
  Sparkles,
  Receipt,
  Gift,
  Handshake,
  Globe,
  Code2,
  Palette,
} from 'lucide-react'

interface SettingsSidebarProps {
  tenantSlug: string
  tenantName: string
  firstEntitySlug: string | null
}

export function SettingsSidebar({
  tenantSlug,
  tenantName,
  firstEntitySlug,
}: SettingsSidebarProps) {
  const pathname = usePathname()
  const base = `/${tenantSlug}/settings`

  const navItems = [
    { href: `${base}/profile`, label: 'Profilo', icon: User },
    { href: `${base}/business`, label: 'Azienda', icon: Building2 },
    { href: `${base}/legal-entities`, label: 'Fiscale', icon: Receipt },
    { href: `${base}/billing`, label: 'Fatturazione', icon: CreditCard },
    { href: `${base}/team`, label: 'Team', icon: Users },
    { href: `${base}/modules`, label: 'Moduli', icon: Package },
    { href: `${base}/booking-engine`, label: 'Booking', icon: Sparkles },
    { href: `${base}/branding`, label: 'Branding', icon: Palette },
    { href: `${base}/distribution`, label: 'Distribuzione', icon: Globe },
    { href: `${base}/embed-studio`, label: 'Embed', icon: Code2 },
    { href: `${base}/credits`, label: 'Credits', icon: Gift },
    { href: `${base}/partners`, label: 'Partners', icon: Handshake },
    { href: `${base}/integrations`, label: 'Integrazioni', icon: Plug },
    { href: `${base}/preferences`, label: 'Preferenze', icon: Bell },
  ]

  // Target CMS: prima struttura se esiste, altrimenti lista strutture
  const cmsTarget = firstEntitySlug
    ? `/${tenantSlug}/stays/${firstEntitySlug}`
    : `/${tenantSlug}/stays`

  return (
    <aside className="w-24 shrink-0">
      <div className="sticky top-20 space-y-2" style={{ paddingLeft: 2, paddingRight: 2 }}>
        <div className="mb-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Account
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-gray-700" title={tenantName}>
            {tenantName}
          </p>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
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
          <Link
            href={cmsTarget}
            className="flex flex-col items-center gap-1 rounded-md border border-blue-200 bg-blue-50 py-3 text-blue-700 transition-colors hover:bg-blue-100"
            title="Vai al CMS della struttura"
          >
            <LayoutGrid className="h-7 w-7" />
            <span className="text-[11px] font-semibold leading-none">CMS</span>
          </Link>
          {!firstEntitySlug && (
            <p className="mt-2 text-center text-[10px] text-gray-500">
              Nessuna struttura
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
