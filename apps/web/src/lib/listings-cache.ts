import { cache } from 'react'
import {
  getPublicListing as _getPublicListing,
  listAllPublicListings as _listAllPublicListings,
  listTenantPublicListings as _listTenantPublicListings,
  getAccommodationDetails as _getAccommodationDetails,
  getRestaurantDetails as _getRestaurantDetails,
  getBikeRentalDetails as _getBikeRentalDetails,
  getBikeTypesPublic as _getBikeTypesPublic,
  getBikeLocationsPublic as _getBikeLocationsPublic,
  getListingPhotos as _getListingPhotos,
} from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'

// Wrapper request-scoped: deduplica chiamate identiche nello stesso render
// (es. page + generateMetadata + JSON-LD generator). Il client Supabase è
// passato internamente in modo da rendere stabile la chiave (tenantSlug, slug).
const getClient = cache(() => createPublicClient())

export const getPublicListingCached = cache(async (tenantSlug: string, slug: string) => {
  return _getPublicListing(getClient(), tenantSlug, slug)
})

export const listAllPublicListingsCached = cache(async (limit?: number, kind?: string) => {
  return _listAllPublicListings(getClient(), { limit, kind })
})

export const listTenantPublicListingsCached = cache(async (tenantSlug: string) => {
  return _listTenantPublicListings(getClient(), tenantSlug)
})

export const getAccommodationDetailsCached = cache(async (entityId: string) => {
  return _getAccommodationDetails(getClient(), entityId)
})

export const getRestaurantDetailsCached = cache(async (entityId: string) => {
  return _getRestaurantDetails(getClient(), entityId)
})

export const getBikeRentalDetailsCached = cache(async (entityId: string) => {
  return _getBikeRentalDetails(getClient(), entityId)
})

export const getBikeTypesPublicCached = cache(async (entityId: string) => {
  return _getBikeTypesPublic(getClient(), entityId)
})

export const getBikeLocationsPublicCached = cache(async (entityId: string) => {
  return _getBikeLocationsPublic(getClient(), entityId)
})

export const getListingPhotosCached = cache(async (listingId: string) => {
  return _getListingPhotos(getClient(), listingId)
})

export const getExperienceData = cache(async (entityId: string) => {
  const supabase = getClient()
  const [{ data: details }, { data: products }] = await Promise.all([
    supabase
      .from('public_experience_entities')
      .select('category, city, address, languages, age_min_default, height_min_cm_default, difficulty_default, opening_hours')
      .eq('id', entityId)
      .maybeSingle(),
    supabase
      .from('public_experience_products')
      .select('id, slug, name, booking_mode, duration_minutes, capacity_default, price_base_cents, currency, highlights, images, difficulty')
      .eq('entity_id', entityId),
  ])
  return { details, products: products ?? [] }
})
