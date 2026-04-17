import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { WaitlistView } from './waitlist-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function WaitlistPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const { data: entries } = await supabase
    .from('restaurant_waitlist')
    .select('id, guest_name, phone, party_size, requested_at, estimated_wait_min, notified_at, status, notes')
    .eq('restaurant_id', entity.id)
    .in('status', ['waiting', 'notified'])
    .order('requested_at')

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Lista attesa</h1>
        <p className="text-sm text-gray-500">Walk-in in attesa tavolo</p>
      </header>
      <WaitlistView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        entries={(entries ?? []).map((e) => ({
          id: e.id as string,
          guestName: (e.guest_name as string) ?? 'Walk-in',
          phone: e.phone as string | null,
          partySize: e.party_size as number,
          requestedAt: e.requested_at as string,
          estimatedWaitMin: e.estimated_wait_min as number | null,
          notifiedAt: e.notified_at as string | null,
          status: e.status as 'waiting' | 'notified',
          notes: e.notes as string | null,
        }))}
      />
    </div>
  )
}
