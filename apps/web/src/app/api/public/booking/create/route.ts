import type { NextRequest } from 'next/server'
import { createPublicBookingAction } from '../../../../book/[slug]/actions'
import { jsonWithCors } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

/**
 * POST /api/public/booking/create
 * Body: PublicBookingCreateInput (stessa shape createPublicBookingAction).
 * Nessuna auth — rate-limit a livello edge / domain whitelist se configurato.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonWithCors({ error: 'Invalid JSON' }, { status: 400, origin })
  }

  if (!body.entityId || !body.roomTypeId || !body.checkIn || !body.checkOut || !body.guestEmail) {
    return jsonWithCors({ error: 'Missing required fields' }, { status: 400, origin })
  }
  if (!body.privacyConsent) {
    return jsonWithCors({ error: 'privacyConsent required' }, { status: 400, origin })
  }

  const result = await createPublicBookingAction(body)

  if (!result.success) {
    return jsonWithCors({ error: result.error }, { status: 400, origin })
  }
  return jsonWithCors(result.data, { status: 201, origin })
}
