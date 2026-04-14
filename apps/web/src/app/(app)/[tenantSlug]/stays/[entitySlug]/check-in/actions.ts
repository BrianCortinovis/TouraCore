'use server'

import {
  checkInBooking,
  getTodayArrivals,
  getCheckedInBookings,
} from '@touracore/hospitality/src/actions/checkin'
import type { StaffCheckInData, ActionResult } from '@touracore/hospitality/src/actions/checkin'

export async function loadArrivalsAction(): Promise<ActionResult> {
  return getTodayArrivals()
}

export async function loadCheckedInAction(): Promise<ActionResult> {
  return getCheckedInBookings()
}

export async function checkInAction(data: StaffCheckInData): Promise<ActionResult> {
  return checkInBooking(data)
}

