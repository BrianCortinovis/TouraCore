import 'server-only'
import { randomBytes } from 'node:crypto'
import { createServiceRoleClient } from '@touracore/db/server'

/**
 * Genera token guest portal per reservation.
 * Token valido fino a 2gg dopo check_out.
 */
export async function ensureGuestPortalToken(reservationId: string): Promise<{ token: string; url: string }> {
  const admin = await createServiceRoleClient()

  const { data: existing } = await admin
    .from('guest_portal_tokens')
    .select('token, expires_at')
    .eq('reservation_id', reservationId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://touracore.vercel.app'

  if (existing) {
    return { token: existing.token as string, url: `${baseUrl}/portal/${existing.token}` }
  }

  const { data: reservation } = await admin
    .from('reservations')
    .select('check_out')
    .eq('id', reservationId)
    .single()

  if (!reservation) throw new Error('Reservation not found')

  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(reservation.check_out as string)
  expiresAt.setDate(expiresAt.getDate() + 2)

  await admin.from('guest_portal_tokens').insert({
    reservation_id: reservationId,
    token,
    expires_at: expiresAt.toISOString(),
  })

  return { token, url: `${baseUrl}/portal/${token}` }
}
