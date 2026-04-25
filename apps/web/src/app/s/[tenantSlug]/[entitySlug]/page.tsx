import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BikeRentalTemplate,
  buildListingJsonLd,
  buildListingFaqs,
  buildFaqJsonLd,
  filterKnownAmenities,
  GenericVerticalTemplate,
  getBookingUrl,
  HospitalityTemplate,
  ListingGallery,
  ListingShell,
  RestaurantTemplate,
} from '@touracore/listings'
import {
  getPublicListingCached,
  getAccommodationDetailsCached,
  getRestaurantDetailsCached,
  getBikeRentalDetailsCached,
  getBikeTypesPublicCached,
  getBikeLocationsPublicCached,
  getListingPhotosCached,
  getExperienceData,
  getReviewAggregateCached,
  getRecentPublicReviewsCached,
  getPublicEntityLegalCached,
  listTenantPublicListingsCached,
} from '@/lib/listings-cache'
import { formatLegalAddress } from '@touracore/listings'
import { getSiteBaseUrl } from '@/lib/site-url'

export const revalidate = 60
export const dynamicParams = true

type RouteParams = { tenantSlug: string; entitySlug: string }
type PageProps = { params: Promise<RouteParams> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug, entitySlug } = await params
  const listing = await getPublicListingCached(tenantSlug, entitySlug)

  if (!listing) {
    return { title: 'Scheda non trovata · TouraCore', robots: { index: false } }
  }

  const title = listing.seo_title ?? `${listing.entity_name} · ${listing.tenant_name}`
  const description =
    listing.seo_description ??
    listing.tagline ??
    listing.entity_short_description ??
    undefined
  const customImage = listing.og_image_url ?? listing.hero_url ?? undefined

  return {
    title,
    description: description ?? undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      type: 'website',
      ...(customImage ? { images: [{ url: customImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description ?? undefined,
      ...(customImage ? { images: [customImage] } : {}),
    },
  }
}

export default async function PublicListingPage({ params }: PageProps) {
  const { tenantSlug, entitySlug } = await params
  const listing = await getPublicListingCached(tenantSlug, entitySlug)

  if (!listing) notFound()

  // Parallel fetch kind-specific details + photo gallery + reviews aggregate + legal info
  const [accommodation, restaurant, bikeRental, bikeTypes, bikeLocations, photos, reviewAggregate, reviews, legalInfo] = await Promise.all([
    listing.entity_kind === 'accommodation'
      ? getAccommodationDetailsCached(listing.entity_id)
      : Promise.resolve(null),
    listing.entity_kind === 'restaurant'
      ? getRestaurantDetailsCached(listing.entity_id)
      : Promise.resolve(null),
    listing.entity_kind === 'bike_rental'
      ? getBikeRentalDetailsCached(listing.entity_id)
      : Promise.resolve(null),
    listing.entity_kind === 'bike_rental'
      ? getBikeTypesPublicCached(listing.entity_id)
      : Promise.resolve([]),
    listing.entity_kind === 'bike_rental'
      ? getBikeLocationsPublicCached(listing.entity_id)
      : Promise.resolve([]),
    getListingPhotosCached(listing.listing_id),
    getReviewAggregateCached(listing.entity_id),
    getRecentPublicReviewsCached(listing.entity_id, 5),
    getPublicEntityLegalCached(listing.entity_id),
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
      ? await getExperienceData(listing.entity_id)
      : null
  const shortId = listing.listing_id.slice(0, 8).toUpperCase()

  const baseUrl = getSiteBaseUrl()
  const jsonLd = buildListingJsonLd(listing, {
    baseUrl,
    bookingUrl: new URL(bookingHref, baseUrl).toString(),
    accommodation,
    restaurant,
    bikeRental,
    reviewAggregate,
    reviews,
  })
  const faqs = buildListingFaqs(listing, { accommodation, restaurant, bikeRental })
  const faqLd = buildFaqJsonLd(faqs)

  const tenantOthers = (await listTenantPublicListingsCached(tenantSlug))
    .filter((l) => l.listing_id !== listing.listing_id)
    .slice(0, 4)

  return (
    <ListingShell
      tenantName={listing.tenant_name}
      listingId={shortId}
      legal={
        legalInfo
          ? {
              legalName: legalInfo.company_name ?? legalInfo.display_name,
              vatNumber: legalInfo.vat_number,
              reaNumber: legalInfo.rea_number,
              legalAddress: formatLegalAddress(legalInfo),
              cinCode:
                legalInfo.legal_cin_code ??
                (listing.entity_kind === 'accommodation' ? accommodation?.cin_code ?? null : null),
            }
          : listing.entity_kind === 'accommodation' && accommodation?.cin_code
            ? { cinCode: accommodation.cin_code }
            : undefined
      }
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
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
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

      {faqs.length >= 3 ? (
        <section
          data-testid="listing-faq"
          className="mt-8 rounded-md border border-[#e5e7eb] bg-white p-5"
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading" className="mb-4 text-[18px] font-bold">
            Domande frequenti
          </h2>
          <dl className="divide-y divide-[#e5e7eb]">
            {faqs.map((f, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-[14px] font-semibold text-[#0b1220]">{f.question}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-[#1f2937]">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {tenantOthers.length > 0 ? (
        <section
          data-testid="related-listings"
          className="mt-8 rounded-md border border-[#e5e7eb] bg-white p-5"
          aria-labelledby="related-heading"
        >
          <h2 id="related-heading" className="mb-4 text-[18px] font-bold">
            Altre strutture di {listing.tenant_name}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tenantOthers.map((other) => (
              <li key={other.listing_id}>
                <Link
                  href={`/s/${other.tenant_slug}/${other.slug}`}
                  prefetch={false}
                  className="group block overflow-hidden rounded-md border border-[#e5e7eb] hover:border-[#003b95]"
                >
                  {other.hero_url ? (
                    <div
                      className="aspect-[4/3] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${other.hero_url})` }}
                      role="img"
                      aria-label={other.entity_name}
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-gray-100" />
                  )}
                  <div className="p-3">
                    <div className="text-[14px] font-semibold text-[#0b1220] group-hover:text-[#003b95]">
                      {other.entity_name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#6b7280]">
                      {other.tagline ?? ''}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ListingShell>
  )
}

