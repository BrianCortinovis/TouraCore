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
  entityId: string
}) {
  const { entityId, ...guestFilters } = filters
  return getGuests(guestFilters, entityId)
}

export async function loadGuestAction(id: string, entityId: string) {
  return getGuest(id, entityId)
}

export async function loadGuestStayHistoryAction(guestId: string, entityId: string) {
  return getGuestStayHistory(guestId, entityId)
}

export async function loadGuestCountriesAction(entityId: string) {
  return getGuestCountries(entityId)
}

export async function loadGuestTagsAction(entityId: string) {
  return getGuestTags(entityId)
}

export { createGuest as createGuestAction }
export { updateGuest as updateGuestAction }
export { deleteGuest as deleteGuestAction }
