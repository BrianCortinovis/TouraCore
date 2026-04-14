'use client'
import { Badge, Button, Input, cn } from '@touracore/ui'
import { useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Globe2,
  LayoutList,
  Link2,
  RefreshCcw,
  Save,
  Sparkles,
} from 'lucide-react'
import {
  buildPmsAmenitySuggestions,
  computeListingReadiness,
  getListingAmenityDefinitionsByCategory,
  getListingProfileSettings,
  getSelectedListingAmenities,
  type ListingAmenityCategory,
  type ListingProfileSettings,
} from '../../config/property-listing'
import type { Json, Organization } from '../../types/database'

interface ListingStandardsSectionProps {
  org: Organization | null
  onSave: (data: Record<string, unknown>) => void
  isPending: boolean
}

type ListingPanel = 'overview' | 'content' | 'amenities' | 'channels'

const textareaClassName =
  'min-h-24 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

const panelItems: Array<{
  key: ListingPanel
  label: string
  icon: typeof Globe2
  description: string
}> = [
  {
    key: 'overview',
    label: 'Panoramica',
    icon: LayoutList,
    description: 'Stato annuncio e voci da completare.',
  },
  {
    key: 'content',
    label: 'Contenuti',
    icon: BookOpen,
    description: 'Titolo, descrizioni, regole e istruzioni.',
  },
  {
    key: 'amenities',
    label: 'Servizi',
    icon: Sparkles,
    description: 'Dotazioni e servizi da mostrare ai clienti.',
  },
  {
    key: 'channels',
    label: 'Portali',
    icon: Link2,
    description: 'Come i contenuti vengono mostrati online.',
  },
]

export function ListingStandardsSection({
  org,
  onSave,
  isPending,
}: ListingStandardsSectionProps) {
  const [draft, setDraft] = useState<ListingProfileSettings>(() =>
    getListingProfileSettings(org?.settings)
  )
  const [openGroups, setOpenGroups] = useState<ListingAmenityCategory[]>([
    'services',
    'comfort',
    'kitchen',
  ])

  const amenityGroups = useMemo(() => getListingAmenityDefinitionsByCategory(), [])
  const selectedAmenities = useMemo(
    () => getSelectedListingAmenities(draft.amenity_codes),
    [draft.amenity_codes]
  )
  const readiness = useMemo(() => computeListingReadiness(draft), [draft])
  const pmsSuggestions = useMemo(() => buildPmsAmenitySuggestions(org), [org])
  const missingSuggestedAmenities = pmsSuggestions.filter((code) => !draft.amenity_codes.includes(code))
  const suggestedAmenityItems = useMemo(
    () => getSelectedListingAmenities(pmsSuggestions),
    [pmsSuggestions]
  )

  if (!org) return null

  function update<K extends keyof ListingProfileSettings>(key: K, value: ListingProfileSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function toggleAmenity(code: string) {
    setDraft((current) => ({
      ...current,
      amenity_codes: current.amenity_codes.includes(code)
        ? current.amenity_codes.filter((item) => item !== code)
        : [...current.amenity_codes, code],
    }))
  }

  function applyPmsSuggestions() {
    setDraft((current) => ({
      ...current,
      amenity_codes: Array.from(new Set([...current.amenity_codes, ...pmsSuggestions])),
    }))
  }

  function toggleGroup(category: ListingAmenityCategory) {
    setOpenGroups((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  function handleSave() {
    if (!org) return

    const currentSettings = toSettingsRecord(org.settings)

    onSave({
      settings: {
        ...currentSettings,
        listing_profile: {
          ...draft,
          amenity_codes: draft.amenity_codes as unknown as Json,
        },
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-blue-50 text-blue-600">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900">Configurazione Annuncio</p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Come la struttura appare su sito, booking engine e portali.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
              <MiniStat label="Completamento" value={`${readiness.score}%`} />
              <MiniStat label="Controlli" value={`${readiness.completed}/${readiness.total}`} />
              <MiniStat label="Servizi" value={String(draft.amenity_codes.length)} />
              <Button
                type="button"
                className="h-full min-h-[60px] justify-center"
                onClick={handleSave}
                disabled={isPending}
              >
                <Save className="h-4 w-4" />
                Salva
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {panelItems.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.key}
                    href={`#${item.key}`}
                    className="flex min-w-[148px] shrink-0 items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                  >
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight text-gray-900">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">{item.description}</span>
                    </span>
                  </a>
                )
              })}
            </nav>

            <Button
              type="button"
              variant="outline"
              className="justify-center xl:min-w-[180px]"
              onClick={applyPmsSuggestions}
              disabled={missingSuggestedAmenities.length === 0}
            >
              <RefreshCcw className="h-4 w-4" />
              Usa servizi gia&apos; attivi
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5 pt-1">
        <SectionSurface
          id="overview"
          icon={CheckCircle2}
          title="Panoramica annuncio"
          description="Qui controlli subito cosa e` gia` pronto e cosa manca ancora prima di pubblicare."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <CompactMetric label="Controlli completati" value={`${readiness.completed}/${readiness.total}`} hint="Campi base annuncio" />
            <CompactMetric label="Servizi pubblicati" value={String(draft.amenity_codes.length)} hint="Selezionati per i clienti" />
            <CompactMetric label="Da completare" value={String(readiness.missing.length)} hint="Blocchi ancora vuoti" />
          </div>

          {readiness.missing.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mancano ancora: {readiness.missing.join(', ')}.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Suggerimenti automatici</p>
                <p className="mt-1 text-sm text-gray-500">
                  Alcuni servizi possono essere proposti automaticamente partendo da cio` che hai gia` attivato nella struttura.
                </p>
              </div>
              <Badge variant="outline">{suggestedAmenityItems.length} suggeriti</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedAmenityItems.length === 0 && (
                <span className="text-sm text-gray-500">Nessun suggerimento automatico disponibile.</span>
              )}
              {suggestedAmenityItems.map((item) => {
                const selected = draft.amenity_codes.includes(item.code)

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => toggleAmenity(item.code)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </SectionSurface>

        <SectionSurface
          id="content"
          icon={BookOpen}
          title="Contenuti annuncio"
          description="Titolo, descrizioni e regole che gli ospiti leggono nella scheda struttura."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <Input
                label="Titolo pubblico"
                value={draft.public_title}
                onChange={(event) => update('public_title', event.target.value)}
                placeholder="Es. Villa con piscina privata vicino al lago"
              />
              <TextareaField
                label="Descrizione breve"
                value={draft.short_description}
                onChange={(value) => update('short_description', value)}
                placeholder="Riassunto veloce usato in elenco risultati e scheda."
              />
              <TextareaField
                label="Descrizione completa"
                value={draft.long_description}
                onChange={(value) => update('long_description', value)}
                placeholder="Testo principale dell'annuncio da mostrare ai clienti."
              />
            </div>

            <div className="space-y-4">
              <TextareaField
                label="Istruzioni arrivo"
                value={draft.arrival_instructions}
                onChange={(value) => update('arrival_instructions', value)}
                placeholder="Check-in, accessi, parcheggio, contatti."
              />
              <TextareaField
                label="Istruzioni check-out"
                value={draft.check_out_instructions}
                onChange={(value) => update('check_out_instructions', value)}
                placeholder="Orario uscita, chiavi, rifiuti, ultime verifiche."
              />
              <TextareaField
                label="Regole casa"
                value={draft.house_rules}
                onChange={(value) => update('house_rules', value)}
                placeholder="No fumo, silenzio, piscina, animali, ospiti extra."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextareaField
                  label="Sintesi cancellazione"
                  value={draft.cancellation_summary}
                  onChange={(value) => update('cancellation_summary', value)}
                  placeholder="Versione breve e leggibile."
                />
                <TextareaField
                  label="Note portali"
                  value={draft.ota_notes}
                  onChange={(value) => update('ota_notes', value)}
                  placeholder="Note interne su pubblicazione o sincronizzazione."
                />
              </div>
            </div>
          </div>
        </SectionSurface>

        <SectionSurface
          id="amenities"
          icon={Sparkles}
          title="Servizi e dotazioni"
          description="Scegli i servizi e le dotazioni che vuoi mostrare ai clienti nella scheda struttura."
        >
          <div className="space-y-3">
            {amenityGroups.map((group) => {
              const isOpen = openGroups.includes(group.category)
              const selectedCount = group.items.filter((item) => draft.amenity_codes.includes(item.code)).length

              return (
                <div key={group.category} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.category)}
                    className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{group.label}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedCount} di {group.items.length} selezionati
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedCount}</Badge>
                      <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="grid gap-2 p-3 md:grid-cols-2">
                      {group.items.map((item) => {
                        const selected = draft.amenity_codes.includes(item.code)
                        const suggested = pmsSuggestions.includes(item.code)

                        return (
                          <label
                            key={item.code}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors',
                              selected
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleAmenity(item.code)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                                {suggested && <Badge variant="success">Suggerito</Badge>}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <ChannelPill label={`Booking: ${item.ota_mapping.booking}`} />
                                <ChannelPill label={`Airbnb: ${item.ota_mapping.airbnb}`} />
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SectionSurface>

        <SectionSurface
          id="channels"
          icon={Link2}
          title="Come appare sui portali"
          description="Controlla come i servizi principali vengono interpretati sulle piattaforme collegate."
        >
          {selectedAmenities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              Seleziona almeno un servizio per vedere come verra` mostrato online.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Servizio</th>
                    <th className="px-4 py-3 font-medium">Booking</th>
                    <th className="px-4 py-3 font-medium">Airbnb</th>
                    <th className="px-4 py-3 font-medium">Holidu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedAmenities.map((item) => (
                    <tr key={item.code}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                      <td className="px-4 py-3 text-gray-600">{item.ota_mapping.booking}</td>
                      <td className="px-4 py-3 text-gray-600">{item.ota_mapping.airbnb}</td>
                      <td className="px-4 py-3 text-gray-600">{item.ota_mapping.holidu}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionSurface>
      </div>
    </div>
  )
}

function SectionSurface({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string
  icon: typeof Globe2
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="rounded-2xl border border-gray-200 bg-white shadow-sm scroll-mt-24">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}

function CompactMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{hint}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white px-2 py-2 shadow-sm">
      <div className="text-base font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">{label}</div>
    </div>
  )
}

function ChannelPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
      {label}
    </span>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={textareaClassName}
        placeholder={placeholder}
      />
    </div>
  )
}

function toSettingsRecord(value: Json): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}
