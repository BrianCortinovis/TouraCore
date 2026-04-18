import type { FC } from 'react'
import { Utensils, Users, Euro, Clock, UtensilsCrossed } from 'lucide-react'
import type { PublicListing } from './types'
import type { RestaurantDetails } from './restaurant'
import {
  WEEKDAY_KEYS,
  getWeekdayLabel,
  formatOpeningSlots,
  formatCuisineTag,
  formatPriceRange,
} from './restaurant'

export type RestaurantTemplateProps = {
  listing: PublicListing
  restaurant: RestaurantDetails | null
  bookingHref: string
}

const DAY_INDEX: Record<string, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
}

export const RestaurantTemplate: FC<RestaurantTemplateProps> = ({
  listing,
  restaurant,
  bookingHref,
}) => {
  const r = restaurant
  const cuisineTags = r?.cuisine_type ?? []
  const priceRange = r ? formatPriceRange(r.price_range) : ''
  const capacity = r?.capacity_total ?? 0
  const avgTurn = r?.avg_turn_minutes ?? 0

  const todayIdx = (new Date().getDay() + 6) % 7 // JS 0=Sun, shift to 0=Mon

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_340px]">
      <article>
        <div className="mb-3 inline-flex items-center gap-2 rounded bg-[#fde8ea] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#da3743]">
          Ristorante
          {priceRange ? <span className="font-bold text-[#a32129]">· {priceRange}</span> : null}
        </div>

        <h1 className="mb-3 text-[28px] font-bold leading-tight tracking-tight md:text-[36px]">
          {listing.entity_name}
        </h1>

        {listing.tagline ? (
          <p className="mb-5 max-w-[70ch] text-[16px] leading-relaxed text-[#1f2937]">
            {listing.tagline}
          </p>
        ) : null}

        {/* QUICK INFO BAR */}
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-[#e5e7eb] bg-white p-4 md:grid-cols-4">
          {cuisineTags.length > 0 ? (
            <InfoCell
              icon={<UtensilsCrossed size={18} />}
              label="Cucina"
              value={cuisineTags.slice(0, 2).map(formatCuisineTag).join(' · ')}
            />
          ) : null}
          {priceRange ? (
            <InfoCell icon={<Euro size={18} />} label="Fascia prezzo" value={priceRange} />
          ) : null}
          {capacity > 0 ? (
            <InfoCell icon={<Users size={18} />} label="Capienza" value={`${capacity} coperti`} />
          ) : null}
          {avgTurn > 0 ? (
            <InfoCell icon={<Clock size={18} />} label="Tempo medio" value={`${avgTurn} min`} />
          ) : null}
        </div>

        {/* CUISINE CHIPS */}
        {cuisineTags.length > 0 ? (
          <div className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-3 text-[18px] font-bold">Tipologia di cucina</h2>
            <ul className="flex flex-wrap gap-2">
              {cuisineTags.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#fde8ea] px-3 py-1 text-[13px] font-semibold text-[#a32129]"
                >
                  <Utensils size={12} />
                  {formatCuisineTag(c)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* DESCRIZIONE */}
        {listing.entity_description ? (
          <section className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-3 text-[18px] font-bold">Informazioni</h2>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#1f2937]">
              {listing.entity_description}
            </p>
          </section>
        ) : null}

        {/* OPENING HOURS */}
        {r ? (
          <section className="mb-6 rounded-md border border-[#e5e7eb] bg-white p-5">
            <h2 className="mb-3 text-[18px] font-bold">Orari di apertura</h2>
            <div className="overflow-hidden rounded border border-[#e5e7eb]">
              {WEEKDAY_KEYS.map((k, idx) => {
                const slots = r.opening_hours?.[k]
                const isToday = idx === todayIdx
                return (
                  <div
                    key={k}
                    className={[
                      'grid grid-cols-2 border-b border-[#e5e7eb] px-4 py-2.5 text-[13px] last:border-b-0',
                      isToday ? 'bg-[#fde8ea]' : '',
                    ].join(' ')}
                  >
                    <span className={isToday ? 'font-bold text-[#0b1220]' : 'font-medium text-[#0b1220]'}>
                      {getWeekdayLabel(k)}
                      {isToday ? <span className="ml-2 text-[11px] font-semibold uppercase text-[#a32129]">Oggi</span> : null}
                    </span>
                    <span className={(!slots || slots.length === 0) ? 'text-[#6b7280]' : 'text-[#1f2937]'}>
                      {formatOpeningSlots(slots)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </article>

      <aside>
        <div className="sticky top-[68px] rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Prenotazione tavolo
          </div>
          <h2 className="mb-4 text-[20px] font-bold leading-tight">
            Prenota da {listing.tenant_name}
          </h2>
          <p className="mb-5 text-[13px] leading-relaxed text-[#1f2937]">
            Verifica disponibilità e conferma il tuo tavolo attraverso il booking engine.
          </p>
          <a
            href={bookingHref}
            className="block rounded-md bg-[#da3743] px-4 py-3 text-center text-[14px] font-bold text-white transition hover:bg-[#a32129]"
          >
            Vai alla prenotazione →
          </a>
          <div className="mt-4 border-t border-[#e5e7eb] pt-4 text-[12px] leading-relaxed text-[#1f2937]">
            <TrustRow>Conferma via email</TrustRow>
            <TrustRow>Allergeni segnalabili in fase di prenotazione</TrustRow>
            <TrustRow>Distribuito da TouraCore</TrustRow>
          </div>
        </div>
      </aside>
    </div>
  )
}

void DAY_INDEX

const InfoCell: FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#fde8ea] text-[#da3743]">
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
