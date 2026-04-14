'use server'

import {
  checkOutBooking,
  getTodayDepartures,
} from '@touracore/hospitality/src/actions/checkin'
import type { ActionResult } from '@touracore/hospitality/src/actions/checkin'

export async function loadDeparturesAction(): Promise<ActionResult> {
  return getTodayDepartures()
}

export async function checkOutAction(bookingId: string): Promise<ActionResult> {
  return checkOutBooking(bookingId)
}
