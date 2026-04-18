import type { PublicListing, EntityKind } from './types'
import type { AccommodationDetails } from './accommodation'
import type { RestaurantDetails } from './restaurant'
import { WEEKDAY_KEYS, getWeekdaySchemaOrg, formatPriceRange } from './restaurant'

const SCHEMA_TYPE_BY_KIND: Record<EntityKind, string> = {
  accommodation: 'LodgingBusiness',
  restaurant: 'Restaurant',
  activity: 'TouristAttraction',
  bike_rental: 'BicycleStore',
  wellness: 'HealthAndBeautyBusiness',
  moto_rental: 'AutomotiveBusiness',
  ski_school: 'SportsActivityLocation',
}

export type ListingJsonLd = Record<string, unknown>

/** Build JSON-LD schema.org payload for a public listing.
 * Optionally enrich with accommodation/restaurant details for richer SEO. */
export function buildListingJsonLd(
  listing: PublicListing,
  opts: {
    baseUrl: string
    bookingUrl?: string
    accommodation?: AccommodationDetails | null
    restaurant?: RestaurantDetails | null
  } = { baseUrl: '' }
): ListingJsonLd {
  const type = SCHEMA_TYPE_BY_KIND[listing.entity_kind]
  const url = opts.baseUrl
    ? new URL(`/s/${listing.tenant_slug}/${listing.slug}`, opts.baseUrl).toString()
    : `/s/${listing.tenant_slug}/${listing.slug}`

  const image = listing.og_image_url ?? listing.hero_url ?? undefined
  const description =
    listing.seo_description ??
    listing.tagline ??
    listing.entity_short_description ??
    listing.entity_description ??
    undefined

  const payload: ListingJsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
    name: listing.entity_name,
    url,
  }

  if (description) payload.description = description
  if (image) payload.image = image
  if (listing.tenant_name) {
    payload.brand = {
      '@type': 'Organization',
      name: listing.tenant_name,
    }
  }
  if (opts.bookingUrl) {
    payload.potentialAction = {
      '@type': 'ReserveAction',
      target: opts.bookingUrl,
    }
  }
  if (listing.featured_amenities && listing.featured_amenities.length > 0) {
    payload.amenityFeature = listing.featured_amenities.map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
    }))
  }

  // Accommodation-specific enrichment
  if (opts.accommodation) {
    const a = opts.accommodation
    if (a.address || a.city || a.zip || a.country) {
      const addr: Record<string, string> = { '@type': 'PostalAddress' }
      if (a.address) addr.streetAddress = a.address
      if (a.city) addr.addressLocality = a.city
      if (a.zip) addr.postalCode = a.zip
      if (a.province) addr.addressRegion = a.province
      if (a.country) addr.addressCountry = a.country
      payload.address = addr
    }
    if (a.latitude != null && a.longitude != null) {
      payload.geo = {
        '@type': 'GeoCoordinates',
        latitude: a.latitude,
        longitude: a.longitude,
      }
    }
    if (a.phone) payload.telephone = a.phone
    if (a.email) payload.email = a.email
    if (a.check_in_time) payload.checkinTime = a.check_in_time.slice(0, 5)
    if (a.check_out_time) payload.checkoutTime = a.check_out_time.slice(0, 5)
  }

  // Restaurant-specific enrichment
  if (opts.restaurant) {
    const r = opts.restaurant
    if (r.cuisine_type.length > 0) {
      payload.servesCuisine = r.cuisine_type
    }
    const pr = formatPriceRange(r.price_range)
    if (pr) payload.priceRange = pr

    const spec: unknown[] = []
    for (const day of WEEKDAY_KEYS) {
      const slots = r.opening_hours?.[day]
      if (!slots) continue
      for (const s of slots) {
        spec.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${getWeekdaySchemaOrg(day)}`,
          opens: s.open,
          closes: s.close,
        })
      }
    }
    if (spec.length > 0) payload.openingHoursSpecification = spec
  }

  return payload
}

/** Returns schema.org @type for a given entity kind */
export function getSchemaType(kind: EntityKind): string {
  return SCHEMA_TYPE_BY_KIND[kind]
}
