import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { ReservationsView } from './reservations-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ date?: string; view?: string }>
}

export default async function ReservationsPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const { date, view } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const today = date ?? new Date().toISOString().slice(0, 10)

  const [{ data: tables }, { data: rooms }, { data: reservations }] = await Promise.all([
    supabase
      .from('restaurant_tables')
      .select('id, code, room_id, seats_default, seats_max')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('code'),
    supabase
      .from('restaurant_rooms')
      .select('id, name')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('order_idx'),
    supabase
      .from('restaurant_reservations')
      .select('id, guest_name, guest_phone, party_size, slot_date, slot_time, duration_minutes, status, table_ids, service_label, special_requests, allergies, occasion, source')
      .eq('restaurant_id', entity.id)
      .eq('slot_date', today)
      .order('slot_time'),
  ])

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>
          <p className="text-sm text-gray-500">
            {today} — {(reservations ?? []).length} prenotazioni
          </p>
        </div>
      </header>

      <ReservationsView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        currentDate={today}
        currentView={(view as 'list' | 'timeline' | 'grid') ?? 'list'}
        rooms={(rooms ?? []).map((r) => ({ id: r.id as string, name: r.name as string }))}
        tables={(tables ?? []).map((t) => ({
          id: t.id as string,
          code: t.code as string,
          roomId: t.room_id as string,
          seatsDefault: t.seats_default as number,
          seatsMax: t.seats_max as number,
        }))}
        reservations={(reservations ?? []).map((r) => ({
          id: r.id as string,
          guestName: (r.guest_name as string) ?? 'Ospite',
          guestPhone: r.guest_phone as string | null,
          partySize: r.party_size as number,
          slotDate: r.slot_date as string,
          slotTime: r.slot_time as string,
          durationMinutes: r.duration_minutes as number,
          status: r.status as 'pending' | 'confirmed' | 'seated' | 'finished' | 'cancelled' | 'no_show',
          tableIds: (r.table_ids as string[]) ?? [],
          serviceLabel: r.service_label as string | null,
          specialRequests: r.special_requests as string | null,
          allergies: (r.allergies as string[]) ?? [],
          occasion: r.occasion as string | null,
          source: r.source as string,
        }))}
      />
    </div>
  )
}
