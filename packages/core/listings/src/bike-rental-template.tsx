import type { FC } from 'react'
import { Bike, Zap, MapPin, Clock, Euro, Shield, Truck } from 'lucide-react'
import type { PublicListing } from './types'
import type { BikeRentalDetails, BikeTypePublic, BikeLocationPublic } from './bike-rental'

export type BikeRentalTemplateProps = {
  listing: PublicListing
  rental: BikeRentalDetails | null
  types: BikeTypePublic[]
  locations: BikeLocationPublic[]
  bookingHref: string
}

const BIKE_TYPE_ICON: Record<string, string> = {
  road: '🚴',
  gravel: '🚵',
  mtb: '⛰️',
  e_mtb: '⚡',
  e_city: '🔋',
  e_cargo: '📦',
  e_folding: '💼',
  hybrid: '🚲',
  folding: '💼',
  kids: '🧒',
  tandem: '👫',
  handbike: '♿',
  cargo: '📦',
  city: '🏙️',
}

function isElectric(typeKey: string): boolean {
  return typeKey.startsWith('e_')
}

export const BikeRentalTemplate: FC<BikeRentalTemplateProps> = ({
  listing,
  rental,
  types,
  locations,
  bookingHref,
}) => {
  const bikeTypes = rental?.bike_types ?? []
  const city = rental?.city
  const capacity = rental?.capacity_total ?? 0
  const electricCount = types.filter((t) => isElectric(t.type_key)).length
  const deliveryEnabled = Boolean((rental?.delivery_config as Record<string, unknown> | null)?.enabled)
  const oneWayEnabled = Boolean((rental?.one_way_config as Record<string, unknown> | null)?.enabled)

  const minHourly = types.reduce<number | null>((min, t) => {
    const h = t.hourly_rate
    if (h == null) return min
    return min == null || h < min ? h : min
  }, null)

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_340px]">
      <article>
        <div className="mb-3 inline-flex items-center gap-2 rounded bg-[#e0f2fe] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0369a1]">
          Noleggio Bici & E-Bike
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
          <InfoCell
            icon={<Bike size={18} />}
            label="Flotta"
            value={`${capacity} bici`}
          />
          {electricCount > 0 ? (
            <InfoCell
              icon={<Zap size={18} className="text-amber-500" />}
              label="E-Bike"
              value={`${electricCount} tipi`}
            />
          ) : null}
          {minHourly != null ? (
            <InfoCell
              icon={<Euro size={18} />}
              label="Da"
              value={`€${minHourly.toFixed(2)}/h`}
            />
          ) : null}
          {city ? <InfoCell icon={<MapPin size={18} />} label="Dove" value={city} /> : null}
        </div>

        {/* BIKE TYPES GRID */}
        {types.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Tipi disponibili</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {types.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{BIKE_TYPE_ICON[t.type_key] ?? '🚲'}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{t.display_name}</p>
                        {isElectric(t.type_key) && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            <Zap size={10} />
                            Elettrica
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {t.hourly_rate && <p>€{t.hourly_rate}/h</p>}
                      {t.daily_rate && <p>€{t.daily_rate}/giorno</p>}
                    </div>
                  </div>
                  {t.description && (
                    <p className="mt-2 text-xs text-gray-600">{t.description}</p>
                  )}
                  <p className="mt-2 text-[10px] text-gray-400">
                    Deposito €{t.deposit_amount}
                    {t.age_min ? ` · età min ${t.age_min}` : ''}
                    {t.height_min ? ` · h ${t.height_min}-${t.height_max ?? ''}cm` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* LOCATIONS */}
        {locations.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Depositi</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {locations.map((loc) => (
                <div key={loc.id} className="rounded-md border border-gray-200 bg-white p-3">
                  <p className="flex items-center gap-1 font-semibold text-gray-900">
                    <MapPin size={14} />
                    {loc.name}
                  </p>
                  {loc.address && (
                    <p className="text-xs text-gray-600">
                      {loc.address}
                      {loc.city ? `, ${loc.city}` : ''}
                    </p>
                  )}
                  <div className="mt-1 flex gap-2 text-[10px]">
                    {loc.is_pickup && (
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">Ritiro</span>
                    )}
                    {loc.is_return && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">Consegna</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* SERVICES */}
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-gray-900">Servizi</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {deliveryEnabled && (
              <ServicePill icon={<Truck size={16} />} label="Consegna in hotel / punto concordato" />
            )}
            {oneWayEnabled && (
              <ServicePill icon={<MapPin size={16} />} label="Noleggio one-way (ritiro/consegna in depositi diversi)" />
            )}
            <ServicePill icon={<Shield size={16} />} label="Assicurazione furto + danni disponibile" />
            <ServicePill icon={<Clock size={16} />} label="Noleggio orario / giornaliero / settimanale" />
          </div>
        </section>
      </article>

      {/* RIGHT SIDEBAR: Booking CTA */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-gray-500">Prenota online</p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {minHourly != null ? `Da €${minHourly.toFixed(2)}/ora` : 'Contattaci per prenotare'}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Conferma immediata · Deposito cauzionale · Cancellazione gratuita 24h prima
          </p>
          <a
            href={bookingHref}
            className="mt-4 block w-full rounded-md bg-[#0369a1] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#075985]"
          >
            Prenota ora
          </a>
          <div className="mt-4 space-y-1 text-[11px] text-gray-500">
            {bikeTypes.length > 0 && <p>{bikeTypes.length} tipi disponibili</p>}
            {locations.length > 0 && <p>{locations.length} depositi</p>}
            {deliveryEnabled && <p>Consegna disponibile</p>}
          </div>
        </div>
      </aside>
    </div>
  )
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function ServicePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
