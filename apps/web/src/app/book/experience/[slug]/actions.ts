'use server'

import { createReservation, type CreateReservationInput } from '@touracore/experiences'

export interface CreateExperienceReservationActionInput extends Omit<CreateReservationInput, 'partnerId' | 'source'> {
  partnerRef?: string
}

export async function createExperienceReservationAction(input: CreateExperienceReservationActionInput) {
  const source = input.partnerRef ? 'partner' : 'direct'
  return await createReservation({
    ...input,
    source,
    partnerId: undefined,
  })
}
