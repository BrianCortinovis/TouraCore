import { createServerSupabaseClient } from '@touracore/db/server'
import Link from 'next/link'
import { LayoutGrid, CalendarClock, Users, UtensilsCrossed } from 'lucide-react'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function DineOverviewPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  const today = new Date().toISOString().slice(0, 10)
  const [{ count: roomsCount }, { count: tablesCount }, { count: todayReservations }, { count: waitlistCount }] = await Promise.all([
    supabase.from('restaurant_rooms').select('*', { count: 'exact', head: true }).eq('restaurant_id', entity.id).eq('active', true),
    supabase.from('restaurant_tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', entity.id).eq('active', true),
    supabase.from('restaurant_reservations').select('*', { count: 'exact', head: true }).eq('restaurant_id', entity.id).eq('slot_date', today).in('status', ['pending', 'confirmed', 'seated']),
    supabase.from('restaurant_waitlist').select('*', { count: 'exact', head: true }).eq('restaurant_id', entity.id).in('status', ['waiting', 'notified']),
  ])

  const base = `/${tenantSlug}/dine/${entitySlug}`

  const cards = [
    { label: 'Sale', value: roomsCount ?? 0, href: `${base}/floor-plan`, icon: LayoutGrid },
    { label: 'Tavoli', value: tablesCount ?? 0, href: `${base}/floor-plan`, icon: LayoutGrid },
    { label: 'Prenotazioni oggi', value: todayReservations ?? 0, href: `${base}/reservations`, icon: CalendarClock },
    { label: 'In attesa', value: waitlistCount ?? 0, href: `${base}/waitlist`, icon: Users },
  ]

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Panoramica ristorante</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-50 p-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                  <p className="text-xs text-gray-500">{c.label}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Inizia</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configura sale e tavoli, poi inizia a ricevere prenotazioni.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`${base}/floor-plan`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <LayoutGrid className="h-4 w-4" />
            Disegna pianta sala
          </Link>
          <Link
            href={`${base}/reservations`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CalendarClock className="h-4 w-4" />
            Nuova prenotazione
          </Link>
          <Link
            href={`${base}/settings`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Impostazioni cucina
          </Link>
        </div>
      </section>
    </div>
  )
}
