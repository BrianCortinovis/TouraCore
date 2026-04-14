'use client'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@touracore/ui'
import { useState, type ReactNode } from 'react'
import {
  BedDouble,
  Coffee,
  ConciergeBell,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { ManagedExtraEditor } from './non-hotel-operations-section'
import {
  buildHotelAmenitySuggestionCodes,
  createHotelAddon,
  createHotelLinenItem,
  createHotelPropertyService,
  getHotelOperationsSettings,
  getHotelRoomAmenityLabels,
  getHotelRoomFeatureDefinitions,
  type HotelAddonService,
  type HotelHousekeepingSettings,
  type HotelLinenKind,
  type HotelLinenPolicyItem,
  type HotelOperationsSettings,
  type HotelPropertyService,
  type HotelRoomTypeProfile,
  type HotelServiceChargeMode,
  type HotelServicePricingMode,
} from '../../config/hotel-operations'
import {
  createManagedExtraAmenity,
  getSharedExtraAmenitiesSettings,
  type ManagedExtraAmenity,
} from '../../config/non-hotel-operations'
import { buildOperationsSettingsPayload } from '../../config/property-operations'
import type { Organization, RoomType } from '../../types/database'

interface HotelOperationsSectionProps {
  org: Organization | null
  roomTypes: RoomType[]
  onSave: (
    payload: Record<string, unknown>,
    roomTypeAmenityUpdates: Array<{ roomTypeId: string; amenities: string[] }>
  ) => void
  isPending: boolean
}

type HotelTab = 'shared-services' | 'services' | 'addons' | 'housekeeping' | 'rooms'

const chargeOptions = [
  { value: 'free', label: 'Gratis' },
  { value: 'paid', label: 'A pagamento' },
]

const pricingOptions = [
  { value: 'per_stay', label: 'Per soggiorno' },
  { value: 'per_night', label: 'Per notte' },
  { value: 'per_day', label: 'Per giorno' },
  { value: 'per_hour', label: 'Per ora' },
  { value: 'per_guest', label: 'Per ospite' },
  { value: 'per_item', label: 'Per pezzo' },
]

const serviceKindOptions = [
  { value: 'front_desk_24h', label: 'Reception 24h' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'room_service', label: 'Room service' },
  { value: 'restaurant', label: 'Ristorante' },
  { value: 'bar', label: 'Bar' },
  { value: 'shuttle', label: 'Navetta' },
  { value: 'guest_laundry', label: 'Lavanderia ospiti' },
  { value: 'meeting_room', label: 'Sala meeting' },
  { value: 'business_corner', label: 'Business corner' },
]

const addonKindOptions = [
  { value: 'breakfast', label: 'Colazione' },
  { value: 'half_board', label: 'Mezza pensione' },
  { value: 'full_board', label: 'Pensione completa' },
  { value: 'parking', label: 'Parcheggio' },
  { value: 'spa_access', label: 'Accesso spa' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'extra_bed', label: 'Letto extra' },
  { value: 'crib', label: 'Culla' },
  { value: 'pet_fee', label: 'Supplemento animali' },
  { value: 'early_check_in', label: 'Early check-in' },
  { value: 'late_check_out', label: 'Late check-out' },
  { value: 'minibar_package', label: 'Pacchetto minibar' },
]

const linenKindOptions = [
  { value: 'bed_linen', label: 'Biancheria letto' },
  { value: 'bath_linen', label: 'Asciugamani bagno' },
  { value: 'bathrobe', label: 'Accappatoio' },
  { value: 'slippers', label: 'Ciabattine' },
  { value: 'pillows', label: 'Cuscini extra' },
  { value: 'blanket', label: 'Coperte / plaid' },
]

const tabs: Array<{ key: HotelTab; label: string; icon: typeof Sparkles; description: string }> = [
  {
    key: 'shared-services',
    label: 'Servizi struttura',
    icon: Sparkles,
    description: 'Piscina, spa, parcheggio, transfer, bici e servizi trasversali della struttura.',
  },
  {
    key: 'services',
    label: 'Servizi hotel',
    icon: ConciergeBell,
    description: 'Reception, ristorante, room service, navetta e servizi tipici alberghieri.',
  },
  {
    key: 'addons',
    label: 'Add-on vendibili',
    icon: Coffee,
    description: 'Extra prenotabili, addebitabili e visibili nel booking engine.',
  },
  {
    key: 'housekeeping',
    label: 'Housekeeping',
    icon: Sparkles,
    description: 'Pulizie giornaliere, biancheria, turn-down e regole operative.',
  },
  {
    key: 'rooms',
    label: 'Tipi camera',
    icon: BedDouble,
    description: 'Servizi e dotazioni associati alle tipologie camera.',
  },
]

const textareaClassName =
  'min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

function buildActiveBadge(items: Array<{ is_active: boolean }>) {
  const active = items.filter((item) => item.is_active).length
  return `${active}/${items.length} attivi`
}

export function HotelOperationsSection({
  org,
  roomTypes,
  onSave,
  isPending,
}: HotelOperationsSectionProps) {
  const [activeTab, setActiveTab] = useState<HotelTab>('shared-services')
  const [draft, setDraft] = useState<HotelOperationsSettings>(() =>
    getHotelOperationsSettings(org?.settings, roomTypes)
  )
  const [sharedExtras, setSharedExtras] = useState<ManagedExtraAmenity[]>(() =>
    getSharedExtraAmenitiesSettings(org?.settings)
  )

  if (!org || org.type !== 'hotel') return null
  const currentOrg = org

  const roomFeatureDefinitions = getHotelRoomFeatureDefinitions()
  const hotelSuggestionCodes = buildHotelAmenitySuggestionCodes(draft, sharedExtras)

  function updatePropertyService(id: string, patch: Partial<HotelPropertyService>) {
    setDraft((current) => ({
      ...current,
      property_services: current.property_services.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  function updateAddon(id: string, patch: Partial<HotelAddonService>) {
    setDraft((current) => ({
      ...current,
      sellable_addons: current.sellable_addons.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  function updateHousekeeping(patch: Partial<HotelHousekeepingSettings>) {
    setDraft((current) => ({
      ...current,
      housekeeping: { ...current.housekeeping, ...patch },
    }))
  }

  function updateLinen(id: string, patch: Partial<HotelLinenPolicyItem>) {
    updateHousekeeping({
      linens: draft.housekeeping.linens.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function updateRoomTypeProfile(roomTypeId: string, patch: Partial<HotelRoomTypeProfile>) {
    setDraft((current) => ({
      ...current,
      room_type_profiles: current.room_type_profiles.map((profile) =>
        profile.room_type_id === roomTypeId ? { ...profile, ...patch } : profile
      ),
    }))
  }

  function updateSharedExtra(id: string, patch: Partial<ManagedExtraAmenity>) {
    setSharedExtras((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function handleSave() {
    const roomTypeAmenityUpdates = draft.room_type_profiles.map((profile) => ({
      roomTypeId: profile.room_type_id,
      amenities: getHotelRoomAmenityLabels(profile.amenity_codes),
    }))

    onSave(
      buildOperationsSettingsPayload({
        currentSettings: currentOrg.settings,
        propertyType: 'hotel',
        sharedCatalogs: {
          extras: sharedExtras,
        },
        typeModule: draft as unknown as Record<string, unknown>,
      }),
      roomTypeAmenityUpdates
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex min-w-[210px] items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                  activeTab === tab.key
                    ? 'border-blue-200 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="mt-0.5 block text-xs leading-tight text-gray-500">{tab.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'shared-services' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Servizi struttura condivisi</CardTitle>
                <p className="text-sm text-gray-500">
                  Qui gestisci i servizi trasversali della struttura, validi anche per hotel: piscina, spa,
                  parcheggio, transfer, bici, wellness e altri servizi ospite.
                </p>
              </div>
              <Badge variant="outline">{buildActiveBadge(sharedExtras)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sharedExtras.map((item) => (
              <ManagedExtraEditor
                key={item.id}
                item={item}
                onChange={(patch) => updateSharedExtra(item.id, patch)}
                onRemove={() => setSharedExtras((current) => current.filter((entry) => entry.id !== item.id))}
              />
            ))}
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-4">
              <p className="text-xs leading-5 text-gray-500">
                Questi servizi restano comuni a tutte le tipologie compatibili e vengono riusati anche in preview,
                scheda struttura e suggerimenti di pubblicazione.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSharedExtras((current) => [...current, createManagedExtraAmenity()])}
              >
                Nuovo servizio struttura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'services' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Servizi struttura hotel</CardTitle>
                <p className="text-sm text-gray-500">
                  Qui configuri i servizi generali dell'hotel. Nei PMS professionali questa area copre servizi
                  struttura, visibilita` ospite e confermabilita`.
                </p>
              </div>
              <Badge variant="outline">{buildActiveBadge(draft.property_services)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.property_services.map((service) => (
              <HotelCommercialEditor
                key={service.id}
                item={service}
                kindOptions={serviceKindOptions}
                onChange={(patch) => updatePropertyService(service.id, patch)}
                onRemove={() =>
                  setDraft((current) => ({
                    ...current,
                    property_services: current.property_services.filter((item) => item.id !== service.id),
                  }))
                }
              />
            ))}
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-4">
              <p className="text-xs leading-5 text-gray-500">
                Questi servizi entrano nella scheda struttura, possono suggerire dotazioni pubbliche e aiutano a
                preparare la distribuzione canali senza mischiarli con gli extra addebitabili.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    property_services: [...current.property_services, createHotelPropertyService()],
                  }))
                }
              >
                Nuovo servizio hotel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'addons' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Add-on prenotabili e folio</CardTitle>
                <p className="text-sm text-gray-500">
                  Extra vendibili da booking engine, PMS o front office: colazione, spa, parcheggio, late check-out,
                  culla, letto extra e altri servizi addebitabili.
                </p>
              </div>
              <Badge variant="outline">{buildActiveBadge(draft.sellable_addons)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.sellable_addons.map((addon) => (
              <HotelCommercialEditor
                key={addon.id}
                item={addon}
                kindOptions={addonKindOptions}
                onChange={(patch) => updateAddon(addon.id, patch)}
                extraFields={
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Gruppo folio"
                      value={addon.folio_group}
                      onChange={(event) => updateAddon(addon.id, { folio_group: event.target.value })}
                      placeholder="Es. restaurant, extra_service"
                    />
                    <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={addon.booking_engine_visible}
                        onChange={(event) =>
                          updateAddon(addon.id, { booking_engine_visible: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      Visibile nel booking engine
                    </label>
                  </div>
                }
                onRemove={() =>
                  setDraft((current) => ({
                    ...current,
                    sellable_addons: current.sellable_addons.filter((item) => item.id !== addon.id),
                  }))
                }
              />
            ))}
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    sellable_addons: [...current.sellable_addons, createHotelAddon()],
                  }))
                }
              >
                Nuovo add-on
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'housekeeping' && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Regole housekeeping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Inizio servizio"
                  type="time"
                  value={draft.housekeeping.service_start_time}
                  onChange={(event) => updateHousekeeping({ service_start_time: event.target.value })}
                />
                <Input
                  label="Fine servizio"
                  type="time"
                  value={draft.housekeeping.service_end_time}
                  onChange={(event) => updateHousekeeping({ service_end_time: event.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Cambio asciugamani ogni"
                  type="number"
                  value={String(draft.housekeeping.change_towels_every_days)}
                  onChange={(event) =>
                    updateHousekeeping({ change_towels_every_days: Number(event.target.value) || 1 })
                  }
                />
                <Input
                  label="Cambio lenzuola ogni"
                  type="number"
                  value={String(draft.housekeeping.change_linens_every_days)}
                  onChange={(event) =>
                    updateHousekeeping({ change_linens_every_days: Number(event.target.value) || 1 })
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['daily_service_included', 'Servizio giornaliero incluso'] as const,
                  ['turndown_available', 'Turn-down disponibile'] as const,
                  ['eco_program_enabled', 'Programma eco / skip clean'] as const,
                  ['inspection_required', 'Ispezione camera richiesta'] as const,
                  ['do_not_disturb_supported', 'Gestione DND / non disturbare'] as const,
                  ['express_pickup_enabled', 'Riassetto espresso / pickup'] as const,
                  ['minibar_check_required', 'Controllo minibar obbligatorio'] as const,
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.housekeeping[key as keyof HotelHousekeepingSettings])}
                      onChange={(event) =>
                        updateHousekeeping({ [key]: event.target.checked } as Partial<HotelHousekeepingSettings>)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Biancheria e par level</CardTitle>
                <Badge variant="outline">{buildActiveBadge(draft.housekeeping.linens)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {draft.housekeeping.linens.map((linen) => (
                <div key={linen.id} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">{linen.name}</p>
                      <p className="text-xs text-gray-500">
                        Gestione biancheria alberghiera, on-request, addebito e scorta per camera.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateHousekeeping({
                          linens: draft.housekeeping.linens.filter((item) => item.id !== linen.id),
                        })
                      }
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Nome"
                      value={linen.name}
                      onChange={(event) => updateLinen(linen.id, { name: event.target.value })}
                    />
                    <Select
                      label="Tipo"
                      value={linen.kind}
                      onChange={(event) =>
                        updateLinen(linen.id, { kind: event.target.value as HotelLinenKind })
                      }
                      options={linenKindOptions}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Quantita` per camera"
                      type="number"
                      value={String(linen.quantity_per_room)}
                      onChange={(event) =>
                        updateLinen(linen.id, { quantity_per_room: Number(event.target.value) || 0 })
                      }
                    />
                    <Input
                      label="Par level"
                      type="number"
                      value={String(linen.par_level)}
                      onChange={(event) =>
                        updateLinen(linen.id, { par_level: Number(event.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="Addebito"
                      value={linen.charge_mode}
                      onChange={(event) =>
                        updateLinen(linen.id, { charge_mode: event.target.value as HotelServiceChargeMode })
                      }
                      options={chargeOptions}
                    />
                    <Select
                      label="Tariffazione"
                      value={linen.pricing_mode}
                      onChange={(event) =>
                        updateLinen(linen.id, { pricing_mode: event.target.value as HotelServicePricingMode })
                      }
                      options={pricingOptions}
                    />
                  </div>
                  {linen.charge_mode === 'paid' ? (
                    <Input
                      label="Prezzo"
                      type="number"
                      value={String(linen.price)}
                      onChange={(event) => updateLinen(linen.id, { price: Number(event.target.value) || 0 })}
                    />
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      ['is_active', 'Attivo'] as const,
                      ['included', 'Incluso di default'] as const,
                      ['on_request', 'Su richiesta'] as const,
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(linen[key as keyof HotelLinenPolicyItem])}
                          onChange={(event) =>
                            updateLinen(linen.id, { [key]: event.target.checked } as Partial<HotelLinenPolicyItem>)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t border-gray-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateHousekeeping({
                      linens: [...draft.housekeeping.linens, createHotelLinenItem()],
                    })
                  }
                >
                  Nuova dotazione
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'rooms' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Servizi e dotazioni per tipo camera</CardTitle>
                <p className="text-sm text-gray-500">
                  Nei PMS hotel seri le amenities vengono legate ai tipi camera. Qui definisci i servizi visibili e le
                  dotazioni per ogni tipologia, e al salvataggio aggiorniamo anche le amenities pubbliche della camera.
                </p>
              </div>
              <Badge variant="outline">{draft.room_type_profiles.length} tipologie</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.room_type_profiles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                Crea prima almeno una tipologia camera dalla sezione Camere. Qui appariranno automaticamente per essere
                configurate in modo piu` professionale.
              </div>
            ) : (
              draft.room_type_profiles.map((profile) => (
                <div key={profile.room_type_id} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{profile.room_type_name}</p>
                      <p className="text-xs text-gray-500">
                        Le dotazioni selezionate qui vengono riportate anche nelle amenities del tipo camera.
                      </p>
                    </div>
                    <Badge variant="outline">{profile.amenity_codes.length} dotazioni</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Titolo pubblico"
                      value={profile.public_title}
                      onChange={(event) =>
                        updateRoomTypeProfile(profile.room_type_id, { public_title: event.target.value })
                      }
                    />
                    <Input
                      label="Zona housekeeping"
                      value={profile.housekeeping_zone}
                      onChange={(event) =>
                        updateRoomTypeProfile(profile.room_type_id, { housekeeping_zone: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Descrizione camera</label>
                    <textarea
                      className={textareaClassName}
                      value={profile.public_description}
                      onChange={(event) =>
                        updateRoomTypeProfile(profile.room_type_id, { public_description: event.target.value })
                      }
                      placeholder="Descrizione sintetica e commerciale della tipologia camera"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      ['guest_visible', 'Mostra nella scheda struttura'] as const,
                      ['turndown_eligible', 'Turn-down disponibile'] as const,
                      ['minibar_enabled', 'Minibar attivo'] as const,
                      ['pillow_menu_available', 'Menu cuscini disponibile'] as const,
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(profile[key as keyof HotelRoomTypeProfile])}
                          onChange={(event) =>
                            updateRoomTypeProfile(
                              profile.room_type_id,
                              { [key]: event.target.checked } as Partial<HotelRoomTypeProfile>
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Dotazioni camera</p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {roomFeatureDefinitions.map((feature) => {
                        const checked = profile.amenity_codes.includes(feature.code)
                        return (
                          <label
                            key={feature.code}
                            className={`rounded-lg border px-3 py-3 text-sm transition ${
                              checked
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const nextCodes = event.target.checked
                                    ? [...profile.amenity_codes, feature.code]
                                    : profile.amenity_codes.filter((code) => code !== feature.code)

                                  updateRoomTypeProfile(profile.room_type_id, { amenity_codes: nextCodes })
                                }}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                              />
                              <span>
                                <span className="block font-medium text-gray-900">{feature.label}</span>
                                <span className="mt-0.5 block text-xs leading-tight text-gray-500">
                                  {feature.description}
                                </span>
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">Suggerimenti hotel attivi per listing e canali</p>
                  <div className="flex flex-wrap gap-2">
                    {hotelSuggestionCodes.map((code) => (
                      <Badge key={code} variant="outline">{code}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4" />
          Salva configurazione hotel
        </Button>
      </div>
    </div>
  )
}

function HotelCommercialEditor<T extends HotelPropertyService | HotelAddonService>({
  item,
  kindOptions,
  onChange,
  onRemove,
  extraFields,
}: {
  item: T
  kindOptions: Array<{ value: string; label: string }>
  onChange: (patch: Partial<T>) => void
  onRemove: () => void
  extraFields?: ReactNode
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={item.is_active ? 'success' : 'outline'}>
              {item.is_active ? 'Attivo' : 'Disattivato'}
            </Badge>
            <Badge variant="outline">{item.charge_mode === 'paid' ? 'A pagamento' : 'Incluso'}</Badge>
            {item.channel_visible ? <Badge variant="outline">Allineabile ai canali</Badge> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome servizio" value={item.name} onChange={(event) => onChange({ name: event.target.value } as Partial<T>)} />
        <Select
          label="Tipo"
          value={String(item.kind)}
          onChange={(event) => onChange({ kind: event.target.value } as Partial<T>)}
          options={kindOptions}
        />
      </div>

      <Input
        label="Descrizione"
        value={item.description}
        onChange={(event) => onChange({ description: event.target.value } as Partial<T>)}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Addebito"
          value={item.charge_mode}
          onChange={(event) =>
            onChange({ charge_mode: event.target.value as HotelServiceChargeMode } as Partial<T>)
          }
          options={chargeOptions}
        />
        <Select
          label="Tariffazione"
          value={item.pricing_mode}
          onChange={(event) =>
            onChange({ pricing_mode: event.target.value as HotelServicePricingMode } as Partial<T>)
          }
          options={pricingOptions}
        />
        <Input
          label="Prezzo"
          type="number"
          value={String(item.price)}
          onChange={(event) => onChange({ price: Number(event.target.value) || 0 } as Partial<T>)}
        />
        <Input
          label="Preavviso (ore)"
          type="number"
          value={String(item.advance_notice_hours)}
          onChange={(event) =>
            onChange({ advance_notice_hours: Number(event.target.value) || 0 } as Partial<T>)
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="Quantita` inclusa"
          type="number"
          value={String(item.included_quantity)}
          onChange={(event) =>
            onChange({ included_quantity: Number(event.target.value) || 0 } as Partial<T>)
          }
        />
        <Input
          label="Quantita` massima"
          type="number"
          value={item.max_quantity == null ? '' : String(item.max_quantity)}
          onChange={(event) =>
            onChange({
              max_quantity: event.target.value === '' ? null : Number(event.target.value),
            } as Partial<T>)
          }
        />
        <Input
          label="Deposito"
          type="number"
          value={String(item.security_deposit)}
          onChange={(event) =>
            onChange({ security_deposit: Number(event.target.value) || 0 } as Partial<T>)
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['is_active', 'Attivo'] as const,
          ['guest_visible', "Visibile all'ospite"] as const,
          ['channel_visible', 'Usabile per allineamento canali'] as const,
          ['online_bookable', 'Prenotabile online'] as const,
          ['requires_request', 'Su richiesta'] as const,
          ['reservation_required', 'Richiede prenotazione'] as const,
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(item[key as keyof T])}
              onChange={(event) =>
                onChange({ [key]: event.target.checked } as Partial<T>)
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            {label}
          </label>
        ))}
      </div>

      {extraFields}
    </div>
  )
}
