import { z } from 'zod'

/** Kinds allowed on entities table */
export const ENTITY_KINDS = [
  'accommodation',
  'activity',
  'restaurant',
  'wellness',
  'bike_rental',
  'moto_rental',
  'ski_school',
] as const
export type EntityKind = (typeof ENTITY_KINDS)[number]

/** All supported amenity keys (catalog) */
export const AMENITY_KEYS = [
  // connectivity
  'wifi',
  // parking & transport
  'parking',
  'parking_nearby',
  'ev_charger',
  'airport_shuttle',
  // climate
  'ac',
  'heating',
  'fireplace',
  // kitchen & dining
  'kitchen',
  'dishwasher',
  'coffee_machine',
  'breakfast',
  'vegan_menu',
  'gluten_free',
  'allergen_aware',
  'private_dining',
  'outdoor_seating',
  'wine_cellar',
  // room features
  'tv',
  'balcony',
  'terrace',
  'safe',
  'iron',
  'washing_machine',
  'dryer',
  'highchair',
  'crib',
  'private_entrance',
  // views
  'lake_view',
  'sea_view',
  'mountain_view',
  'garden',
  // outdoor
  'bbq',
  'beach_access',
  'private_dock',
  // wellness
  'pool',
  'hot_tub',
  'sauna',
  'hammam',
  'spa_access',
  'gym',
  // services
  'concierge',
  '24h_reception',
  'luggage_storage',
  'bike_rental_onsite',
  // activities
  'hiking',
  'skiing',
  // misc
  'pets',
  'smoke_free',
  'wheelchair',
  'elevator',
  'coworking',
] as const
export type AmenityKey = (typeof AMENITY_KEYS)[number]

/** Schema of public_listings_view row (anon-readable)
 * Note: UUID/URL fields use plain string — view guarantees shape; we avoid
 * strict UUID regex that rejects non-v1/v4 seeds (e.g. 10000000-0000-0000-0000-...). */
export const publicListingSchema = z.object({
  listing_id: z.string(),
  entity_id: z.string(),
  tenant_id: z.string(),
  tenant_slug: z.string(),
  tenant_name: z.string(),
  entity_kind: z.enum(ENTITY_KINDS),
  slug: z.string(),
  entity_name: z.string(),
  entity_description: z.string().nullable(),
  entity_short_description: z.string().nullable(),
  tagline: z.string().nullable(),
  featured_amenities: z.array(z.string()).nullable(),
  hero_media_id: z.string().nullable(),
  hero_url: z.string().nullable(),
  hero_alt: z.string().nullable(),
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  og_image_url: z.string().nullable(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
})

export type PublicListing = z.infer<typeof publicListingSchema>

/** Narrower typed amenity array for listings */
export function filterKnownAmenities(input: string[] | null): AmenityKey[] {
  if (!input) return []
  const known = new Set<string>(AMENITY_KEYS)
  return input.filter((k): k is AmenityKey => known.has(k))
}
