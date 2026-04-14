'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import { cn } from '@touracore/ui'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  BedDouble,
  Grid3x3,
  Banknote,
  Calendar,
  Mail,
  Image,
  Settings,
  ArrowLeft,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react'
import { switchPropertyAction } from './actions'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  placeholder?: boolean
}

function getNavItems(entityId: string): NavItem[] {
  return [
    { href: `/cms/${entityId}`, label: 'Panoramica', icon: LayoutDashboard },
    { href: `/cms/${entityId}/planning`, label: 'Planning', icon: CalendarDays, placeholder: true },
    { href: `/bookings`, label: 'Prenotazioni', icon: BookOpen },
    { href: `/cms/${entityId}/guests`, label: 'Ospiti', icon: Users, placeholder: true },
    { href: `/rooms`, label: 'Unità e camere', icon: BedDouble },
    { href: `/room-types`, label: 'Tipologie alloggio', icon: Grid3x3 },
    { href: `/rate-plans`, label: 'Tariffe', icon: Banknote },
    { href: `/seasons`, label: 'Periodi tariffari', icon: Calendar },
    { href: `/cms/${entityId}/communications`, label: 'Comunicazioni', icon: Mail, placeholder: true },
    { href: `/media`, label: 'Media', icon: Image },
  ]
}

export function CmsSidebar({ entityId }: { entityId: string }) {
  const { properties } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const currentProperty = properties.find((p) => p.id === entityId) ?? properties[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSwitchProperty(id: string) {
    setSwitcherOpen(false)
    await switchPropertyAction(id)
    router.push(`/cms/${id}`)
    router.refresh()
  }

  const navItems = getNavItems(entityId)

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/account/overview" className="text-base font-bold text-gray-900">
          TouraCore
        </Link>
      </div>

      {/* Property switcher */}
      <div ref={switcherRef} className="relative border-b border-gray-200 p-3">
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
        >
          <span className="truncate font-medium text-gray-900">
            {currentProperty?.name ?? 'Seleziona struttura'}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', switcherOpen && 'rotate-180')} />
        </button>

        {switcherOpen && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSwitchProperty(p.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="flex-1 truncate text-gray-700">{p.name}</span>
                {p.id === entityId && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
            <div className="border-t border-gray-100 pt-1">
              <Link
                href="/account/overview"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                onClick={() => setSwitcherOpen(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                Torna all'account
              </Link>
              <Link
                href="/account/properties/new"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
                onClick={() => setSwitcherOpen(false)}
              >
                <Plus className="h-4 w-4" />
                Nuova struttura
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Navigazione */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/cms/${entityId}` && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-2 border-blue-600 bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <div className="mx-5 my-2 border-t border-gray-100" />

        <Link
          href={`/cms/${entityId}/settings`}
          className={cn(
            'mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith(`/cms/${entityId}/settings`)
              ? 'border-l-2 border-blue-600 bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Settings className="h-4 w-4" />
          Impostazioni struttura
        </Link>

        <div className="mx-5 my-2 border-t border-gray-100" />

        <Link
          href="/account/overview"
          className="mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all'account
        </Link>
      </nav>
    </aside>
  )
}
