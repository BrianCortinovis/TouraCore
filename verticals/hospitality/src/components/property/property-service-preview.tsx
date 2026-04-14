'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Bike,
  CarFront,
  ChefHat,
  Dog,
  Leaf,
  MoonStar,
  Shield,
  Shirt,
  Sparkles,
  Star,
  SunMedium,
  Umbrella,
  Utensils,
  WashingMachine,
  Waves,
} from 'lucide-react'
import type {
  PropertyPreviewBadge,
  PropertyPreviewIcon,
  PropertyServicePreviewData,
} from '../../config/property-service-preview'

const iconMap: Record<PropertyPreviewIcon, LucideIcon> = {
  bed: BedDouble,
  bath: Bath,
  sun: SunMedium,
  moon: MoonStar,
  'washing-machine': WashingMachine,
  shirt: Shirt,
  'chef-hat': ChefHat,
  utensils: Utensils,
  sparkles: Sparkles,
  bike: Bike,
  car: CarFront,
  waves: Waves,
  umbrella: Umbrella,
  paw: Dog,
  leaf: Leaf,
  shield: Shield,
}

function badgeClassName(badge: PropertyPreviewBadge): string {
  switch (badge.tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'accent':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'neutral':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

export function PropertyServicePreview({
  data,
  mode = 'dashboard',
}: {
  data: PropertyServicePreviewData
  mode?: 'dashboard' | 'public'
}) {
  if (data.sections.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
        Nessun servizio attivo da mostrare nella scheda struttura.
      </div>
    )
  }

  const spotlightItems = data.sections
    .flatMap((section) =>
      section.items.slice(0, 2).map((item) => ({
        ...item,
        sectionTitle: section.title,
      }))
    )
    .slice(0, 6)

  return (
    <div
      className={`overflow-hidden border border-slate-200 bg-white shadow-[0_26px_70px_-44px_rgba(15,23,42,0.35)] ${
        mode === 'public' ? 'w-full' : ''
      }`}
    >
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_#f8fbff,_#eef5ff)]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1.7fr)_320px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Star className="h-3.5 w-3.5" />
                Anteprima portale
              </span>
              <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Scheda struttura
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {data.title}
              </h3>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                {data.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="inline-flex items-center gap-3 border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="text-lg font-semibold text-slate-950">{stat.value}</span>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {spotlightItems.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">Servizi in evidenza</div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {spotlightItems.map((item) => {
                    const Icon = iconMap[item.icon] ?? Sparkles

                    return (
                      <div
                        key={`${item.sectionTitle}-${item.id}`}
                        className="flex items-start gap-3 border border-slate-200 bg-white px-3 py-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-900 text-white">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {item.sectionTitle}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.price_label}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Riepilogo struttura
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                Informazioni principali
              </div>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-3">
                {data.sections.map((section) => (
                  <div key={section.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600">{section.title}</span>
                    <span className="font-semibold text-slate-900">{section.items.length}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="text-sm font-semibold text-slate-900">Cosa vedra` l&apos;ospite</div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Servizi inclusi e servizi extra con prezzo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Dettagli come quantita`, regole e disponibilita`</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Icone, evidenze e gruppi servizi in stile portale</span>
                  </div>
                </div>
              </div>

              {data.hidden_item_count > 0 && mode === 'dashboard' && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {data.hidden_item_count} servizi restano interni e non vengono mostrati agli ospiti.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="bg-white px-6 py-6">
        <div className="space-y-7">
          {data.sections.map((section) => (
            <section key={section.key} className="border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-950">{section.title}</h4>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {section.items.length} servizi
                </div>
              </div>

              <div>
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon] ?? Sparkles

                  return (
                    <article
                      key={item.id}
                      className="grid gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_220px]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-slate-900 text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-base font-semibold text-slate-950">{item.title}</h5>
                            {item.visibility_label && (
                              <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {item.visibility_label}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {item.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.highlights.map((highlight) => (
                              <span
                                key={highlight}
                                className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.badges.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.badges.map((badge) => (
                              <span
                                key={`${item.id}-${badge.label}`}
                                className={`border px-2.5 py-1 text-xs font-semibold ${badgeClassName(badge)}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between gap-3 lg:items-end lg:text-right">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Disponibilita`
                        </div>
                        <div className="text-lg font-semibold text-slate-950">{item.price_label}</div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
