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
import { getSiteBaseUrl } from '@/lib/site-url'

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
      : listing.entity_kind === 'activity'
        ? `/book/experience/${entitySlug}?tenant=${tenantSlug}`
        : getBookingUrl(tenantSlug)

  const experience =
    listing.entity_kind === 'activity'
      ? await (async () => {
          const { data } = await supabase
            .from('public_experience_entities')
            .select('category, city, address, languages, age_min_default, height_min_cm_default, difficulty_default, opening_hours')
            .eq('id', listing.entity_id)
            .maybeSingle()
          const { data: prods } = await supabase
            .from('public_experience_products')
            .select('id, slug, name, booking_mode, duration_minutes, capacity_default, price_base_cents, currency, highlights, images, difficulty')
            .eq('entity_id', listing.entity_id)
          return { details: data, products: prods ?? [] }
        })()
      : null
  const shortId = listing.listing_id.slice(0, 8).toUpperCase()

  const baseUrl = getSiteBaseUrl()
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
          giftCardHref={`/gift-card/buy/${tenantSlug}`}
        />
      ) : listing.entity_kind === 'activity' && experience ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-gray-900">{listing.entity_name}</h1>
            <p className="mt-1 text-sm text-gray-500">{listing.entity_short_description ?? listing.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
              {experience.details?.city && <span>📍 {experience.details.city}</span>}
              {experience.details?.languages && <span>🌐 {experience.details.languages.join(' · ').toUpperCase()}</span>}
              {experience.details?.difficulty_default && <span>Difficoltà: {experience.details.difficulty_default}</span>}
              {experience.details?.age_min_default && <span>Età min: {experience.details.age_min_default}+</span>}
              {experience.details?.height_min_cm_default && <span>Altezza min: {experience.details.height_min_cm_default}cm</span>}
            </div>
            <a href={bookingHref} className="mt-5 inline-flex rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Prenota online</a>
            <a href={`/gift-card/buy/${tenantSlug}`} className="ml-2 inline-flex rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">🎁 Gift card</a>
          </div>
          {experience.products.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Prodotti disponibili</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {experience.products.map((p: { id: string; slug: string; name: string; booking_mode: string; duration_minutes: number; capacity_default: number | null; price_base_cents: number; currency: string; difficulty: string | null }) => (
                  <a key={p.id} href={`${bookingHref}&product=${p.slug}`} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 transition">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{p.duration_minutes}min · {p.capacity_default ? `max ${p.capacity_default} posti` : 'privato'}</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">€{(p.price_base_cents / 100).toFixed(2)}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
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

