'use server'

import { createReservation, type CreateReservationInput } from '@touracore/bike-rental'

export async function createBookingAction(input: CreateReservationInput) {
  const result = await createReservation({ ...input, usePublicClient: true, source: 'widget' })
  return {
    success: result.success,
    referenceCode: result.referenceCode,
    total: result.quote?.totalAmount,
    error: result.error,
  }
}
