'use server'

import { generateSlotsForSchedule } from '@touracore/experiences'

export async function generateSlotsAction(params: {
  scheduleId: string
  productId: string
  tenantId: string
  fromDate: string
  toDate: string
  durationMinutes: number
}): Promise<{ count: number }> {
  const count = await generateSlotsForSchedule(params)
  return { count }
}
