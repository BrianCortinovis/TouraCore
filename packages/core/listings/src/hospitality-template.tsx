import type { FC } from 'react'
import { MapPin, Clock, Users, Mail, Phone, Globe, CalendarDays, DoorOpen } from 'lucide-react'
import type { PublicListing, AmenityKey } from './types'
import type { AccommodationDetails } from './accommodation'
import { formatPropertyType, normalizeAmenities } from './accommodation'
import { AmenityIcon } from './amenity-icon'
import { AMENITIES } from './amenities'

export type HospitalityTemplateProps = {
  listing: PublicListing
  accommodation: AccommodationDetails | null
  bookingHref: string
  featuredAmenities: AmenityKey[]
}

export const HospitalityTemplate: FC<HospitalityTemplateProps> = ({
  listing,
  accommodation,
  bookingHref,
  featuredAmenities,
}) => {
  const a = accommodation
  const propertyLabel = a?.property_type ? formatPropertyType(a.property_type) : null

  const autoAmenities: AmenityKey[] = a ? normalizeAmenities(a.amenities) : []
  const curated = featuredAmenities.length > 0 ? featuredAmenities : autoAmenities
  const allAmenities = new Set<AmenityKey>([...curated, ...autoAmenities])

  const addressLine = a
    ? [a.address, [a.zip, a.city].filter(Boolean).join(' '), a.province, a.country]
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_340px]">
      <article>
        {propertyLabel ? (
          <div className="mb-3 inline-flex items-center gap-2 rounded bg-[#e7f0ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#003b95]">
            {propertyLabel}
          </div>
        ) : null}

        <h1 className="mb-3 text-[28px] font-bold leading-tight tracking-tight md:text-[36px]">
          {listing.entity_name}
        </h1>

        {addressLine ? (
          <div className="mb-5 flex items-center gap-2 text-[14px] text-[#1f2937]">
            <MapPin size={16} className="text-[#6b7280]" />
            <span>{addressLine}</span>
          </div>
        ) : null}

        {listing.tagline ? (
          <p className="mb-6 max-w-[70ch] text-[16px] leading-relaxed text-[#1f2937]">
            {listing.tagline}
          </p>
        ) : null}

        {/* QUICK INFO BAR */}
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-[#e5e7eb] bg-white p-4 md:grid-cols-4">
          {propertyLabel ? (
            <InfoCell icon={<DoorOpen size={18} />} label="Tipologia" value={propertyLabel} />
          ) : null}
          {a?.check_in_time ? (
            <InfoCell icon={<Clock size={18} />} label="Check-in" value={`dalle ${a.check_in_time.slice(0, 5)}`} />
          ) : null}
          {a?.check_out_time ? (
            <InfoCell
              icon={<CalendarDays size={18} />}
              label="Check-out"
              value={`entro ${a.check_out_time.slice(0, 5)}`}
            />
          ) : null}
          {a?.city ? <InfoCell icon={<MapPin size={18} />} label="Località" value={a.city} /> : null}
          {!propertyLabel && !a?.check_in_time && !a?.check_out_time && !a?.city ? (
            <InfoCell icon={<Users size={18} />} label="Ospiti" value="Vedi dettagli" />
          ) : null}
        </div>

        {/* DESCRIZIONE */}
        {listing.entity_description ? (
          <section className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-3 text-[18px] font-bold">Informazioni</h2>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#1f2937]">
              {listing.entity_description}
            </p>
          </section>
        ) : null}

        {/* AMENITIES GRID */}
        {allAmenities.size > 0 ? (
          <section className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-1 text-[18px] font-bold">Servizi</h2>
            <p className="mb-4 text-[13px] text-[#6b7280]">{allAmenities.size} servizi disponibili</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {Array.from(allAmenities).map((k) => (
                <li key={k} className="flex items-center gap-3 text-[14px] text-[#1f2937]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f0ff] text-[#003b95]">
                    <AmenityIcon amenity={k} size={18} />
                  </span>
                  <span>{AMENITIES[k].label_it}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* CONTATTI */}
        {a && (a.email || a.phone || a.website) ? (
          <section className="rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-4 text-[18px] font-bold">Contatti</h2>
            <ul className="space-y-2 text-[14px]">
              {a.phone ? (
                <li className="flex items-center gap-3">
                  <Phone size={16} className="text-[#6b7280]" />
                  <a href={`tel:${a.phone}`} className="text-[#003b95] hover:underline">
                    {a.phone}
                  </a>
                </li>
              ) : null}
              {a.email ? (
                <li className="flex items-center gap-3">
                  <Mail size={16} className="text-[#6b7280]" />
                  <a href={`mailto:${a.email}`} className="text-[#003b95] hover:underline">
                    {a.email}
                  </a>
                </li>
              ) : null}
              {a.website ? (
                <li className="flex items-center gap-3">
                  <Globe size={16} className="text-[#6b7280]" />
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#003b95] hover:underline"
                  >
                    {a.website}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
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
            <TrustRow>Conferma immediata</TrustRow>
            <TrustRow>Pagamento sicuro Stripe</TrustRow>
            <TrustRow>Distribuito da TouraCore</TrustRow>
          </div>
        </div>
      </aside>
    </div>
  )
}

const InfoCell: FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f0ff] text-[#003b95]">
      {icon}
    </span>
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-[#0b1220]">{value}</div>
    </div>
  </div>
)

const TrustRow: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-1 flex items-center gap-2 first:mt-0">
    <span className="text-[#008009]">✓</span>
    <span>{children}</span>
  </div>
)
