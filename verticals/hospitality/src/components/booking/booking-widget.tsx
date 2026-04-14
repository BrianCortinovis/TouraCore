'use client'

import { useState } from 'react'
import { CalendarDays, Users, Search, ExternalLink, BedDouble, PawPrint } from 'lucide-react'

interface BookingWidgetProps {
  orgSlug: string
  /** Base URL del booking engine TouraCore. Default: origin corrente. */
  baseUrl?: string
  /** Color theme accent. Defaults to blue. */
  accentColor?: string
  /** Whether to show the hotel name header. */
  showHeader?: boolean
  /** Hotel display name override. */
  hotelName?: string
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function getDefaultDates() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(today.getDate() + 3)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { checkIn: fmt(tomorrow), checkOut: fmt(dayAfter) }
}

export default function BookingWidget({
  orgSlug,
  baseUrl,
  accentColor = 'blue',
  showHeader = true,
  hotelName,
}: BookingWidgetProps) {
  const defaults = getDefaultDates()
  const [checkIn, setCheckIn] = useState(defaults.checkIn)
  const [checkOut, setCheckOut] = useState(defaults.checkOut)
  const [guests, setGuests] = useState(2)
  const [withPets, setWithPets] = useState(false)

  const displayName =
    hotelName ||
    orgSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  const handleSearch = () => {
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
    const petsParam = withPets ? '&pets=1' : ''
    const bookingUrl = `${origin}/book/${orgSlug}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}${petsParam}`

    // Open in new tab or redirect based on context
    if (window.parent !== window) {
      // Inside an iframe: open in new tab
      window.open(bookingUrl, '_blank')
    } else {
      // Direct embed: navigate
      window.location.href = bookingUrl
    }
  }

  // Compute nights
  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0

  // Dynamic accent color classes
  const accentClasses = {
    blue: {
      bg: 'bg-blue-600 hover:bg-blue-700',
      text: 'text-blue-600',
      ring: 'focus:ring-blue-500',
      badge: 'bg-blue-50 text-blue-700',
      headerBg: 'bg-blue-600',
    },
    green: {
      bg: 'bg-green-600 hover:bg-green-700',
      text: 'text-green-600',
      ring: 'focus:ring-green-500',
      badge: 'bg-green-50 text-green-700',
      headerBg: 'bg-green-600',
    },
    amber: {
      bg: 'bg-amber-600 hover:bg-amber-700',
      text: 'text-amber-600',
      ring: 'focus:ring-amber-500',
      badge: 'bg-amber-50 text-amber-700',
      headerBg: 'bg-amber-600',
    },
    rose: {
      bg: 'bg-rose-600 hover:bg-rose-700',
      text: 'text-rose-600',
      ring: 'focus:ring-rose-500',
      badge: 'bg-rose-50 text-rose-700',
      headerBg: 'bg-rose-600',
    },
  }

  const colors = accentClasses[accentColor as keyof typeof accentClasses] || accentClasses.blue

  return (
    <div className="w-full max-w-sm mx-auto font-sans">
      <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        {/* Header */}
        {showHeader && (
          <div className={`${colors.headerBg} px-5 py-4 text-white`}>
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5" />
              <h3 className="font-semibold text-base">{displayName}</h3>
            </div>
            <p className="text-sm opacity-90 mt-0.5">Prenota direttamente online</p>
          </div>
        )}

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Check-in */}
          <div className="space-y-1.5">
            <label htmlFor="widget-checkin" className="block text-sm font-medium text-gray-700">
              <CalendarDays className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              Check-in
            </label>
            <input
              id="widget-checkin"
              type="date"
              value={checkIn}
              min={getTodayStr()}
              onChange={(e) => {
                setCheckIn(e.target.value)
                if (checkOut && e.target.value >= checkOut) {
                  const d = new Date(e.target.value + 'T00:00:00')
                  d.setDate(d.getDate() + 1)
                  setCheckOut(d.toISOString().split('T')[0])
                }
              }}
              className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
            />
          </div>

          {/* Check-out */}
          <div className="space-y-1.5">
            <label htmlFor="widget-checkout" className="block text-sm font-medium text-gray-700">
              <CalendarDays className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              Check-out
            </label>
            <input
              id="widget-checkout"
              type="date"
              value={checkOut}
              min={checkIn || getTodayStr()}
              onChange={(e) => setCheckOut(e.target.value)}
              className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
            />
          </div>

          {/* Guests */}
          <div className="space-y-1.5">
            <label htmlFor="widget-guests" className="block text-sm font-medium text-gray-700">
              <Users className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              Ospiti
            </label>
            <select
              id="widget-guests"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value, 10))}
              className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'ospite' : 'ospiti'}
                </option>
              ))}
            </select>
          </div>

          {/* Pet toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={withPets}
              onChange={(e) => setWithPets(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <PawPrint className="w-3.5 h-3.5 text-gray-500" />
            Viaggio con animali
          </label>

          {/* Nights badge */}
          {nights > 0 && (
            <div className={`${colors.badge} rounded-lg px-3 py-2 text-sm text-center font-medium`}>
              {nights} {nights === 1 ? 'notte' : 'notti'}
            </div>
          )}

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!checkIn || !checkOut || nights <= 0}
            className={`w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg ${colors.bg} text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Search className="w-4 h-4" />
            Cerca disponibilita`
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <a
            href={`${baseUrl || ''}/book/${orgSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-xs ${colors.text} hover:underline`}
          >
            <ExternalLink className="w-3 h-3" />
            Vai alla pagina di prenotazione completa
          </a>
        </div>

        {/* Powered by */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-2.5 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <span>Powered by</span>
          <span className="font-semibold text-gray-500">TouraCore</span>
        </div>
      </div>
    </div>
  )
}
