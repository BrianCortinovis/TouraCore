'use server'

import { headers } from 'next/headers'
import { createReservation, type CreateReservationInput } from '@touracore/bike-rental'

export async function createBookingAction(input: CreateReservationInput) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const result = await createReservation({
    ...input,
    usePublicClient: true,
    source: input.partnerRef ? 'partner' : (input.source ?? 'widget'),
    actorIp: ip,
  })
  return {
    success: result.success,
    referenceCode: result.referenceCode,
    total: result.quote?.totalAmount,
    error: result.error,
  }
}
