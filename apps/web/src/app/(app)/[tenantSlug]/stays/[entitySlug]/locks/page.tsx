import { createServerSupabaseClient } from '@touracore/db/server'
import { LocksView } from './locks-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function LocksPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  const { data: locks } = await supabase
    .from('smart_locks')
    .select('id, room_id, provider, device_id, device_name, access_method, battery_level, last_seen_at, active')
    .eq('entity_id', entity.id)
    .eq('active', true)
    .order('device_name')

  const { data: codes } = await supabase
    .from('lock_access_codes')
    .select('id, lock_id, reservation_id, pin_code, valid_from, valid_to, status, created_at')
    .in('lock_id', (locks ?? []).map((l) => l.id as string))
    .in('status', ['active'])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Smart Locks</h1>
        <p className="text-sm text-gray-500">Nuki · TTLock · Igloohome · gestione PIN ospiti</p>
      </header>
      <LocksView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        entityId={entity.id as string}
        locks={(locks ?? []).map((l) => ({
          id: l.id as string,
          roomId: l.room_id as string | null,
          provider: l.provider as string,
          deviceId: l.device_id as string,
          deviceName: l.device_name as string,
          accessMethod: l.access_method as string,
          batteryLevel: l.battery_level as number | null,
          lastSeenAt: l.last_seen_at as string | null,
        }))}
        codes={(codes ?? []).map((c) => ({
          id: c.id as string,
          lockId: c.lock_id as string,
          reservationId: c.reservation_id as string | null,
          pinCode: c.pin_code as string | null,
          validFrom: c.valid_from as string,
          validTo: c.valid_to as string,
          status: c.status as string,
        }))}
      />
    </div>
  )
}
