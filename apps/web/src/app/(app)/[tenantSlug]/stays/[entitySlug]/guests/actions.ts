'use server'

import {
  getGuests, getGuest, getGuestStayHistory,
  getGuestCountries, getGuestTags,
} from '@touracore/hospitality/src/queries/guests'
import { createGuest, updateGuest, deleteGuest } from '@touracore/hospitality/src/actions/guests'

export async function loadGuestsAction(filters: {
  search?: string
  country?: string
  tags?: string[]
  loyaltyLevel?: string
  page?: number
  limit?: number
}) {
  return getGuests(filters)
}

export async function loadGuestAction(id: string) {
  return getGuest(id)
}

export async function loadGuestStayHistoryAction(guestId: string) {
  return getGuestStayHistory(guestId)
}

export async function loadGuestCountriesAction() {
  return getGuestCountries()
}

export async function loadGuestTagsAction() {
  return getGuestTags()
}

export { createGuest as createGuestAction }
export { updateGuest as updateGuestAction }
export { deleteGuest as deleteGuestAction }
