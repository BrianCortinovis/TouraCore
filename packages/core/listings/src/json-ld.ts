import type { PublicListing, EntityKind } from './types'

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

/** Build JSON-LD schema.org payload for a public listing */
export function buildListingJsonLd(
  listing: PublicListing,
  opts: { baseUrl: string; bookingUrl?: string } = { baseUrl: '' }
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

  return payload
}

/** Returns schema.org @type for a given entity kind */
export function getSchemaType(kind: EntityKind): string {
  return SCHEMA_TYPE_BY_KIND[kind]
}
