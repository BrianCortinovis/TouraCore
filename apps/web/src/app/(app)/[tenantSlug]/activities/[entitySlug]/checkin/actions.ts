'use server'

import { createServerSupabaseClient } from '@touracore/db/server'

export async function checkinByQrAction(params: { qr: string; tenantId: string; entityId: string }): Promise<
  { ok: true; guestName: string; productName: string } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const { data: guest } = await supabase
    .from('experience_reservation_guests')
    .select('id, first_name, last_name, reservation_id, checked_in_at, experience_reservations(entity_id, tenant_id, product_id, status, experience_products(name))')
    .eq('check_in_qr', params.qr)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (!guest) return { ok: false, error: 'QR non riconosciuto' }
  const g = guest as unknown as {
    id: string; first_name: string | null; last_name: string | null; reservation_id: string; checked_in_at: string | null
    experience_reservations: Array<{ entity_id: string; status: string; experience_products: Array<{ name: string }> | { name: string } }> | { entity_id: string; status: string; experience_products: Array<{ name: string }> | { name: string } }
  }
  const res = Array.isArray(g.experience_reservations) ? g.experience_reservations[0] : g.experience_reservations
  if (!res || res.entity_id !== params.entityId) return { ok: false, error: 'Entity mismatch' }
  if (res.status === 'cancelled') return { ok: false, error: 'Prenotazione cancellata' }
  if (g.checked_in_at) return { ok: false, error: 'Già checked-in' }

  await supabase.from('experience_reservation_guests').update({ checked_in_at: new Date().toISOString() }).eq('id', g.id)
  await supabase.from('experience_reservations').update({ checked_in_at: new Date().toISOString(), status: 'checked_in' }).eq('id', g.reservation_id).eq('status', 'pending')

  const product = Array.isArray(res.experience_products) ? res.experience_products[0] : res.experience_products
  return { ok: true, guestName: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim(), productName: product?.name ?? '—' }
}
