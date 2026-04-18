import type { FC } from 'react'
import {
  MapPin as MapPinIcon,
  Mountain,
  Sparkles,
  Bike as BikeIcon,
  Flame,
  Compass,
} from 'lucide-react'
import type { PublicListing, AmenityKey, EntityKind } from './types'
import { AmenityIcon } from './amenity-icon'
import { AMENITIES } from './amenities'

const KIND_META: Record<
  Exclude<EntityKind, 'accommodation' | 'restaurant'>,
  { label: string; accent: string; accentSoft: string; accentInk: string; Icon: typeof Compass }
> = {
  activity: { label: 'Esperienza',   accent: '#ff5533', accentSoft: '#ffe8e1', accentInk: '#d64421', Icon: Compass },
  wellness: { label: 'Spa & Wellness', accent: '#14b8a6', accentSoft: '#ccfbf1', accentInk: '#0f766e', Icon: Sparkles },
  bike_rental: { label: 'Noleggio bici', accent: '#0ea5e9', accentSoft: '#e0f2fe', accentInk: '#0369a1', Icon: BikeIcon },
  moto_rental: { label: 'Noleggio moto', accent: '#6b21a8', accentSoft: '#f3e8ff', accentInk: '#4c1d95', Icon: Flame },
  ski_school: { label: 'Scuola sci', accent: '#1f6feb', accentSoft: '#ddf4ff', accentInk: '#0b4ac2', Icon: Mountain },
}

export type GenericVerticalTemplateProps = {
  listing: PublicListing
  bookingHref: string
  featuredAmenities: AmenityKey[]
}

export const GenericVerticalTemplate: FC<GenericVerticalTemplateProps> = ({
  listing,
  bookingHref,
  featuredAmenities,
}) => {
  const kind = listing.entity_kind as keyof typeof KIND_META
  const meta = KIND_META[kind] ?? {
    label: kind.replace('_', ' '),
    accent: '#003b95',
    accentSoft: '#e7f0ff',
    accentInk: '#002468',
    Icon: Compass,
  }
  const { label, accent, accentSoft, accentInk, Icon } = meta

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_340px]">
      <article>
        <div
          className="mb-3 inline-flex items-center gap-2 rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: accentSoft, color: accentInk }}
        >
          <Icon size={12} />
          {label}
        </div>

        <h1 className="mb-3 text-[28px] font-bold leading-tight tracking-tight md:text-[36px]">
          {listing.entity_name}
        </h1>

        {listing.tagline ? (
          <p className="mb-6 max-w-[70ch] text-[16px] leading-relaxed text-[#1f2937]">
            {listing.tagline}
          </p>
        ) : null}

        {listing.entity_description ? (
          <section className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-3 text-[18px] font-bold">Informazioni</h2>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#1f2937]">
              {listing.entity_description}
            </p>
          </section>
        ) : null}

        {featuredAmenities.length > 0 ? (
          <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-4 text-[18px] font-bold">In evidenza</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {featuredAmenities.map((k) => (
                <li key={k} className="flex items-center gap-3 text-[14px] text-[#1f2937]">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ background: accentSoft, color: accentInk }}
                  >
                    <AmenityIcon amenity={k} size={18} />
                  </span>
                  <span>{AMENITIES[k].label_it}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      <aside>
        <div className="sticky top-[68px] rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: accentInk }}>
            Booking engine
          </div>
          <h2 className="mb-4 text-[20px] font-bold leading-tight">
            Prenota da {listing.tenant_name}
          </h2>
          <p className="mb-5 text-[13px] leading-relaxed text-[#1f2937]">
            Accedi al booking engine per vedere disponibilità e condizioni.
          </p>
          <a
            href={bookingHref}
            className="block rounded-md px-4 py-3 text-center text-[14px] font-bold text-white transition"
            style={{ background: accent }}
          >
            Vai alla prenotazione →
          </a>
          <div className="mt-4 flex items-center gap-2 border-t border-[#e5e7eb] pt-4 text-[12px] text-[#1f2937]">
            <MapPinIcon size={14} className="text-[#6b7280]" />
            Distribuito da TouraCore
          </div>
        </div>
      </aside>
    </div>
  )
}
