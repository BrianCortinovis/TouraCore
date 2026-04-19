'use server'

import { randomBytes } from 'crypto'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { enqueueNotification } from '@touracore/notifications'

export async function generateCheckoutTokenAction(input: {
  bookingId: string
}): Promise<{ ok: boolean; error?: string; url?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const supabase = await createServiceRoleClient()
  const { data: booking } = await supabase
    .from('reservations')
    .select('id, entity_id, guest:guests(first_name, last_name, email)')
    .eq('id', input.bookingId)
    .maybeSingle()
  if (!booking) return { ok: false, error: 'booking_not_found' }

  const guest = booking.guest as { first_name?: string; last_name?: string; email?: string } | null
  if (!guest?.email) return { ok: false, error: 'guest_email_missing' }

  const token = randomBytes(24).toString('base64url')
  const { data: tk, error } = await supabase
    .from('checkout_tokens')
    .insert({
      token,
      entity_id: booking.entity_id,
      booking_id: booking.id,
      guest_email: guest.email,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error || !tk) return { ok: false, error: error?.message ?? 'insert_failed' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'
  const url = `${baseUrl}/checkout/${token}`

  const { data: entity } = await supabase
    .from('entities')
    .select('name')
    .eq('id', booking.entity_id)
    .maybeSingle()

  await enqueueNotification({
    eventKey: 'checkout.remote_link',
    templateKey: 'checkout.remote_link',
    channel: 'email',
    scope: 'tenant',
    tenantId: null,
    recipientEmail: guest.email,
    variables: {
      guest: { first_name: guest.first_name ?? '', last_name: guest.last_name ?? '' },
      entity: { name: entity?.name ?? 'La struttura' },
      checkout: { url },
    },
    idempotencyKey: `checkout.link.${tk.id}`,
  })

  return { ok: true, url }
}
