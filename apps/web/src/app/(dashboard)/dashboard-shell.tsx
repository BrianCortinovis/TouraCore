'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@touracore/db/client'
import { useAuthStore } from '@touracore/auth/store'
import { PropertySelector } from './property-selector'
import { NotificationBell } from './components/notification-bell'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, profile, tenant, property, isLoading } = useAuthStore()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-gray-900">
              TouraCore
            </Link>
            {tenant && (
              <span className="text-sm text-gray-500">{tenant.name}</span>
            )}
            <PropertySelector />
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Panoramica
              </Link>
              <Link href="/properties" className="text-gray-600 hover:text-gray-900">
                Strutture
              </Link>
              <Link href="/room-types" className="text-gray-600 hover:text-gray-900">
                Tipologie alloggio
              </Link>
              <Link href="/rooms" className="text-gray-600 hover:text-gray-900">
                Unità
              </Link>
              <Link href="/seasons" className="text-gray-600 hover:text-gray-900">
                Periodi tariffari
              </Link>
              <Link href="/rate-plans" className="text-gray-600 hover:text-gray-900">
                Tariffe
              </Link>
              <Link href="/bookings" className="text-gray-600 hover:text-gray-900">
                Prenotazioni
              </Link>
              <Link href="/media" className="text-gray-600 hover:text-gray-900">
                Media
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Impostazioni
              </Link>
            </nav>
            <NotificationBell />

            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <span className="text-sm text-gray-700">
                {profile?.display_name ?? user?.email}
              </span>
              {property && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {property.name}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
