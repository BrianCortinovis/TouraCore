'use client'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@touracore/ui'
import { useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BedDouble,
  ChefHat,
  ExternalLink,
  Plus,
  Save,
  Sparkles,
  Trash2,
  WashingMachine,
} from 'lucide-react'
import {
  applyManagedExtraAmenityKindDefaults,
  createManagedExtraAmenity,
  createManagedKitchenItem,
  createManagedLaundryService,
  createManagedLinenItem,
  createManagedPoolAccessory,
  createPropertyTypeModuleItem,
  getStructureOperationsSettings,
  getPropertyTypeModuleDefinitions,
  type ExtraAmenityType,
  type KitchenItemCategory,
  type LaundryServiceType,
  type LinenItemType,
  type ManagedExtraAmenity,
  type ManagedKitchenItem,
  type ManagedLaundryService,
  type ManagedLinenItem,
  type ManagedPoolAccessory,
  type StructureOperationsSettings,
  type PoolAccessoryType,
  type PropertyTypeModuleDefinition,
  type PropertyTypeModuleItem,
  type ServiceChargeMode,
  type ServicePricingMode,
} from '../../config/structure-operations'
import {
  buildOperationsSettingsPayload,
  getPropertyTypeOperationsProfile,
  getSharedOperationsCatalogPresentation,
  type SharedOperationsCatalogKey,
} from '../../config/property-operations'
import type { Json, Organization } from '../../types/database'

interface StructureOperationsSectionProps {
  org: Organization | null
  onSave: (data: Record<string, unknown>) => void
  isPending: boolean
}

const pricingOptions = [
  { value: 'per_stay', label: 'Per soggiorno' },
  { value: 'per_night', label: 'Per notte' },
  { value: 'per_day', label: 'Per giorno' },
  { value: 'per_hour', label: 'Per ora' },
  { value: 'per_guest', label: 'Per ospite' },
  { value: 'per_item', label: 'Per pezzo' },
]

const chargeOptions = [
  { value: 'free', label: 'Gratis' },
  { value: 'paid', label: 'A pagamento' },
]

const linenTypeOptions = [
  { value: 'bed_linen', label: 'Lenzuola' },
  { value: 'bath_linen', label: 'Asciugamani' },
  { value: 'beach_towel', label: 'Teli mare' },
  { value: 'pillows', label: 'Cuscini' },
  { value: 'blanket', label: 'Coperte' },
  { value: 'bathrobe', label: 'Accappatoio' },
  { value: 'slippers', label: 'Ciabattine' },
  { value: 'other', label: 'Altro' },
]

const laundryTypeOptions = [
  { value: 'washing_machine', label: 'Lavatrice' },
  { value: 'dryer', label: 'Asciugatrice' },
  { value: 'iron', label: 'Ferro da stiro' },
  { value: 'ironing_board', label: 'Asse da stiro' },
  { value: 'drying_rack', label: 'Stendibiancheria' },
  { value: 'laundry_service', label: 'Servizio lavanderia' },
  { value: 'detergent', label: 'Detersivo' },
  { value: 'other', label: 'Altro' },
]

const kitchenCategoryOptions = [
  { value: 'appliance', label: 'Elettrodomestico' },
  { value: 'small_appliance', label: 'Piccolo elettrodomestico' },
  { value: 'cookware', label: 'Pentole e padelle' },
  { value: 'tableware', label: 'Stoviglie e posate' },
  { value: 'other', label: 'Altro' },
]

const extraTypeOptions = [
  { value: 'spa', label: 'Spa' },
  { value: 'pool', label: 'Piscina' },
  { value: 'bike', label: 'Bici' },
  { value: 'parking', label: 'Parcheggio' },
  { value: 'breakfast', label: 'Colazione' },
  { value: 'gym', label: 'Fitness' },
  { value: 'beach_service', label: 'Servizio spiaggia' },
  { value: 'luggage_storage', label: 'Deposito bagagli' },
  { value: 'coworking', label: 'Spazio lavoro' },
  { value: 'ev_charger', label: 'Ricarica EV' },
  { value: 'bbq', label: 'Barbecue' },
  { value: 'baby_kit', label: 'Kit bimbo' },
  { value: 'pet_kit', label: 'Kit animali' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Altro' },
]

const textareaClassName =
  'min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

function defaultSharedCatalogLabel(key: SharedOperationsCatalogKey) {
  switch (key) {
    case 'linens':
      return 'Biancheria'
    case 'laundry':
      return 'Lavanderia'
    case 'kitchen':
      return 'Cucina'
    case 'extras':
    default:
      return 'Servizi Extra'
  }
}

function getSharedCatalogCount(key: SharedOperationsCatalogKey, draft: StructureOperationsSettings) {
  switch (key) {
    case 'linens':
      return draft.linens.length
    case 'laundry':
      return draft.laundry.length
    case 'kitchen':
      return draft.kitchen.length
    case 'extras':
    default:
      return draft.extras.length
  }
}

export function StructureOperationsSection({
  org,
  onSave,
  isPending,
}: StructureOperationsSectionProps) {
  const [activeTab, setActiveTab] = useState('linens')
  const [draft, setDraft] = useState<StructureOperationsSettings>(() =>
    getStructureOperationsSettings(org?.settings, org?.type ?? 'hotel')
  )

  if (!org || org.type === 'hotel') {
    return null
  }

  const currentOrg = org
  const operationsProfile = getPropertyTypeOperationsProfile(currentOrg.type)
  const moduleDefinitions = getPropertyTypeModuleDefinitions(currentOrg.type)
  const sharedCatalogTabs = (operationsProfile?.sharedCatalogs ?? []).map((catalogKey) => ({
    key: catalogKey,
    label:
      getSharedOperationsCatalogPresentation(currentOrg.type, catalogKey)?.label ??
      defaultSharedCatalogLabel(catalogKey),
    count: getSharedCatalogCount(catalogKey, draft),
  }))
  const tabs = [
    ...sharedCatalogTabs,
    ...moduleDefinitions.map((definition) => ({
      key: `module:${definition.key}`,
      label: definition.title,
      count: (draft.type_specific[definition.key] ?? []).length,
    })),
  ]

  const availableTabKeys = tabs.map((tab) => tab.key)
  const resolvedActiveTab = availableTabKeys.includes(activeTab) ? activeTab : availableTabKeys[0] ?? 'extras'

  function updateSettings(partial: Partial<StructureOperationsSettings>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  function updateLinen(id: string, patch: Partial<ManagedLinenItem>) {
    updateSettings({
      linens: draft.linens.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function updateLaundry(id: string, patch: Partial<ManagedLaundryService>) {
    updateSettings({
      laundry: draft.laundry.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function updateKitchen(id: string, patch: Partial<ManagedKitchenItem>) {
    updateSettings({
      kitchen: draft.kitchen.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function updateExtra(id: string, patch: Partial<ManagedExtraAmenity>) {
    updateSettings({
      extras: draft.extras.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function updateTypeSpecific(moduleKey: string, id: string, patch: Partial<PropertyTypeModuleItem>) {
    updateSettings({
      type_specific: {
        ...draft.type_specific,
        [moduleKey]: (draft.type_specific[moduleKey] ?? []).map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      },
    })
  }

  function handleSave() {
    onSave(
      buildOperationsSettingsPayload({
        currentSettings: currentOrg.settings,
        propertyType: currentOrg.type,
        sharedCatalogs: {
          linens: draft.linens as unknown as Json,
          laundry: draft.laundry as unknown as Json,
          kitchen: draft.kitchen as unknown as Json,
          extras: draft.extras as unknown as Json,
        },
        typeModule: draft.type_specific as unknown as Record<string, unknown>,
      })
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-2">
          <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                resolvedActiveTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  resolvedActiveTab === tab.key ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
          </div>
        </div>

        {resolvedActiveTab === 'linens' && (
          <CatalogCard
            title={getSharedOperationsCatalogPresentation(currentOrg.type, 'linens')?.title ?? 'Biancheria e tessili'}
            description={getSharedOperationsCatalogPresentation(currentOrg.type, 'linens')?.description ?? 'Gestisci biancheria casa, teli mare, cuscini extra e ricambi.'}
            badge={buildBadge(draft.linens)}
            icon={BedDouble}
            onAdd={() => updateSettings({ linens: [...draft.linens, createManagedLinenItem()] })}
          >
            {draft.linens.map((item) => (
              <ManagedLinenEditor
                key={item.id}
                item={item}
                onChange={(patch) => updateLinen(item.id, patch)}
                onRemove={() =>
                  updateSettings({
                    linens: draft.linens.filter((entry) => entry.id !== item.id),
                  })
                }
              />
            ))}
          </CatalogCard>
        )}

        {resolvedActiveTab === 'laundry' && (
          <CatalogCard
            title={getSharedOperationsCatalogPresentation(currentOrg.type, 'laundry')?.title ?? 'Servizi lavanderia'}
            description={getSharedOperationsCatalogPresentation(currentOrg.type, 'laundry')?.description ?? 'Lavatrice, asciugatrice e regole per un servizio lavanderia piu\' professionale.'}
            badge={buildBadge(draft.laundry)}
            icon={WashingMachine}
            onAdd={() => updateSettings({ laundry: [...draft.laundry, createManagedLaundryService()] })}
          >
            {draft.laundry.map((item) => (
              <ManagedLaundryEditor
                key={item.id}
                item={item}
                onChange={(patch) => updateLaundry(item.id, patch)}
                onRemove={() =>
                  updateSettings({
                    laundry: draft.laundry.filter((entry) => entry.id !== item.id),
                  })
                }
              />
            ))}
          </CatalogCard>
        )}

        {resolvedActiveTab === 'kitchen' && (
          <CatalogCard
            title={getSharedOperationsCatalogPresentation(currentOrg.type, 'kitchen')?.title ?? 'Dotazione cucina'}
            description={getSharedOperationsCatalogPresentation(currentOrg.type, 'kitchen')?.description ?? 'Elenco professionale di elettrodomestici, stoviglie e dotazioni presenti.'}
            badge={buildBadge(draft.kitchen)}
            icon={ChefHat}
            onAdd={() => updateSettings({ kitchen: [...draft.kitchen, createManagedKitchenItem()] })}
          >
            {draft.kitchen.map((item) => (
              <ManagedKitchenEditor
                key={item.id}
                item={item}
                onChange={(patch) => updateKitchen(item.id, patch)}
                onRemove={() =>
                  updateSettings({
                    kitchen: draft.kitchen.filter((entry) => entry.id !== item.id),
                  })
                }
              />
            ))}
          </CatalogCard>
        )}

        {resolvedActiveTab === 'extras' && (
          <CatalogCard
            title={getSharedOperationsCatalogPresentation(currentOrg.type, 'extras')?.title ?? 'Servizi extra struttura'}
            description={getSharedOperationsCatalogPresentation(currentOrg.type, 'extras')?.description ?? 'Spa, piscina, sdraio, ombrelloni, bici, parcheggi e altri servizi accessori con regole di vendita e prenotazione.'}
            badge={buildBadge(draft.extras)}
            icon={Sparkles}
            onAdd={() => updateSettings({ extras: [...draft.extras, createManagedExtraAmenity()] })}
            actions={
              <Link
                href="/settings/scheda-struttura"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                Apri scheda struttura
              </Link>
            }
          >
            {draft.extras.map((item) => (
              <ManagedExtraEditor
                key={item.id}
                item={item}
                onChange={(patch) => updateExtra(item.id, patch)}
                onRemove={() =>
                  updateSettings({
                    extras: draft.extras.filter((entry) => entry.id !== item.id),
                  })
                }
              />
            ))}
          </CatalogCard>
        )}

        {moduleDefinitions.map((definition) => {
          const tabKey = `module:${definition.key}`

          if (resolvedActiveTab !== tabKey) return null

          return (
            <CatalogCard
              key={definition.key}
              title={definition.title}
              description={definition.description}
              badge={buildBadge(draft.type_specific[definition.key] ?? [])}
              icon={Sparkles}
              onAdd={() =>
                updateSettings({
                  type_specific: {
                    ...draft.type_specific,
                    [definition.key]: [
                      ...(draft.type_specific[definition.key] ?? []),
                      createPropertyTypeModuleItem(definition.category_options[0]?.value ?? 'other'),
                    ],
                  },
                })
              }
            >
              {(draft.type_specific[definition.key] ?? []).map((item) => (
                <PropertyTypeModuleEditor
                  key={item.id}
                  definition={definition}
                  item={item}
                  onChange={(patch) => updateTypeSpecific(definition.key, item.id, patch)}
                  onRemove={() =>
                    updateSettings({
                      type_specific: {
                        ...draft.type_specific,
                        [definition.key]: (draft.type_specific[definition.key] ?? []).filter(
                          (entry) => entry.id !== item.id
                        ),
                      },
                    })
                  }
                />
              ))}
            </CatalogCard>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4" />
          Salva cataloghi struttura
        </Button>
      </div>
    </div>
  )
}

function ManagedLinenEditor({
  item,
  onChange,
  onRemove,
}: {
  item: ManagedLinenItem
  onChange: (patch: Partial<ManagedLinenItem>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <EditorHeader
        active={item.is_active}
        badges={[item.charge_mode === 'paid' ? 'A pagamento' : null]}
        onActiveChange={(checked) => onChange({ is_active: checked })}
        onRemove={onRemove}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome voce" value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Es. Telo mare premium" />
        <Select label="Tipo" value={item.kind} onChange={(event) => onChange({ kind: event.target.value as LinenItemType })} options={linenTypeOptions} />
      </div>

      <Input label="Descrizione" value={item.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Dettagli mostrati a staff o ospiti" />

      <ManagedServicePricingFields item={item} onChange={onChange} />
      <ManagedServiceCommercialFields item={item} onChange={onChange} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Quantita' inclusa" type="number" min={0} value={String(item.included_quantity)} onChange={(event) => onChange({ included_quantity: parseNumber(event.target.value) })} />
        <Input label="Quantita' massima" type="number" min={0} value={item.max_quantity === null ? '' : String(item.max_quantity)} onChange={(event) => onChange({ max_quantity: parseNullableNumber(event.target.value) })} placeholder="Illimitata" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField label="Disponibile solo su richiesta" checked={item.requires_request} onChange={(checked) => onChange({ requires_request: checked })} />
        <ToggleField label="Cambio incluso durante il soggiorno" checked={item.change_included} onChange={(checked) => onChange({ change_included: checked })} />
      </div>

      <TextareaField label="Note operative" value={item.notes} onChange={(value) => onChange({ notes: value })} placeholder="Es. sostituzione gratuita dopo 7 notti, addebito per smarrimento..." />
    </div>
  )
}

function ManagedLaundryEditor({
  item,
  onChange,
  onRemove,
}: {
  item: ManagedLaundryService
  onChange: (patch: Partial<ManagedLaundryService>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <EditorHeader
        active={item.is_active}
        badges={[item.self_service ? 'Self-service' : null]}
        onActiveChange={(checked) => onChange({ is_active: checked })}
        onRemove={onRemove}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome servizio" value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Es. Lavatrice appartamento 2" />
        <Select label="Tipo" value={item.kind} onChange={(event) => onChange({ kind: event.target.value as LaundryServiceType })} options={laundryTypeOptions} />
      </div>

      <Input label="Descrizione" value={item.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Dettagli sul servizio o sulle modalita' di utilizzo" />

      <ManagedServicePricingFields item={item} onChange={onChange} />
      <ManagedServiceCommercialFields item={item} onChange={onChange} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Quantita' inclusa" type="number" min={0} value={String(item.included_quantity)} onChange={(event) => onChange({ included_quantity: parseNumber(event.target.value) })} />
        <Input label="Quantita' massima" type="number" min={0} value={item.max_quantity === null ? '' : String(item.max_quantity)} onChange={(event) => onChange({ max_quantity: parseNullableNumber(event.target.value) })} placeholder="Illimitata" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ToggleField label="Su richiesta" checked={item.requires_request} onChange={(checked) => onChange({ requires_request: checked })} />
        <ToggleField label="Self-service" checked={item.self_service} onChange={(checked) => onChange({ self_service: checked })} />
        <ToggleField label="Prenotazione obbligatoria" checked={item.reservation_required} onChange={(checked) => onChange({ reservation_required: checked })} />
      </div>

      <TextareaField label="Note operative" value={item.notes} onChange={(value) => onChange({ notes: value })} placeholder="Es. fascia oraria, capienza, costo detersivo, ritiro in reception..." />
    </div>
  )
}

function ManagedKitchenEditor({
  item,
  onChange,
  onRemove,
}: {
  item: ManagedKitchenItem
  onChange: (patch: Partial<ManagedKitchenItem>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <EditorHeader
        active={item.is_active}
        badges={[item.included ? 'Incluso' : null]}
        onActiveChange={(checked) => onChange({ is_active: checked })}
        onRemove={onRemove}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Elemento" value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Es. Macchina caffe'" />
        <Select label="Categoria" value={item.category} onChange={(event) => onChange({ category: event.target.value as KitchenItemCategory })} options={kitchenCategoryOptions} />
        <Input label="Quantita'" type="number" min={0} value={String(item.quantity)} onChange={(event) => onChange({ quantity: parseNumber(event.target.value) })} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField label="Incluso nella dotazione standard" checked={item.included} onChange={(checked) => onChange({ included: checked })} />
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Utile per scheda struttura, inventario check-in/check-out e house rules.
        </div>
      </div>

      <TextareaField label="Note" value={item.notes} onChange={(value) => onChange({ notes: value })} placeholder="Es. presente solo in alcune unita', da controllare a check-out..." />
    </div>
  )
}

export function ManagedExtraEditor({
  item,
  onChange,
  onRemove,
}: {
  item: ManagedExtraAmenity
  onChange: (patch: Partial<ManagedExtraAmenity>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <EditorHeader
        active={item.is_active}
        badges={[item.guest_visible ? 'Visibile ospite' : null]}
        onActiveChange={(checked) => onChange({ is_active: checked })}
        onRemove={onRemove}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome servizio" value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Es. Accesso spa serale" />
        <Select
          label="Tipo"
          value={item.kind}
          onChange={(event) => {
            const nextKind = event.target.value as ExtraAmenityType
            onChange(applyManagedExtraAmenityKindDefaults(item, nextKind))
          }}
          options={extraTypeOptions}
        />
      </div>

      <Input label="Descrizione" value={item.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Dettagli mostrati in scheda struttura o in prenotazione" />

      <ManagedServicePricingFields item={item} onChange={onChange} />
      <ManagedServiceCommercialFields item={item} onChange={onChange} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Quantita' inclusa" type="number" min={0} value={String(item.included_quantity)} onChange={(event) => onChange({ included_quantity: parseNumber(event.target.value) })} />
        <Input label="Quantita' massima" type="number" min={0} value={item.max_quantity === null ? '' : String(item.max_quantity)} onChange={(event) => onChange({ max_quantity: parseNullableNumber(event.target.value) })} placeholder="Illimitata" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ToggleField label="Su richiesta" checked={item.requires_request} onChange={(checked) => onChange({ requires_request: checked })} />
        <ToggleField label="Prenotazione obbligatoria" checked={item.reservation_required} onChange={(checked) => onChange({ reservation_required: checked })} />
        <ToggleField label="Visibile all'ospite" checked={item.guest_visible} onChange={(checked) => onChange({ guest_visible: checked })} />
      </div>

      <TextareaField label="Note operative" value={item.notes} onChange={(value) => onChange({ notes: value })} placeholder="Es. orari di accesso, deposito richiesto, prenotazione con anticipo..." />

      {item.kind === 'pool' && (
        <PoolDetailsEditor
          poolDetails={
            item.pool_details ?? {
              opening_hours: '',
              heated: false,
              private_access: false,
              seasonal: true,
              children_friendly: true,
              accessories: [],
            }
          }
          onChange={(poolDetails) => onChange({ pool_details: poolDetails })}
        />
      )}

      {item.kind === 'spa' && item.spa_details && (
        <SpaDetailsEditor
          spaDetails={item.spa_details}
          onChange={(spaDetails) => onChange({ spa_details: spaDetails })}
        />
      )}

      {item.kind === 'bike' && item.bike_details && (
        <BikeDetailsEditor
          bikeDetails={item.bike_details}
          onChange={(bikeDetails) => onChange({ bike_details: bikeDetails })}
        />
      )}

      {(item.kind === 'parking' || item.kind === 'ev_charger') && item.parking_details && (
        <ParkingDetailsEditor
          parkingDetails={item.parking_details}
          onChange={(parkingDetails) => onChange({ parking_details: parkingDetails })}
        />
      )}

      {item.kind === 'transfer' && item.transfer_details && (
        <TransferDetailsEditor
          transferDetails={item.transfer_details}
          onChange={(transferDetails) => onChange({ transfer_details: transferDetails })}
        />
      )}

      {item.kind === 'baby_kit' && item.family_details && (
        <FamilyDetailsEditor
          familyDetails={item.family_details}
          onChange={(familyDetails) => onChange({ family_details: familyDetails })}
        />
      )}

      {item.kind === 'breakfast' && item.breakfast_details && (
        <BreakfastDetailsEditor
          breakfastDetails={item.breakfast_details}
          onChange={(breakfastDetails) => onChange({ breakfast_details: breakfastDetails })}
        />
      )}

      {item.kind === 'beach_service' && item.beach_details && (
        <BeachDetailsEditor
          beachDetails={item.beach_details}
          onChange={(beachDetails) => onChange({ beach_details: beachDetails })}
        />
      )}

      {item.kind === 'coworking' && item.workspace_details && (
        <WorkspaceDetailsEditor
          workspaceDetails={item.workspace_details}
          onChange={(workspaceDetails) => onChange({ workspace_details: workspaceDetails })}
        />
      )}
    </div>
  )
}

function PoolDetailsEditor({
  poolDetails,
  onChange,
}: {
  poolDetails: NonNullable<ManagedExtraAmenity['pool_details']>
  onChange: (poolDetails: NonNullable<ManagedExtraAmenity['pool_details']>) => void
}) {
  function updateAccessory(id: string, patch: Partial<ManagedPoolAccessory>) {
    onChange({
      ...poolDetails,
      accessories: poolDetails.accessories.map((accessory) =>
        accessory.id === id ? { ...accessory, ...patch } : accessory
      ),
    })
  }

  function removeAccessory(id: string) {
    onChange({
      ...poolDetails,
      accessories: poolDetails.accessories.filter((accessory) => accessory.id !== id),
    })
  }

  function addAccessory(kind: PoolAccessoryType) {
    onChange({
      ...poolDetails,
      accessories: [...poolDetails.accessories, createManagedPoolAccessory(kind)],
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-sky-900">Modulo piscina</p>
        <p className="text-sm text-sky-800">
          Gestisci dentro la piscina gli accessori collegati, come sdraio e ombrelloni, ognuno con
          le sue regole free o a pagamento.
        </p>
      </div>

      <Input
        label="Orari piscina"
        value={poolDetails.opening_hours}
        onChange={(event) =>
          onChange({
            ...poolDetails,
            opening_hours: event.target.value,
          })
        }
        placeholder="Es. 09:00 - 19:00"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ToggleField
          label="Piscina riscaldata"
          checked={poolDetails.heated}
          onChange={(checked) => onChange({ ...poolDetails, heated: checked })}
        />
        <ToggleField
          label="Accesso privato"
          checked={poolDetails.private_access}
          onChange={(checked) => onChange({ ...poolDetails, private_access: checked })}
        />
        <ToggleField
          label="Stagionale"
          checked={poolDetails.seasonal}
          onChange={(checked) => onChange({ ...poolDetails, seasonal: checked })}
        />
        <ToggleField
          label="Adatta ai bambini"
          checked={poolDetails.children_friendly}
          onChange={(checked) => onChange({ ...poolDetails, children_friendly: checked })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addAccessory('sunbed')}>
          <Plus className="h-4 w-4" />
          Aggiungi sdraio
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addAccessory('umbrella')}>
          <Plus className="h-4 w-4" />
          Aggiungi ombrellone
        </Button>
      </div>

      <div className="space-y-3">
        {poolDetails.accessories.map((accessory) => (
          <div key={accessory.id} className="space-y-4 rounded-xl border border-sky-100 bg-white p-4">
            <EditorHeader
              active={accessory.is_active}
              badges={[
                accessory.kind === 'sunbed' ? 'Sdraio' : 'Ombrellone',
                accessory.guest_visible ? 'Visibile ospite' : null,
              ]}
              onActiveChange={(checked) => updateAccessory(accessory.id, { is_active: checked })}
              onRemove={() => removeAccessory(accessory.id)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nome accessorio"
                value={accessory.name}
                onChange={(event) => updateAccessory(accessory.id, { name: event.target.value })}
                placeholder={accessory.kind === 'sunbed' ? 'Es. Sdraio premium' : 'Es. Ombrellone solarium'}
              />
              <Select
                label="Tipo accessorio"
                value={accessory.kind}
                onChange={(event) =>
                  updateAccessory(accessory.id, {
                    kind: event.target.value as PoolAccessoryType,
                  })
                }
                options={[
                  { value: 'sunbed', label: 'Sdraio' },
                  { value: 'umbrella', label: 'Ombrellone' },
                ]}
              />
            </div>

            <Input
              label="Descrizione"
              value={accessory.description}
              onChange={(event) => updateAccessory(accessory.id, { description: event.target.value })}
              placeholder="Dettagli dell'accessorio collegato alla piscina"
            />

      <ManagedServicePricingFields item={accessory} onChange={(patch) => updateAccessory(accessory.id, patch)} />
      <ManagedServiceCommercialFields item={accessory} onChange={(patch) => updateAccessory(accessory.id, patch)} />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Quantita' inclusa"
                type="number"
                min={0}
                value={String(accessory.included_quantity)}
                onChange={(event) =>
                  updateAccessory(accessory.id, { included_quantity: parseNumber(event.target.value) })
                }
              />
              <Input
                label="Quantita' massima"
                type="number"
                min={0}
                value={accessory.max_quantity === null ? '' : String(accessory.max_quantity)}
                onChange={(event) =>
                  updateAccessory(accessory.id, { max_quantity: parseNullableNumber(event.target.value) })
                }
                placeholder="Illimitata"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ToggleField
                label="Su richiesta"
                checked={accessory.requires_request}
                onChange={(checked) => updateAccessory(accessory.id, { requires_request: checked })}
              />
              <ToggleField
                label="Prenotazione obbligatoria"
                checked={accessory.reservation_required}
                onChange={(checked) => updateAccessory(accessory.id, { reservation_required: checked })}
              />
              <ToggleField
                label="Visibile all'ospite"
                checked={accessory.guest_visible}
                onChange={(checked) => updateAccessory(accessory.id, { guest_visible: checked })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpaDetailsEditor({
  spaDetails,
  onChange,
}: {
  spaDetails: NonNullable<ManagedExtraAmenity['spa_details']>
  onChange: (spaDetails: NonNullable<ManagedExtraAmenity['spa_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fuchsia-900">Modulo spa</p>
        <p className="text-sm text-fuchsia-800">
          Orari, privacy, trattamenti e regole di accesso per wellness professionale.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Orari spa"
          value={spaDetails.opening_hours}
          onChange={(event) => onChange({ ...spaDetails, opening_hours: event.target.value })}
          placeholder="Es. 10:00 - 20:00"
        />
        <Input
          label="Slot prenotazione (min)"
          type="number"
          min={0}
          value={spaDetails.slot_minutes === null ? '' : String(spaDetails.slot_minutes)}
          onChange={(event) => onChange({ ...spaDetails, slot_minutes: parseNullableNumber(event.target.value) })}
          placeholder="Es. 90"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ToggleField
          label="Adults only"
          checked={spaDetails.adults_only}
          onChange={(checked) => onChange({ ...spaDetails, adults_only: checked })}
        />
        <ToggleField
          label="Accesso privato"
          checked={spaDetails.private_access}
          onChange={(checked) => onChange({ ...spaDetails, private_access: checked })}
        />
        <ToggleField
          label="Trattamenti disponibili"
          checked={spaDetails.treatments_available}
          onChange={(checked) => onChange({ ...spaDetails, treatments_available: checked })}
        />
      </div>
    </div>
  )
}

function BikeDetailsEditor({
  bikeDetails,
  onChange,
}: {
  bikeDetails: NonNullable<ManagedExtraAmenity['bike_details']>
  onChange: (bikeDetails: NonNullable<ManagedExtraAmenity['bike_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-emerald-900">Modulo bici</p>
        <p className="text-sm text-emerald-800">
          Specifica e-bike, caschi, seggiolini e tour guidati per un noleggio piu` completo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ToggleField
          label="E-bike disponibili"
          checked={bikeDetails.e_bike}
          onChange={(checked) => onChange({ ...bikeDetails, e_bike: checked })}
        />
        <ToggleField
          label="Casco incluso"
          checked={bikeDetails.helmet_included}
          onChange={(checked) => onChange({ ...bikeDetails, helmet_included: checked })}
        />
        <ToggleField
          label="Seggiolino bimbo"
          checked={bikeDetails.child_seat}
          onChange={(checked) => onChange({ ...bikeDetails, child_seat: checked })}
        />
        <ToggleField
          label="Tour guidati"
          checked={bikeDetails.guided_tours}
          onChange={(checked) => onChange({ ...bikeDetails, guided_tours: checked })}
        />
      </div>
    </div>
  )
}

function ParkingDetailsEditor({
  parkingDetails,
  onChange,
}: {
  parkingDetails: NonNullable<ManagedExtraAmenity['parking_details']>
  onChange: (parkingDetails: NonNullable<ManagedExtraAmenity['parking_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">Modulo parcheggio</p>
        <p className="text-sm text-slate-700">
          Coperto, custodito, indoor o con ricarica EV: impostazioni utili anche nella scheda online.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ToggleField
          label="Coperto"
          checked={parkingDetails.covered}
          onChange={(checked) => onChange({ ...parkingDetails, covered: checked })}
        />
        <ToggleField
          label="Indoor / garage"
          checked={parkingDetails.indoor}
          onChange={(checked) => onChange({ ...parkingDetails, indoor: checked })}
        />
        <ToggleField
          label="Custodito"
          checked={parkingDetails.guarded}
          onChange={(checked) => onChange({ ...parkingDetails, guarded: checked })}
        />
        <ToggleField
          label="Ricarica EV"
          checked={parkingDetails.ev_charger}
          onChange={(checked) => onChange({ ...parkingDetails, ev_charger: checked })}
        />
        <ToggleField
          label="Targa richiesta"
          checked={parkingDetails.requires_plate}
          onChange={(checked) => onChange({ ...parkingDetails, requires_plate: checked })}
        />
      </div>
    </div>
  )
}

function TransferDetailsEditor({
  transferDetails,
  onChange,
}: {
  transferDetails: NonNullable<ManagedExtraAmenity['transfer_details']>
  onChange: (transferDetails: NonNullable<ManagedExtraAmenity['transfer_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900">Modulo transfer</p>
        <p className="text-sm text-amber-800">
          Definisci copertura aeroporto/stazione e se il servizio e` privato o andata/ritorno.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ToggleField
          label="Aeroporto"
          checked={transferDetails.airport_service}
          onChange={(checked) => onChange({ ...transferDetails, airport_service: checked })}
        />
        <ToggleField
          label="Stazione"
          checked={transferDetails.station_service}
          onChange={(checked) => onChange({ ...transferDetails, station_service: checked })}
        />
        <ToggleField
          label="Transfer privato"
          checked={transferDetails.private_transfer}
          onChange={(checked) => onChange({ ...transferDetails, private_transfer: checked })}
        />
        <ToggleField
          label="Andata e ritorno"
          checked={transferDetails.roundtrip}
          onChange={(checked) => onChange({ ...transferDetails, roundtrip: checked })}
        />
      </div>
    </div>
  )
}

function FamilyDetailsEditor({
  familyDetails,
  onChange,
}: {
  familyDetails: NonNullable<ManagedExtraAmenity['family_details']>
  onChange: (familyDetails: NonNullable<ManagedExtraAmenity['family_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-rose-900">Modulo family</p>
        <p className="text-sm text-rose-800">
          Gestisci i classici servizi family-friendly richiesti anche su Airbnb e Vrbo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ToggleField
          label="Culla"
          checked={familyDetails.crib}
          onChange={(checked) => onChange({ ...familyDetails, crib: checked })}
        />
        <ToggleField
          label="Seggiolone"
          checked={familyDetails.high_chair}
          onChange={(checked) => onChange({ ...familyDetails, high_chair: checked })}
        />
        <ToggleField
          label="Bagnetto bimbo"
          checked={familyDetails.baby_bath}
          onChange={(checked) => onChange({ ...familyDetails, baby_bath: checked })}
        />
        <ToggleField
          label="Passeggino"
          checked={familyDetails.stroller}
          onChange={(checked) => onChange({ ...familyDetails, stroller: checked })}
        />
      </div>
    </div>
  )
}

function BreakfastDetailsEditor({
  breakfastDetails,
  onChange,
}: {
  breakfastDetails: NonNullable<ManagedExtraAmenity['breakfast_details']>
  onChange: (breakfastDetails: NonNullable<ManagedExtraAmenity['breakfast_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-orange-200 bg-orange-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-orange-900">Modulo colazione</p>
        <p className="text-sm text-orange-800">
          Buffet, room service e opzioni alimentari dedicate per la scheda online e la prenotazione.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ToggleField
          label="Formula buffet"
          checked={breakfastDetails.buffet}
          onChange={(checked) => onChange({ ...breakfastDetails, buffet: checked })}
        />
        <ToggleField
          label="Servizio in camera"
          checked={breakfastDetails.in_room}
          onChange={(checked) => onChange({ ...breakfastDetails, in_room: checked })}
        />
        <ToggleField
          label="Opzioni alimentari"
          checked={breakfastDetails.dietary_options}
          onChange={(checked) => onChange({ ...breakfastDetails, dietary_options: checked })}
        />
      </div>
    </div>
  )
}

function BeachDetailsEditor({
  beachDetails,
  onChange,
}: {
  beachDetails: NonNullable<ManagedExtraAmenity['beach_details']>
  onChange: (beachDetails: NonNullable<ManagedExtraAmenity['beach_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-cyan-900">Modulo spiaggia</p>
        <p className="text-sm text-cyan-800">
          Perfetto per case vacanza e residence mare con servizi stagionali e teli inclusi.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ToggleField
          label="Area privata"
          checked={beachDetails.private_area}
          onChange={(checked) => onChange({ ...beachDetails, private_area: checked })}
        />
        <ToggleField
          label="Teli inclusi"
          checked={beachDetails.towels_included}
          onChange={(checked) => onChange({ ...beachDetails, towels_included: checked })}
        />
        <ToggleField
          label="Servizio stagionale"
          checked={beachDetails.seasonal}
          onChange={(checked) => onChange({ ...beachDetails, seasonal: checked })}
        />
      </div>
    </div>
  )
}

function WorkspaceDetailsEditor({
  workspaceDetails,
  onChange,
}: {
  workspaceDetails: NonNullable<ManagedExtraAmenity['workspace_details']>
  onChange: (workspaceDetails: NonNullable<ManagedExtraAmenity['workspace_details']>) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-indigo-900">Modulo workation</p>
        <p className="text-sm text-indigo-800">
          Desk, monitor e stampante per soggiorni business e remote work.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ToggleField
          label="Desk dedicato"
          checked={workspaceDetails.desk}
          onChange={(checked) => onChange({ ...workspaceDetails, desk: checked })}
        />
        <ToggleField
          label="Monitor"
          checked={workspaceDetails.monitor}
          onChange={(checked) => onChange({ ...workspaceDetails, monitor: checked })}
        />
        <ToggleField
          label="Stampante"
          checked={workspaceDetails.printer}
          onChange={(checked) => onChange({ ...workspaceDetails, printer: checked })}
        />
      </div>
    </div>
  )
}

function PropertyTypeModuleEditor({
  definition,
  item,
  onChange,
  onRemove,
}: {
  definition: PropertyTypeModuleDefinition
  item: PropertyTypeModuleItem
  onChange: (patch: Partial<PropertyTypeModuleItem>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <EditorHeader
        active={item.is_active}
        badges={[
          definition.category_options.find((option) => option.value === item.category)?.label ?? item.category,
          item.guest_visible ? 'Visibile ospite' : null,
        ]}
        onActiveChange={(checked) => onChange({ is_active: checked })}
        onRemove={onRemove}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label={`Nome ${definition.item_label}`} value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder={`Es. ${definition.item_label} premium`} />
        <Select label="Categoria" value={item.category} onChange={(event) => onChange({ category: event.target.value })} options={definition.category_options} />
      </div>

      <Input label="Descrizione" value={item.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Dettagli del servizio specifico per questa tipologia" />

      <ManagedServicePricingFields item={item} onChange={onChange} />
      <ManagedServiceCommercialFields item={item} onChange={onChange} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Quantita' inclusa" type="number" min={0} value={String(item.included_quantity)} onChange={(event) => onChange({ included_quantity: parseNumber(event.target.value) })} />
        <Input label="Quantita' massima" type="number" min={0} value={item.max_quantity === null ? '' : String(item.max_quantity)} onChange={(event) => onChange({ max_quantity: parseNullableNumber(event.target.value) })} placeholder="Illimitata" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ToggleField label="Su richiesta" checked={item.requires_request} onChange={(checked) => onChange({ requires_request: checked })} />
        <ToggleField label="Prenotazione obbligatoria" checked={item.reservation_required} onChange={(checked) => onChange({ reservation_required: checked })} />
        <ToggleField label="Visibile all'ospite" checked={item.guest_visible} onChange={(checked) => onChange({ guest_visible: checked })} />
      </div>

      <TextareaField label="Note operative" value={item.notes} onChange={(value) => onChange({ notes: value })} placeholder="Regole, limiti, disponibilita' o dettagli per lo staff." />
    </div>
  )
}

function CatalogCard({
  title,
  description,
  badge,
  icon: Icon,
  onAdd,
  actions,
  children,
}: {
  title: string
  description: string
  badge: string
  icon: ComponentType<{ className?: string }>
  onAdd: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-blue-600" />
              <CardTitle>{title}</CardTitle>
              <Badge variant="outline">{badge}</Badge>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button type="button" variant="outline" size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Aggiungi
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function EditorHeader({
  active,
  badges,
  onActiveChange,
  onRemove,
}: {
  active: boolean
  badges: Array<string | null>
  onActiveChange: (checked: boolean) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={active ? 'success' : 'secondary'}>{active ? 'Attivo' : 'Disattivo'}</Badge>
        {badges.filter(Boolean).map((badge) => (
          <Badge key={badge} variant="outline">
            {badge}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => onActiveChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          Attivo
        </label>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ManagedServicePricingFields({
  item,
  onChange,
}: {
  item: {
    charge_mode: ServiceChargeMode
    price: number
    pricing_mode: ServicePricingMode
  }
  onChange: (patch: {
    charge_mode?: ServiceChargeMode
    price?: number
    pricing_mode?: ServicePricingMode
  }) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Select
        label="Costo"
        value={item.charge_mode}
        onChange={(event) => {
          const chargeMode = event.target.value as ServiceChargeMode
          onChange({
            charge_mode: chargeMode,
            price: chargeMode === 'free' ? 0 : item.price,
          })
        }}
        options={chargeOptions}
      />
      <Input
        label="Prezzo"
        type="number"
        min={0}
        step="0.50"
        value={String(item.price)}
        onChange={(event) => onChange({ price: parseCurrencyNumber(event.target.value) })}
        disabled={item.charge_mode === 'free'}
      />
      <Select
        label="Tariffazione"
        value={item.pricing_mode}
        onChange={(event) => onChange({ pricing_mode: event.target.value as ServicePricingMode })}
        options={pricingOptions}
        disabled={item.charge_mode === 'free'}
      />
    </div>
  )
}

function ManagedServiceCommercialFields({
  item,
  onChange,
}: {
  item: {
    online_bookable: boolean
    advance_notice_hours: number
    security_deposit: number
  }
  onChange: (patch: {
    online_bookable?: boolean
    advance_notice_hours?: number
    security_deposit?: number
  }) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">Regole di prenotazione online</p>
        <p className="text-sm text-gray-500">
          Questi campi servono per decidere se il servizio e` vendibile online e con quali limiti.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="Preavviso minimo (ore)"
          type="number"
          min={0}
          value={String(item.advance_notice_hours)}
          onChange={(event) => onChange({ advance_notice_hours: parseNumber(event.target.value) })}
        />
        <Input
          label="Deposito servizio"
          type="number"
          min={0}
          step="0.50"
          value={String(item.security_deposit)}
          onChange={(event) => onChange({ security_deposit: parseCurrencyNumber(event.target.value) })}
        />
        <div className="flex items-end">
          <ToggleField
            label="Prenotabile online"
            checked={item.online_bookable}
            onChange={(checked) => onChange({ online_bookable: checked })}
          />
        </div>
      </div>
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600"
      />
      {label}
    </label>
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
    <div className="space-y-1">
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

function buildBadge(items: Array<{ is_active: boolean }>): string {
  const active = items.filter((item) => item.is_active).length
  return `${active}/${items.length} attivi`
}

function parseNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function parseCurrencyNumber(value: string): number {
  const normalized = value.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function parseNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
