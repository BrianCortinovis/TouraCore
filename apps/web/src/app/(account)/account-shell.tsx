'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import { cn } from '@touracore/ui'

const ACCOUNT_TABS = [
  { href: '/account/overview', label: 'Panoramica' },
  { href: '/account/profile', label: 'Profilo' },
  { href: '/account/business', label: 'Attività' },
  { href: '/account/properties', label: 'Strutture' },
  { href: '/account/team', label: 'Team' },
  { href: '/account/preferences', label: 'Preferenze' },
] as const

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthStore()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/account/overview" className="text-lg font-bold text-gray-900">
            TouraCore
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile?.display_name ?? user?.email}
            </span>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-0 px-4">
          {ACCOUNT_TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
