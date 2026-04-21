'use server'

import {
  checkOutBooking,
  getTodayDepartures,
} from '@touracore/hospitality/src/actions/checkin'
import type { ActionResult } from '@touracore/hospitality/src/actions/checkin'
import { revokePinsForReservation } from '../locks/actions'

export async function loadDeparturesAction(): Promise<ActionResult> {
  return getTodayDepartures()
}

export async function checkOutAction(bookingId: string): Promise<ActionResult> {
  const result = await checkOutBooking(bookingId)
  if (result.success) {
    try {
      await revokePinsForReservation(bookingId)
    } catch (e) {
      console.error('[checkout] revokePins failed:', e)
    }
  }
  return result
}
