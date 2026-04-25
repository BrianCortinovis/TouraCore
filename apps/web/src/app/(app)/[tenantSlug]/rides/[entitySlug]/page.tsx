import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Bike, CalendarClock, MapPin, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'
import { getFleetStats } from '@touracore/bike-rental'
import { getReservationStats } from '@touracore/bike-rental'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function RidesOverview({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const [fleet, reservations, locationsRes] = await Promise.all([
    getFleetStats({ bikeRentalId: entity.id as string }),
    getReservationStats({ bikeRentalId: entity.id as string }),
    supabase.from('bike_locations').select('id').eq('bike_rental_id', entity.id).eq('active', true),
  ])

  const locationsCount = (locationsRes.data ?? []).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panoramica — {entity.name as string}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Stato flotta, prenotazioni attive e performance del noleggio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <Bike className="h-4 w-4" />
              Flotta totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{fleet.total}</p>
            <p className="mt-1 text-xs text-gray-500">
              {fleet.available} disponibili · {fleet.rented} noleggiate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="h-4 w-4 text-amber-500" />
              E-Bike
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{fleet.electricCount}</p>
            <p className="mt-1 text-xs text-gray-500">{fleet.total > 0 ? Math.round((fleet.electricCount / fleet.total) * 100) : 0}% del totale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarClock className="h-4 w-4" />
              Prenotazioni attive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{reservations.activeCount}</p>
            <p className="mt-1 text-xs text-gray-500">{reservations.upcomingCount} in arrivo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              Depositi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{locationsCount}</p>
            <p className="mt-1 text-xs text-gray-500">attivi</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stato flotta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row icon={CheckCircle2} label="Disponibili" value={fleet.available} color="text-green-600" />
            <Row icon={Bike} label="Noleggiate" value={fleet.rented} color="text-blue-600" />
            <Row icon={AlertCircle} label="Manutenzione" value={fleet.maintenance} color="text-yellow-600" />
            <Row icon={AlertCircle} label="Danneggiate" value={fleet.damaged} color="text-red-600" />
            <Row icon={Zap} label="In carica" value={fleet.charging} color="text-cyan-600" />
            <div className="mt-3 border-t pt-3 text-xs text-gray-500">
              Utilizzo: <span className="font-semibold text-gray-900">{fleet.utilizationPct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prenotazioni (tutto lo storico)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Totale" value={reservations.total} color="text-gray-900" />
            <Row label="Completate" value={reservations.byStatus.completed} color="text-green-600" />
            <Row label="Confermate" value={reservations.byStatus.confirmed} color="text-blue-600" />
            <Row label="Annullate" value={reservations.byStatus.cancelled} color="text-red-500" />
            <Row label="No-show" value={reservations.byStatus.no_show} color="text-red-600" />
            <div className="mt-3 border-t pt-3 text-xs text-gray-500">
              Durata media: <span className="font-semibold text-gray-900">{reservations.avgDurationHours}h</span> · Ricavo totale:{' '}
              <span className="font-semibold text-gray-900">€{reservations.revenueTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/${tenantSlug}/rides/${entitySlug}/fleet`}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Gestisci flotta →
        </Link>
        <Link
          href={`/${tenantSlug}/rides/${entitySlug}/reservations`}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Vedi prenotazioni →
        </Link>
        <Link
          href={`/${tenantSlug}/rides/${entitySlug}/locations`}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Gestisci depositi →
        </Link>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">Roadmap in arrivo</p>
        <p className="mt-1 text-blue-700">
          Tariffe & promo (M040), check-in/out mobile (M041), listing pubblico (M042), deposito Stripe & danni (M043),
          channel manager Bókun/Rezdy/GYG (M046+).
        </p>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-gray-700">
        {Icon && <Icon className={`h-4 w-4 ${color ?? ''}`} />}
        {label}
      </span>
      <span className={`font-semibold ${color ?? 'text-gray-900'}`}>{value}</span>
    </div>
  )
}
