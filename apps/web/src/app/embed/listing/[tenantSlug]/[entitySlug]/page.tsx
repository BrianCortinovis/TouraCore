import { notFound } from 'next/navigation'
import {
  filterKnownAmenities,
  getBookingUrl,
  getPublicListing,
  AMENITIES,
  type AmenityKey,
} from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'

export const revalidate = 60
export const dynamicParams = true

type Props = { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function EmbedListingPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = createPublicClient()
  const listing = await getPublicListing(supabase, tenantSlug, entitySlug)
  if (!listing) notFound()

  const amenities = filterKnownAmenities(listing.featured_amenities).slice(0, 6)
  const bookingHref = getBookingUrl(tenantSlug)

  return (
    <div className="bg-white p-5 text-[#0b1220]" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div className="mx-auto max-w-[560px]">
        <div className="mb-2 inline-block rounded bg-[#e7f0ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#003b95]">
          {listing.entity_kind.replace('_', ' ')}
        </div>
        <h1 className="mb-1 text-[20px] font-bold leading-tight">{listing.entity_name}</h1>
        <div className="text-[12px] text-[#6b7280]">{listing.tenant_name}</div>
        {listing.tagline ? (
          <p className="mt-3 text-[13px] leading-snug text-[#1f2937]">{listing.tagline}</p>
        ) : null}
        {amenities.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {amenities.map((k: AmenityKey) => (
              <li key={k} className="flex items-center gap-2 text-[12px] text-[#1f2937]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#003b95]" />
                {AMENITIES[k].label_it}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex items-center gap-3">
          <a
            href={bookingHref}
            target="_top"
            className="rounded-md bg-[#003b95] px-4 py-2.5 text-[13px] font-bold text-white"
          >
            Prenota
          </a>
          <a
            href={`/s/${tenantSlug}/${entitySlug}`}
            target="_top"
            className="text-[12px] font-semibold text-[#003b95] hover:underline"
          >
            Vedi scheda →
          </a>
        </div>
        <div className="mt-4 border-t border-[#e5e7eb] pt-3 text-[10px] text-[#6b7280]">
          Distribuito con <b>TouraCore</b>
        </div>
      </div>
    </div>
  )
}
