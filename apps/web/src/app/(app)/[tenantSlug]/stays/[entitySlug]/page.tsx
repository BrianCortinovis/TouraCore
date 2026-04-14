import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@touracore/ui'
import {
  CalendarCheck, Users, BarChart3, Building2, Shield,
  TrendingUp, Banknote, BedDouble, LogIn, LogOut,
} from 'lucide-react'

interface EntityDashboardProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  b_and_b: 'B&B',
  apartment: 'Appartamento',
  agriturismo: 'Agriturismo',
  residence: 'Residence',
  affittacamere: 'Affittacamere',
  mixed: 'Struttura mista',
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v)
}

function fmtPercent(v: number) {
  return `${Math.round(v)}%`
}

export default async function EntityDashboard({ params }: EntityDashboardProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, is_active, country_override')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity) notFound()

  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('property_type, city, address')
    .eq('entity_id', entity.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: roomCount },
    { count: guestCount },
    { count: totalBookings },
    { data: todayCheckins },
    { data: todayCheckouts },
    { data: monthBookings },
  ] = await Promise.all([
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('entity_id', entity.id),
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('entity_id', entity.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('bookings').select('id').eq('tenant_id', tenant.id).eq('check_in', today),
    supabase.from('bookings').select('id').eq('tenant_id', tenant.id).eq('check_out', today),
    supabase.from('bookings')
      .select('total_amount, check_in, check_out, status')
      .eq('tenant_id', tenant.id)
      .gte('check_in', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .lte('check_in', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0])
      .in('status', ['confirmed', 'completed']),
  ])

  const totalRooms = roomCount ?? 0
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const totalRoomNightsAvailable = totalRooms * daysInMonth

  const monthData = monthBookings ?? []
  const totalRevenue = monthData.reduce((s, b) => s + Number(b.total_amount), 0)
  const totalNightsSold = monthData.reduce((s, b) => {
    const nights = Math.max(1, Math.ceil(
      (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000
    ))
    return s + nights
  }, 0)

  const occupancyRate = totalRoomNightsAvailable > 0 ? (totalNightsSold / totalRoomNightsAvailable) * 100 : 0
  const adr = totalNightsSold > 0 ? totalRevenue / totalNightsSold : 0
  const revpar = totalRoomNightsAvailable > 0 ? totalRevenue / totalRoomNightsAvailable : 0

  const isAgencyManaged = entity.management_mode === 'agency_managed'

  return (
    <div className="space-y-6">
      {isAgencyManaged && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">Struttura gestita da agenzia</p>
            <p className="mt-1 text-sm text-amber-700">
              Alcune funzionalità di configurazione sono gestite dall&apos;agenzia.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {accommodation?.property_type && (
              <span className="text-sm text-gray-500">
                {TYPE_LABELS[accommodation.property_type] ?? accommodation.property_type}
              </span>
            )}
            {accommodation?.city && (
              <>
                <span className="text-gray-300">&middot;</span>
                <span className="text-sm text-gray-500">{accommodation.city}</span>
              </>
            )}
            <Badge variant={entity.is_active ? 'default' : 'secondary'}>
              {entity.is_active ? 'Attiva' : 'Inattiva'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Oggi */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">Oggi</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <LogIn className="h-4 w-4 text-green-500" />
                Arrivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{todayCheckins?.length ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <LogOut className="h-4 w-4 text-orange-500" />
                Partenze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{todayCheckouts?.length ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Building2 className="h-4 w-4 text-blue-500" />
                Camere
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Users className="h-4 w-4 text-purple-500" />
                Ospiti registrati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{guestCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPI Mensili */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
          Questo mese
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Occupazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{fmtPercent(occupancyRate)}</p>
              <p className="mt-1 text-xs text-gray-500">{totalNightsSold}/{totalRoomNightsAvailable} notti</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Banknote className="h-4 w-4 text-green-500" />
                Fatturato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{fmtCurrency(totalRevenue)}</p>
              <p className="mt-1 text-xs text-gray-500">{monthData.length} prenotazioni</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                ADR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{fmtCurrency(adr)}</p>
              <p className="mt-1 text-xs text-gray-500">Tariffa media giornaliera</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <BedDouble className="h-4 w-4 text-amber-500" />
                RevPAR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{fmtCurrency(revpar)}</p>
              <p className="mt-1 text-xs text-gray-500">Ricavo per camera disponibile</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Riepilogo */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">Totali</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <CalendarCheck className="h-4 w-4" />
                Prenotazioni totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{totalBookings ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Users className="h-4 w-4" />
                Ospiti in anagrafica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{guestCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Building2 className="h-4 w-4" />
                Camere configurate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
