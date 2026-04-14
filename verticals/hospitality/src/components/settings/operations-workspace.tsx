'use client'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, cn } from '@touracore/ui'
import { useEffect, useState } from 'react'
import {
  Clock3,
  CreditCard,
  Dog,
  Save,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { HotelOperationsSection } from './hotel-operations-section'
import { NonHotelOperationsSection } from './non-hotel-operations-section'
import { getPropertyTypeOperationsProfile } from '../../config/property-operations'
import type { Organization, RoomType } from '../../types/database'

type OperationsWorkspaceSection =
  | 'general'
  | 'tourist-tax'
  | 'pets'
  | 'services'

interface OperationsWorkspaceProps {
  org: Organization | null
  onSave: (data: Record<string, unknown>) => void
  onSaveHotel: (
    payload: Record<string, unknown>,
    roomTypeAmenityUpdates: Array<{ roomTypeId: string; amenities: string[] }>
  ) => void
  isPending: boolean
  roomTypes: RoomType[]
  initialSection?: OperationsWorkspaceSection
}

const sections: Array<{
  key: OperationsWorkspaceSection
  label: string
  icon: typeof Clock3
  description: string
}> = [
  {
    key: 'general',
    label: 'Generali',
    icon: Clock3,
    description: 'Orari, lingua, valuta e impostazioni di base.',
  },
  {
    key: 'tourist-tax',
    label: 'Tassa di soggiorno',
    icon: CreditCard,
    description: 'Tariffe, esenzioni e regole locali.',
  },
  {
    key: 'pets',
    label: 'Animali',
    icon: Dog,
    description: 'Regole, supplementi e policy pet-friendly.',
  },
  {
    key: 'services',
    label: 'Servizi e dotazioni',
    icon: Sparkles,
    description: 'Biancheria, cucina, extra, piscina, spa e servizi attivi.',
  },
]

export function OperationsWorkspace({
  org,
  onSave,
  onSaveHotel,
  isPending,
  roomTypes,
  initialSection = 'general',
}: OperationsWorkspaceProps) {
  const [section, setSection] = useState<OperationsWorkspaceSection>(initialSection)
  const petPolicy = (org?.pet_policy as Record<string, unknown> | null) ?? {}
  const operationsProfile = getPropertyTypeOperationsProfile(org?.type)

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="space-y-3">
          <div>
            <p className="text-base font-semibold text-gray-900">Area operativa struttura</p>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              {operationsProfile?.description ?? 'Gestione quotidiana, servizi attivi e regole operative della struttura.'}
            </p>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((item) => {
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSection(item.key)}
                  className={cn(
                    'flex min-w-[170px] shrink-0 items-center gap-2 border px-3 py-2 text-left transition-colors',
                    section === item.key
                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', section === item.key ? 'text-blue-700' : 'text-gray-500')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">{item.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="space-y-6">
        {section === 'general' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Impostazioni operative</h2>
              <p className="text-sm text-gray-500">
                Orari, lingua, valuta e preferenze base usate dal PMS.
              </p>
            </div>
            <Card>
              <CardContent className="space-y-4 p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget)
                    onSave({
                      default_check_in_time: fd.get('checkin_time') as string,
                      default_check_out_time: fd.get('checkout_time') as string,
                      default_currency: fd.get('currency') as string,
                      default_language: fd.get('language') as string,
                      timezone: fd.get('timezone') as string,
                    })
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Orario check-in" id="checkin_time" name="checkin_time" type="time" defaultValue={org?.default_check_in_time ?? '14:00'} />
                    <Input label="Orario check-out" id="checkout_time" name="checkout_time" type="time" defaultValue={org?.default_check_out_time ?? '10:00'} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Valuta</label>
                      <select name="currency" defaultValue={org?.default_currency ?? 'EUR'} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
                        <option value="EUR">EUR - Euro</option>
                        <option value="CHF">CHF - Franco svizzero</option>
                        <option value="GBP">GBP - Sterlina</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Lingua predefinita</label>
                      <select name="language" defaultValue={org?.default_language ?? 'it'} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
                        <option value="it">Italiano</option>
                        <option value="en">English</option>
                        <option value="de">Deutsch</option>
                        <option value="fr">Francais</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Fuso orario</label>
                    <select name="timezone" defaultValue={org?.timezone ?? 'Europe/Rome'} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
                      <option value="Europe/Rome">Europe/Rome (CET)</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salva
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'tourist-tax' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tassa di soggiorno</h2>
              <p className="text-sm text-gray-500">
                Imposta importi, max notti tassabili ed esenzioni gestite dal PMS.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Tassa di soggiorno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget)
                    const taxEnabled = fd.get('tax_enabled') === 'on'
                    const taxConfig = {
                      rates: [
                        { category: 'adult', amount: parseFloat(fd.get('tax_adult') as string) || 2.5, max_nights: parseInt(fd.get('tax_max_nights') as string) || 10 },
                        { category: 'child_10_17', amount: parseFloat(fd.get('tax_teen') as string) || 1.0, max_nights: parseInt(fd.get('tax_max_nights') as string) || 10 },
                      ],
                      exemptions: ['under_10', 'resident', 'disabled'],
                    }
                    onSave({
                      tourist_tax_enabled: taxEnabled,
                      tourist_tax_config: taxConfig,
                    })
                  }}
                  className="space-y-4"
                >
                  <label className="flex items-center gap-3">
                    <input name="tax_enabled" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={org?.tourist_tax_enabled ?? true} />
                    <span className="text-sm font-medium">Attiva gestione tassa di soggiorno</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Tariffa adulti (EUR/notte)" id="tax_adult" name="tax_adult" type="number" defaultValue={(org?.tourist_tax_config as { rates?: { category: string; amount: number }[] })?.rates?.find((r) => r.category === 'adult')?.amount?.toString() ?? '2.50'} />
                    <Input label="Tariffa ragazzi 10-17 (EUR/notte)" id="tax_teen" name="tax_teen" type="number" defaultValue={(org?.tourist_tax_config as { rates?: { category: string; amount: number }[] })?.rates?.find((r) => r.category === 'child_10_17')?.amount?.toString() ?? '1.00'} />
                  </div>
                  <Input label="Max notti tassabili" id="tax_max_nights" name="tax_max_nights" type="number" defaultValue={(org?.tourist_tax_config as { rates?: { category: string; max_nights: number }[] })?.rates?.[0]?.max_nights?.toString() ?? '10'} />
                  <p className="text-xs text-gray-500">Bambini sotto i 10 anni e residenti sono automaticamente esenti.</p>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salva
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'pets' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gestione animali</h2>
              <p className="text-sm text-gray-500">
                Policy, supplementi e regole visibili in booking engine e nel PMS.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Animali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget)
                    const petsAllowed = fd.get('pets_allowed') === 'on'
                    const nextPetPolicy = {
                      max_pets: parseInt(fd.get('max_pets') as string) || 2,
                      fee_per_night: parseFloat(fd.get('fee_per_night') as string) || 0,
                      fee_per_stay: parseFloat(fd.get('fee_per_stay') as string) || 0,
                      cleaning_fee: parseFloat(fd.get('cleaning_fee') as string) || 0,
                      refundable_deposit: parseFloat(fd.get('refundable_deposit') as string) || 0,
                      max_weight_kg: parseFloat(fd.get('max_weight_kg') as string) || 0,
                      allowed_types: ['dog', 'cat', 'other'].filter((t) => fd.get(`pet_type_${t}`) === 'on'),
                      allowed_sizes: ['small', 'medium', 'large'].filter((s) => fd.get(`pet_size_${s}`) === 'on'),
                      requires_documentation: fd.get('requires_documentation') === 'on',
                      requires_leash_common_areas: fd.get('requires_leash_common_areas') === 'on',
                      cannot_be_left_alone: fd.get('cannot_be_left_alone') === 'on',
                      allowed_in_pool_area: fd.get('allowed_in_pool_area') === 'on',
                      allowed_in_outdoor_areas: fd.get('allowed_in_outdoor_areas') === 'on',
                      allowed_in_restaurant_area: fd.get('allowed_in_restaurant_area') === 'on',
                      pet_kit_included: fd.get('pet_kit_included') === 'on',
                      pet_kit_fee: parseFloat(fd.get('pet_kit_fee') as string) || 0,
                      advance_notice_required: fd.get('advance_notice_required') === 'on',
                      pet_rules_text: (fd.get('pet_rules_text') as string) || '',
                    }

                    onSave({
                      pets_allowed: petsAllowed,
                      pet_policy: nextPetPolicy,
                    })
                  }}
                  className="space-y-4"
                >
                  <label className="flex items-center gap-3">
                    <input name="pets_allowed" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={org?.pets_allowed ?? false} />
                    <span className="text-sm font-medium">Accetta animali</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Max animali per prenotazione" id="max_pets" name="max_pets" type="number" min={1} max={10} defaultValue={(petPolicy.max_pets as number)?.toString() ?? '2'} />
                    <Input label="Supplemento per notte (EUR)" id="fee_per_night" name="fee_per_night" type="number" step="0.50" min={0} defaultValue={(petPolicy.fee_per_night as number)?.toString() ?? '0'} />
                  </div>
                  <Input label="Supplemento per soggiorno (EUR)" id="fee_per_stay" name="fee_per_stay" type="number" step="0.50" min={0} defaultValue={(petPolicy.fee_per_stay as number)?.toString() ?? '0'} />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input label="Pulizia finale pet (EUR)" id="cleaning_fee" name="cleaning_fee" type="number" step="0.50" min={0} defaultValue={(petPolicy.cleaning_fee as number)?.toString() ?? '0'} />
                    <Input label="Deposito cauzionale (EUR)" id="refundable_deposit" name="refundable_deposit" type="number" step="0.50" min={0} defaultValue={(petPolicy.refundable_deposit as number)?.toString() ?? '0'} />
                    <Input label="Peso massimo ammesso (kg)" id="max_weight_kg" name="max_weight_kg" type="number" step="0.5" min={0} defaultValue={(petPolicy.max_weight_kg as number)?.toString() ?? '0'} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Tipi ammessi</label>
                    <div className="flex gap-4">
                      {[
                        { key: 'dog', label: 'Cani' },
                        { key: 'cat', label: 'Gatti' },
                        { key: 'other', label: 'Altro' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            name={`pet_type_${key}`}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            defaultChecked={(petPolicy.allowed_types as string[])?.includes(key) ?? true}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Taglie ammesse</label>
                    <div className="flex gap-4">
                      {[
                        { key: 'small', label: 'Piccola (< 10kg)' },
                        { key: 'medium', label: 'Media (10-25kg)' },
                        { key: 'large', label: 'Grande (> 25kg)' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            name={`pet_size_${key}`}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            defaultChecked={(petPolicy.allowed_sizes as string[])?.includes(key) ?? true}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3">
                    <input name="requires_documentation" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={(petPolicy.requires_documentation as boolean) ?? false} />
                    <span className="text-sm font-medium">Richiedi documentazione sanitaria</span>
                  </label>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3">
                      <input name="advance_notice_required" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={(petPolicy.advance_notice_required as boolean) ?? false} />
                      <span className="text-sm font-medium">Richiedi preavviso prima della prenotazione</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3">
                      <input name="requires_leash_common_areas" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={(petPolicy.requires_leash_common_areas as boolean) ?? false} />
                      <span className="text-sm font-medium">Guinzaglio obbligatorio nelle aree comuni</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3">
                      <input name="cannot_be_left_alone" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={(petPolicy.cannot_be_left_alone as boolean) ?? false} />
                      <span className="text-sm font-medium">Gli animali non possono restare soli in camera</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3">
                      <input name="pet_kit_included" type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" defaultChecked={(petPolicy.pet_kit_included as boolean) ?? false} />
                      <span className="text-sm font-medium">Offri kit animali dedicato</span>
                    </label>
                  </div>

                  <Input label="Costo kit animali (EUR)" id="pet_kit_fee" name="pet_kit_fee" type="number" step="0.50" min={0} defaultValue={(petPolicy.pet_kit_fee as number)?.toString() ?? '0'} />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Accessi consentiti</label>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3">
                        <input
                          name="allowed_in_outdoor_areas"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          defaultChecked={(petPolicy.allowed_in_outdoor_areas as boolean) ?? false}
                        />
                        <span className="text-sm">Aree esterne / giardino</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3">
                        <input
                          name="allowed_in_pool_area"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          defaultChecked={(petPolicy.allowed_in_pool_area as boolean) ?? false}
                        />
                        <span className="text-sm">Area piscina</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3">
                        <input
                          name="allowed_in_restaurant_area"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          defaultChecked={(petPolicy.allowed_in_restaurant_area as boolean) ?? false}
                        />
                        <span className="text-sm">Sala colazioni / ristorazione</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Regole per gli animali</label>
                    <textarea
                      name="pet_rules_text"
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Es: Gli animali devono essere tenuti al guinzaglio nelle aree comuni..."
                      defaultValue={(petPolicy.pet_rules_text as string) ?? ''}
                    />
                    <p className="text-xs text-gray-500">Queste regole verranno mostrate agli ospiti nel booking engine e nel check-in online.</p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salva
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'services' && (
          <div className="space-y-6">
            <div className="max-w-3xl">
              <h2 className="text-lg font-semibold text-gray-900">Servizi e dotazioni</h2>
              <p className="text-sm text-gray-500">
                {operationsProfile?.serviceSummary ?? 'Qui configuri tutti i servizi attivi della struttura e i moduli dedicati alla tipologia selezionata.'}
              </p>
            </div>

            {org?.type === 'hotel' ? (
              <HotelOperationsSection
                key={`${org?.id ?? 'org'}-hotel-operations`}
                org={org}
                roomTypes={roomTypes}
                onSave={onSaveHotel}
                isPending={isPending}
              />
            ) : (
              <NonHotelOperationsSection
                key={`${org?.id ?? 'org'}-${org?.type ?? 'unknown'}-non-hotel-operations`}
                org={org}
                onSave={onSave}
                isPending={isPending}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
