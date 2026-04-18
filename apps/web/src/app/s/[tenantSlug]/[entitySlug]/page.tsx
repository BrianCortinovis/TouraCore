import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AmenityIcon,
  buildListingJsonLd,
  filterKnownAmenities,
  getBookingUrl,
  getPublicListing,
  ListingShell,
  getAmenityLabel,
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

  const amenities = filterKnownAmenities(listing.featured_amenities)
  const bookingHref = getBookingUrl(tenantSlug)
  const shortId = listing.listing_id.slice(0, 8).toUpperCase()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const jsonLd = buildListingJsonLd(listing, {
    baseUrl,
    bookingUrl: new URL(bookingHref, baseUrl).toString(),
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
      <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_340px]">
        <article>
          <div className="mb-3 inline-flex items-center gap-2 rounded bg-[#e7f0ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#003b95]">
            {listing.entity_kind.replace('_', ' ')}
          </div>

          <h1 className="mb-3 text-[28px] font-bold leading-tight tracking-tight md:text-[36px]">
            {listing.entity_name}
          </h1>

          {listing.tagline ? (
            <p className="mb-5 max-w-[70ch] text-[16px] leading-relaxed text-[#1f2937]">
              {listing.tagline}
            </p>
          ) : null}

          {listing.entity_description ? (
            <div className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
              <h2 className="mb-3 text-[18px] font-bold">Informazioni</h2>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#1f2937]">
                {listing.entity_description}
              </p>
            </div>
          ) : null}

          {amenities.length > 0 ? (
            <div className="rounded-md border border-[#e5e7eb] bg-white p-5">
              <h2 className="mb-4 text-[18px] font-bold">Servizi in evidenza</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {amenities.map((key) => (
                  <li key={key} className="flex items-center gap-3 text-[14px] text-[#1f2937]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f0ff] text-[#003b95]">
                      <AmenityIcon amenity={key} size={18} />
                    </span>
                    <span>{getAmenityLabel(key, 'it')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>

        <aside>
          <div className="sticky top-[68px] rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
              Booking engine
            </div>
            <h2 className="mb-4 text-[20px] font-bold leading-tight">
              Prenota da {listing.tenant_name}
            </h2>
            <p className="mb-5 text-[13px] leading-relaxed text-[#1f2937]">
              Accedi al booking engine unificato per verificare disponibilità, prezzi e condizioni.
            </p>
            <a
              href={bookingHref}
              className="block rounded-md bg-[#003b95] px-4 py-3 text-center text-[14px] font-bold text-white transition hover:bg-[#002468]"
            >
              Vai alla prenotazione →
            </a>
            <div className="mt-4 border-t border-[#e5e7eb] pt-4 text-[12px] leading-relaxed text-[#1f2937]">
              <div className="flex items-center gap-2">
                <span className="text-[#008009]">✓</span>
                <span>Conferma immediata</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[#008009]">✓</span>
                <span>Pagamento sicuro Stripe</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[#008009]">✓</span>
                <span>Distribuito da TouraCore</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </ListingShell>
  )
}
