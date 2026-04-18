import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BikeRentalTemplate,
  buildListingJsonLd,
  filterKnownAmenities,
  GenericVerticalTemplate,
  getAccommodationDetails,
  getBikeLocationsPublic,
  getBikeRentalDetails,
  getBikeTypesPublic,
  getBookingUrl,
  getListingPhotos,
  getPublicListing,
  getRestaurantDetails,
  HospitalityTemplate,
  ListingGallery,
  ListingShell,
  RestaurantTemplate,
} from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'

export const revalidate = 60
export const dynamicParams = true

type RouteParams = { tenantSlug: string; entitySlug: string }
type PageProps = { params: Promise<RouteParams> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug, entitySlug } = await params
  const supabase = createPublicClient()
  const listing = await getPublicListing(supabase, tenantSlug, entitySlug)

  if (!listing) {
    return { title: 'Scheda non trovata · TouraCore', robots: { index: false } }
  }

  const title = listing.seo_title ?? `${listing.entity_name} · ${listing.tenant_name}`
  const description =
    listing.seo_description ??
    listing.tagline ??
    listing.entity_short_description ??
    undefined
  const image = listing.og_image_url ?? listing.hero_url ?? undefined

  return {
    title,
    description: description ?? undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: description ?? undefined,
      images: image ? [image] : undefined,
    },
  }
}

export default async function PublicListingPage({ params }: PageProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = createPublicClient()
  const listing = await getPublicListing(supabase, tenantSlug, entitySlug)

  if (!listing) notFound()

  // Parallel fetch kind-specific details + photo gallery
  const [accommodation, restaurant, bikeRental, bikeTypes, bikeLocations, photos] = await Promise.all([
    listing.entity_kind === 'accommodation'
      ? getAccommodationDetails(supabase, listing.entity_id)
      : Promise.resolve(null),
    listing.entity_kind === 'restaurant'
      ? getRestaurantDetails(supabase, listing.entity_id)
      : Promise.resolve(null),
    listing.entity_kind === 'bike_rental'
      ? getBikeRentalDetails(supabase, listing.entity_id)
      : Promise.resolve(null),
    listing.entity_kind === 'bike_rental'
      ? getBikeTypesPublic(supabase, listing.entity_id)
      : Promise.resolve([]),
    listing.entity_kind === 'bike_rental'
      ? getBikeLocationsPublic(supabase, listing.entity_id)
      : Promise.resolve([]),
    getListingPhotos(supabase, listing.listing_id),
  ])

  const featuredAmenities = filterKnownAmenities(listing.featured_amenities)
  const bookingHref =
    listing.entity_kind === 'bike_rental'
      ? `/book/bike/${entitySlug}?tenant=${tenantSlug}`
      : getBookingUrl(tenantSlug)
  const shortId = listing.listing_id.slice(0, 8).toUpperCase()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const jsonLd = buildListingJsonLd(listing, {
    baseUrl,
    bookingUrl: new URL(bookingHref, baseUrl).toString(),
    accommodation,
    restaurant,
    bikeRental,
  })

  return (
    <ListingShell
      tenantName={listing.tenant_name}
      listingId={shortId}
      breadcrumb={
        <>
          <Link href="/" className="text-[#003b95] hover:underline">Home</Link>
          <span className="mx-1.5 text-[#d1d5db]">›</span>
          <span>{listing.tenant_name}</span>
          <span className="mx-1.5 text-[#d1d5db]">›</span>
          <span className="text-[#0b1220]">{listing.entity_name}</span>
        </>
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {photos.length > 0 ? (
        <ListingGallery
          photos={photos}
          heroFallbackUrl={listing.hero_url}
          entityName={listing.entity_name}
        />
      ) : null}
      {listing.entity_kind === 'accommodation' ? (
        <HospitalityTemplate
          listing={listing}
          accommodation={accommodation}
          bookingHref={bookingHref}
          featuredAmenities={featuredAmenities}
        />
      ) : listing.entity_kind === 'restaurant' ? (
        <RestaurantTemplate
          listing={listing}
          restaurant={restaurant}
          bookingHref={bookingHref}
        />
      ) : listing.entity_kind === 'bike_rental' ? (
        <BikeRentalTemplate
          listing={listing}
          rental={bikeRental}
          types={bikeTypes}
          locations={bikeLocations}
          bookingHref={bookingHref}
        />
      ) : (
        <GenericVerticalTemplate
          listing={listing}
          bookingHref={bookingHref}
          featuredAmenities={featuredAmenities}
        />
      )}
    </ListingShell>
  )
}

