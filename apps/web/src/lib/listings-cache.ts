import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import {
  getPublicListing as _getPublicListing,
  listAllPublicListings as _listAllPublicListings,
  listAllPublicListingsCards as _listAllPublicListingsCards,
  listTenantPublicListings as _listTenantPublicListings,
  getAccommodationDetails as _getAccommodationDetails,
  getRestaurantDetails as _getRestaurantDetails,
  getBikeRentalDetails as _getBikeRentalDetails,
  getBikeTypesPublic as _getBikeTypesPublic,
  getBikeLocationsPublic as _getBikeLocationsPublic,
  getListingPhotos as _getListingPhotos,
} from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'
import { CacheTags } from '@/lib/cache-tags'

// Two-layer caching:
// 1) Next.js Data Cache (unstable_cache) — persistent across requests, tag-invalidated
// 2) React cache() — request-scoped dedup so multiple callers in same render share
const getClient = cache(() => createPublicClient())

const cachedGetPublicListing = unstable_cache(
  async (tenantSlug: string, slug: string) =>
    _getPublicListing(createPublicClient(), tenantSlug, slug),
  ['public-listing'],
  {
    revalidate: 3600,
    tags: ['discover'], // base tag; specific tags applied via wrapper below
  }
)

export const getPublicListingCached = cache(async (tenantSlug: string, slug: string) => {
  return unstable_cache(
    () => _getPublicListing(createPublicClient(), tenantSlug, slug),
    ['public-listing', tenantSlug, slug],
    {
      revalidate: 3600,
      tags: [
        CacheTags.listingBySlug(tenantSlug, slug),
        CacheTags.tenantSlug(tenantSlug),
        CacheTags.discover,
      ],
    }
  )()
})

export const listAllPublicListingsCached = cache(async (limit?: number, kind?: string) => {
  return unstable_cache(
    () => _listAllPublicListings(createPublicClient(), { limit, kind }),
    ['public-listings-all', String(limit ?? 'na'), kind ?? 'na'],
    { revalidate: 3600, tags: [CacheTags.discover] }
  )()
})

export const listAllPublicListingsCardsCached = cache(async (limit?: number, kind?: string) => {
  return unstable_cache(
    () => _listAllPublicListingsCards(createPublicClient(), { limit, kind }),
    ['public-listings-cards', String(limit ?? 'na'), kind ?? 'na'],
    { revalidate: 3600, tags: [CacheTags.discover] }
  )()
})

export const listTenantPublicListingsCached = cache(async (tenantSlug: string) => {
  return unstable_cache(
    () => _listTenantPublicListings(createPublicClient(), tenantSlug),
    ['tenant-public-listings', tenantSlug],
    {
      revalidate: 3600,
      tags: [CacheTags.tenantSlug(tenantSlug), CacheTags.discover],
    }
  )()
})

export const getAccommodationDetailsCached = cache(async (entityId: string) => {
  return unstable_cache(
    () => _getAccommodationDetails(createPublicClient(), entityId),
    ['accommodation-details', entityId],
    { revalidate: 3600, tags: [CacheTags.listing(entityId)] }
  )()
})

export const getRestaurantDetailsCached = cache(async (entityId: string) => {
  return unstable_cache(
    () => _getRestaurantDetails(createPublicClient(), entityId),
    ['restaurant-details', entityId],
    { revalidate: 3600, tags: [CacheTags.listing(entityId)] }
  )()
})

export const getBikeRentalDetailsCached = cache(async (entityId: string) => {
  return unstable_cache(
    () => _getBikeRentalDetails(createPublicClient(), entityId),
    ['bike-rental-details', entityId],
    { revalidate: 3600, tags: [CacheTags.listing(entityId)] }
  )()
})

export const getBikeTypesPublicCached = cache(async (entityId: string) => {
  return unstable_cache(
    () => _getBikeTypesPublic(createPublicClient(), entityId),
    ['bike-types-public', entityId],
    { revalidate: 3600, tags: [CacheTags.listing(entityId)] }
  )()
})

export const getBikeLocationsPublicCached = cache(async (entityId: string) => {
  return unstable_cache(
    () => _getBikeLocationsPublic(createPublicClient(), entityId),
    ['bike-locations-public', entityId],
    { revalidate: 3600, tags: [CacheTags.listing(entityId)] }
  )()
})

export const getListingPhotosCached = cache(async (listingId: string) => {
  return unstable_cache(
    () => _getListingPhotos(createPublicClient(), listingId),
    ['listing-photos', listingId],
    { revalidate: 3600, tags: [CacheTags.media(listingId), CacheTags.listing(listingId)] }
  )()
})

export const getExperienceData = cache(async (entityId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient()
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
    },
    ['experience-data', entityId],
    { revalidate: 3600, tags: [CacheTags.listing(entityId)] }
  )()
})

// Internal alias kept for type consistency; getClient is unused now that
// each cached entry creates its own client (required because unstable_cache
// inputs must be serializable — clients can't be passed in).
void getClient
void cachedGetPublicListing
