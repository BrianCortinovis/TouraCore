import {
  getStructureOperationsSettings,
  getSharedExtraAmenitiesSettings,
  type ManagedExtraAmenity,
  type ManagedKitchenItem,
  type ManagedLaundryService,
  type ManagedLinenItem,
  type ManagedPoolAccessory,
  type StructureOperationsSettings,
  type PropertyTypeModuleItem,
  type ServicePricingMode,
} from './structure-operations'
import {
  getHotelOperationsSettings,
  getHotelRoomAmenityLabels,
  type HotelOperationsSettings,
  type HotelPropertyService,
  type HotelAddonService,
  type HotelLinenPolicyItem,
} from './hotel-operations'
import { getPropertyTypeOperationsProfile } from './property-operations'
import { getListingProfileSettings } from './property-listing'
import type { Json, PetPolicy, PropertyType } from '../types/database'

export interface DetailedPetPolicy extends PetPolicy {
  cleaning_fee?: number
  refundable_deposit?: number
  max_weight_kg?: number
  requires_leash_common_areas?: boolean
  cannot_be_left_alone?: boolean
  allowed_in_pool_area?: boolean
  allowed_in_outdoor_areas?: boolean
  allowed_in_restaurant_area?: boolean
  pet_kit_included?: boolean
  pet_kit_fee?: number
  advance_notice_required?: boolean
}

export type PropertyPreviewIcon =
  | 'bed'
  | 'bath'
  | 'sun'
  | 'moon'
  | 'washing-machine'
  | 'shirt'
  | 'chef-hat'
  | 'utensils'
  | 'sparkles'
  | 'bike'
  | 'car'
  | 'waves'
  | 'umbrella'
  | 'paw'
  | 'leaf'
  | 'shield'

export interface PropertyPreviewBadge {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'accent'
}

export interface PropertyPreviewItem {
  id: string
  title: string
  description: string
  icon: PropertyPreviewIcon
  price_label: string
  visibility_label?: string
  highlights: string[]
  badges: PropertyPreviewBadge[]
}

export interface PropertyPreviewSection {
  key: string
  title: string
  description: string
  items: PropertyPreviewItem[]
}

export interface PropertyPreviewStat {
  label: string
  value: string
}

export interface PropertyServicePreviewData {
  title: string
  subtitle: string
  stats: PropertyPreviewStat[]
  sections: PropertyPreviewSection[]
  hidden_item_count: number
}

type PreviewVisibility = 'all' | 'public'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

export function normalizeDetailedPetPolicy(policy: Json | null | undefined): DetailedPetPolicy {
  const record = isRecord(policy) ? policy : {}

  return {
    max_pets: toNumber(record.max_pets),
    allowed_sizes: toStringArray(record.allowed_sizes) as DetailedPetPolicy['allowed_sizes'],
    allowed_types: toStringArray(record.allowed_types) as DetailedPetPolicy['allowed_types'],
    fee_per_night: toNumber(record.fee_per_night),
    fee_per_stay: toNumber(record.fee_per_stay),
    requires_documentation: toBoolean(record.requires_documentation),
    pet_rules_text: typeof record.pet_rules_text === 'string' ? record.pet_rules_text : '',
    cleaning_fee: toNumber(record.cleaning_fee),
    refundable_deposit: toNumber(record.refundable_deposit),
    max_weight_kg: toNumber(record.max_weight_kg),
    requires_leash_common_areas: toBoolean(record.requires_leash_common_areas),
    cannot_be_left_alone: toBoolean(record.cannot_be_left_alone),
    allowed_in_pool_area: toBoolean(record.allowed_in_pool_area),
    allowed_in_outdoor_areas: toBoolean(record.allowed_in_outdoor_areas),
    allowed_in_restaurant_area: toBoolean(record.allowed_in_restaurant_area),
    pet_kit_included: toBoolean(record.pet_kit_included),
    pet_kit_fee: toNumber(record.pet_kit_fee),
    advance_notice_required: toBoolean(record.advance_notice_required),
  }
}

function formatPricingMode(mode: ServicePricingMode): string {
  switch (mode) {
    case 'per_day':
      return 'al giorno'
    case 'per_guest':
      return 'a ospite'
    case 'per_hour':
      return 'all\'ora'
    case 'per_item':
      return 'a pezzo'
    case 'per_night':
      return 'a notte'
    case 'per_stay':
    default:
      return 'a soggiorno'
  }
}

function formatPriceLabel(chargeMode: 'free' | 'paid', price: number, pricingMode: ServicePricingMode): string {
  if (chargeMode === 'free') return 'Gratis'
  return `Da EUR ${price.toFixed(2)} ${formatPricingMode(pricingMode)}`
}

function buildQuantityLabel(includedQuantity: number, maxQuantity: number | null): string | null {
  if (includedQuantity > 0 && maxQuantity && maxQuantity > includedQuantity) {
    return `${includedQuantity} inclusi, max ${maxQuantity}`
  }
  if (includedQuantity > 0) {
    return `${includedQuantity} inclusi`
  }
  if (maxQuantity && maxQuantity > 0) {
    return `Disponibilita' max ${maxQuantity}`
  }
  return null
}

function buildVisibilityLabel(visibleToGuest?: boolean, visibility: PreviewVisibility = 'all'): string | undefined {
  if (visibility === 'public' || typeof visibleToGuest === 'undefined') return undefined
  return visibleToGuest ? 'Visibile ospite' : 'Solo interno'
}

function compact(values: Array<string | null | undefined | false>): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

function linenIcon(item: ManagedLinenItem): PropertyPreviewIcon {
  if (item.kind === 'bath_linen') return 'bath'
  if (item.kind === 'beach_towel') return 'sun'
  if (item.kind === 'pillows' || item.kind === 'blanket' || item.kind === 'bathrobe' || item.kind === 'slippers') return 'moon'
  return 'bed'
}

function laundryIcon(item: ManagedLaundryService): PropertyPreviewIcon {
  if (item.kind === 'iron' || item.kind === 'ironing_board') return 'shirt'
  return 'washing-machine'
}

function extraIcon(item: ManagedExtraAmenity | PropertyTypeModuleItem): PropertyPreviewIcon {
  if ('kind' in item) {
    switch (item.kind) {
      case 'spa':
        return 'sparkles'
      case 'bike':
        return 'bike'
      case 'parking':
      case 'ev_charger':
        return 'car'
      case 'pool':
        return 'waves'
      case 'breakfast':
      case 'bbq':
        return 'chef-hat'
      case 'luggage_storage':
      case 'coworking':
        return 'shield'
      case 'pet_kit':
        return 'paw'
      default:
        return 'sparkles'
    }
  }

  const category = item.category.toLowerCase()
  if (category.includes('pool')) return 'waves'
  if (category.includes('parking')) return 'car'
  if (category.includes('garden') || category.includes('farm') || category.includes('animals')) return 'leaf'
  if (category.includes('wellness') || category.includes('breakfast')) return 'sparkles'
  return 'sparkles'
}

function poolAccessoryIcon(item: ManagedPoolAccessory): PropertyPreviewIcon {
  return item.kind === 'umbrella' ? 'umbrella' : 'sun'
}

function kitchenIcon(item: ManagedKitchenItem): PropertyPreviewIcon {
  if (item.category === 'tableware' || item.category === 'cookware') return 'utensils'
  return 'chef-hat'
}

function toPreviewItem(
  item: ManagedLinenItem | ManagedLaundryService | ManagedExtraAmenity | PropertyTypeModuleItem,
  icon: PropertyPreviewIcon,
  visibility: PreviewVisibility,
  visibleToGuest?: boolean
): PropertyPreviewItem {
  return {
    id: item.id,
    title: item.name,
    description: item.description,
    icon,
    price_label: formatPriceLabel(item.charge_mode, item.price, item.pricing_mode),
    visibility_label: buildVisibilityLabel(visibleToGuest, visibility),
    highlights: compact([
      buildQuantityLabel(item.included_quantity, item.max_quantity),
      item.requires_request ? 'Su richiesta' : 'Attivazione diretta',
      item.online_bookable ? 'Prenotabile online' : 'Solo PMS / staff',
      item.advance_notice_hours > 0 ? `Preavviso ${item.advance_notice_hours}h` : null,
      'reservation_required' in item && item.reservation_required ? 'Prenotazione richiesta' : null,
      'change_included' in item && item.change_included ? 'Cambio incluso' : null,
      'self_service' in item ? (item.self_service ? 'Self-service' : 'Gestito dallo staff') : null,
    ]),
    badges: compact([
      item.charge_mode === 'free' ? 'Incluso' : 'A pagamento',
      item.security_deposit > 0 ? `Deposito EUR ${item.security_deposit.toFixed(2)}` : null,
      item.notes ? 'Con note operative' : null,
    ]).map((label) => ({
      label,
      tone:
        label === 'Incluso'
          ? 'success'
          : label === 'A pagamento' || label.startsWith('Deposito EUR')
            ? 'warning'
            : 'neutral',
    })),
  }
}

function toKitchenPreviewItem(item: ManagedKitchenItem): PropertyPreviewItem {
  return {
    id: item.id,
    title: item.name,
    description: item.notes || 'Elemento disponibile nella dotazione della struttura.',
    icon: kitchenIcon(item),
    price_label: item.included ? 'Incluso nella dotazione' : 'Su richiesta',
    highlights: compact([
      `${item.quantity} disponibili`,
      item.included ? 'Pronto in struttura' : 'Da richiedere',
    ]),
    badges: [
      {
        label: item.included ? 'Standard' : 'Extra',
        tone: item.included ? 'success' : 'accent',
      },
    ],
  }
}

function toPoolAccessoryPreviewItem(
  poolName: string,
  item: ManagedPoolAccessory,
  visibility: PreviewVisibility
): PropertyPreviewItem {
  return {
    id: item.id,
    title: item.name,
    description: item.description || `Servizio collegato a ${poolName.toLowerCase()}.`,
    icon: poolAccessoryIcon(item),
    price_label: formatPriceLabel(item.charge_mode, item.price, item.pricing_mode),
    visibility_label: buildVisibilityLabel(item.guest_visible, visibility),
    highlights: compact([
      buildQuantityLabel(item.included_quantity, item.max_quantity),
      item.requires_request ? 'Su richiesta' : 'Disponibile in area piscina',
      item.reservation_required ? 'Prenotazione richiesta' : null,
      `Collegato a ${poolName}`,
    ]),
    badges: [
      {
        label: item.kind === 'umbrella' ? 'Accessorio piscina' : 'Solarium',
        tone: 'accent',
      },
      ...compact([item.charge_mode === 'free' ? 'Incluso' : 'A pagamento']).map((label) => ({
        label,
        tone: label === 'Incluso' ? ('success' as const) : ('warning' as const),
      })),
    ],
  }
}

function createPetPreviewItem(policy: DetailedPetPolicy): PropertyPreviewItem {
  const allowedTypes = (policy.allowed_types ?? []).map((type) =>
    type === 'dog' ? 'Cani' : type === 'cat' ? 'Gatti' : 'Altri animali'
  )
  const allowedSizes = (policy.allowed_sizes ?? []).map((size) =>
    size === 'small' ? 'Taglia piccola' : size === 'medium' ? 'Taglia media' : 'Taglia grande'
  )

  const priceParts = compact([
    typeof policy.fee_per_night === 'number' && policy.fee_per_night > 0
      ? `EUR ${policy.fee_per_night.toFixed(2)} a notte`
      : null,
    typeof policy.fee_per_stay === 'number' && policy.fee_per_stay > 0
      ? `EUR ${policy.fee_per_stay.toFixed(2)} a soggiorno`
      : null,
    typeof policy.cleaning_fee === 'number' && policy.cleaning_fee > 0
      ? `Pulizia finale EUR ${policy.cleaning_fee.toFixed(2)}`
      : null,
  ])

  return {
    id: 'pet-policy',
    title: 'Animali ammessi',
    description:
      policy.pet_rules_text?.trim() ||
      'La struttura accetta animali con regole operative visibili in prenotazione e in PMS.',
    icon: 'paw',
    price_label: priceParts.length > 0 ? priceParts.join(' + ') : 'Pet friendly',
    highlights: compact([
      typeof policy.max_pets === 'number' ? `Max ${policy.max_pets} per prenotazione` : null,
      allowedTypes.length > 0 ? allowedTypes.join(', ') : null,
      allowedSizes.length > 0 ? allowedSizes.join(', ') : null,
      typeof policy.max_weight_kg === 'number' ? `Fino a ${policy.max_weight_kg} kg` : null,
      policy.pet_kit_included ? 'Kit animali disponibile' : null,
      policy.advance_notice_required ? 'Preavviso richiesto' : null,
      policy.requires_documentation ? 'Documentazione sanitaria richiesta' : null,
      policy.requires_leash_common_areas ? 'Guinzaglio nelle aree comuni' : null,
      policy.cannot_be_left_alone ? 'Animali non lasciabili soli' : null,
    ]),
    badges: compact([
      policy.allowed_in_outdoor_areas ? 'Accesso aree esterne' : null,
      policy.allowed_in_pool_area ? 'Accesso area piscina' : null,
      policy.allowed_in_restaurant_area ? 'Accesso area ristorazione' : null,
      typeof policy.refundable_deposit === 'number' && policy.refundable_deposit > 0
        ? `Deposito EUR ${policy.refundable_deposit.toFixed(2)}`
        : null,
      typeof policy.pet_kit_fee === 'number' && policy.pet_kit_fee > 0
        ? `Kit EUR ${policy.pet_kit_fee.toFixed(2)}`
        : null,
    ]).map((label) => ({
      label,
      tone: label.includes('Deposito') || label.includes('EUR') ? 'warning' : 'accent',
    })),
  }
}

function shouldIncludeVisibility(visibleToGuest: boolean | undefined, visibility: PreviewVisibility) {
  if (visibility === 'all') return true
  return visibleToGuest !== false
}

export function buildPropertyServicePreviewData({
  propertyName,
  propertyType,
  settings,
  operations,
  petsAllowed,
  petPolicy,
  visibility = 'all',
}: {
  propertyName?: string | null
  propertyType: PropertyType
  settings?: Json | null | undefined
  operations?: StructureOperationsSettings | HotelOperationsSettings
  petsAllowed: boolean
  petPolicy?: Json | null | undefined
  visibility?: PreviewVisibility
}): PropertyServicePreviewData {
  const listingProfile = getListingProfileSettings(settings)
  const normalizedPetPolicy = normalizeDetailedPetPolicy(petPolicy)

  if (propertyType === 'hotel') {
    const hotelData =
      (operations as HotelOperationsSettings | undefined) ??
      getHotelOperationsSettings(settings)
    const sharedExtras = getSharedExtraAmenitiesSettings(settings)

    const hotelSections: PropertyPreviewSection[] = []

    const sharedExtraItems = sharedExtras
      .filter((item) => item.is_active && shouldIncludeVisibility(item.guest_visible, visibility))
      .flatMap((item) => {
        const previewItems = [toPreviewItem(item, extraIcon(item), visibility, item.guest_visible)]

        if (item.kind === 'pool' && item.pool_details?.accessories?.length) {
          const accessoryItems = item.pool_details.accessories
            .filter((accessory) => accessory.is_active && shouldIncludeVisibility(accessory.guest_visible, visibility))
            .map((accessory) => toPoolAccessoryPreviewItem(item.name, accessory, visibility))

          previewItems[0] = {
            ...previewItems[0]!,
            highlights: [
              ...previewItems[0]!.highlights,
              ...(item.pool_details.opening_hours ? [`Orari ${item.pool_details.opening_hours}`] : []),
              ...(item.pool_details.heated ? ['Piscina riscaldata'] : []),
              ...(item.pool_details.private_access ? ['Accesso privato'] : []),
              ...(item.pool_details.seasonal ? ['Stagionale'] : ['Aperta tutto l\'anno']),
              ...(item.pool_details.children_friendly ? ['Family friendly'] : []),
            ],
          }

          return [...previewItems, ...accessoryItems]
        }

        return previewItems
      })

    if (sharedExtraItems.length > 0) {
      hotelSections.push({
        key: 'hotel-shared-services',
        title: 'Servizi struttura',
        description: 'Piscina, spa, parcheggio, transfer e altri servizi ospite della struttura.',
        items: sharedExtraItems,
      })
    }

    const hotelServices = hotelData.property_services
      .filter((item) => item.is_active && shouldIncludeVisibility(item.guest_visible, visibility))
      .map((item) => toHotelServicePreviewItem(item))

    if (hotelServices.length > 0) {
      hotelSections.push({
        key: 'hotel-services',
        title: 'Servizi hotel',
        description: 'Reception, wellness, room service e servizi comuni della struttura.',
        items: hotelServices,
      })
    }

    const hotelAddons = hotelData.sellable_addons
      .filter((item) => item.is_active && shouldIncludeVisibility(item.guest_visible, visibility))
      .map((item) => toHotelAddonPreviewItem(item))

    if (hotelAddons.length > 0) {
      hotelSections.push({
        key: 'hotel-addons',
        title: 'Extra prenotabili',
        description: 'Servizi vendibili separatamente e addebitabili nel folio.',
        items: hotelAddons,
      })
    }

    const housekeepingItems = hotelData.housekeeping.linens
      .filter((item) => item.is_active)
      .map((item) => toHotelLinenPreviewItem(item, hotelData.housekeeping))

    if (housekeepingItems.length > 0) {
      hotelSections.push({
        key: 'hotel-housekeeping',
        title: 'Housekeeping e biancheria',
        description: 'Cambi programmati, dotazioni camera e regole di servizio alberghiero.',
        items: housekeepingItems,
      })
    }

    const roomTypeItems = hotelData.room_type_profiles
      .filter((profile) => profile.guest_visible || visibility === 'all')
      .map((profile) => ({
        id: profile.room_type_id,
        title: profile.public_title || profile.room_type_name,
        description: profile.public_description || 'Tipologia camera configurata nel PMS.',
        icon: 'bed' as const,
        price_label: 'Tipologia camera',
        visibility_label: visibility === 'all' ? (profile.guest_visible ? 'Visibile ospite' : 'Solo interno') : undefined,
        highlights: compact([
          profile.housekeeping_zone ? `Zona ${profile.housekeeping_zone}` : null,
          profile.turndown_eligible ? 'Turn-down disponibile' : null,
          profile.minibar_enabled ? 'Minibar attivo' : null,
          profile.pillow_menu_available ? 'Menu cuscini' : null,
          ...getHotelRoomAmenityLabels(profile.amenity_codes).slice(0, 4),
        ]),
        badges: [
          { label: `${profile.amenity_codes.length} dotazioni`, tone: 'neutral' as const },
        ],
      }))

    if (roomTypeItems.length > 0) {
      hotelSections.push({
        key: 'hotel-room-types',
        title: 'Tipologie camera',
        description: 'Dotazioni e servizi associati alle tipologie camera dell’hotel.',
        items: roomTypeItems,
      })
    }

    if (petsAllowed) {
      hotelSections.push({
        key: 'pets',
        title: 'Animali',
        description: 'Policy completa animali per booking engine, check-in e PMS.',
        items: [createPetPreviewItem(normalizedPetPolicy)],
      })
    }

    const totalItems = hotelSections.reduce((sum, section) => sum + section.items.length, 0)
    const paidItems = hotelSections.reduce(
      (sum, section) =>
        sum +
        section.items.filter((item) => item.price_label !== 'Gratis' && item.price_label !== 'Tipologia camera' && item.price_label !== 'Pet friendly').length,
      0
    )
    const includedItems = hotelSections.reduce(
      (sum, section) =>
        sum +
        section.items.filter((item) =>
          item.badges.some((badge) => badge.label === 'Incluso' || badge.label === 'Standard')
        ).length,
      0
    )

    return {
      title:
        listingProfile.public_title.trim() ||
        propertyName?.trim() ||
        'Scheda struttura',
      subtitle:
        listingProfile.short_description.trim() ||
        (visibility === 'public'
          ? 'Preview pubblicabile in stile portale delle dotazioni hotel e dei servizi prenotabili.'
          : 'Preview interna live basata sui servizi hotel attivi configurati nel PMS.'),
      stats: [
        { label: 'Servizi attivi', value: String(totalItems) },
        { label: 'Inclusi', value: String(includedItems) },
        { label: 'A pagamento', value: String(paidItems) },
        { label: 'Pet friendly', value: petsAllowed ? 'Si' : 'No' },
      ],
      sections: hotelSections,
      hidden_item_count: 0,
    }
  }

  const data = (operations as StructureOperationsSettings | undefined) ?? getStructureOperationsSettings(settings, propertyType)
  const profile = getPropertyTypeOperationsProfile(propertyType)
  const sharedCatalogs = new Set(profile?.sharedCatalogs ?? [])

  const hiddenItems =
    (sharedCatalogs.has('extras')
      ? data.extras.filter((item) => item.is_active && item.guest_visible === false).length +
        data.extras.reduce(
          (sum, item) =>
            sum +
            (item.kind === 'pool'
              ? (item.pool_details?.accessories.filter(
                  (accessory) => accessory.is_active && accessory.guest_visible === false
                ).length ?? 0)
              : 0),
          0
        )
      : 0) +
    Object.values(data.type_specific).flat().filter((item) => item.is_active && item.guest_visible === false).length

  const sections: PropertyPreviewSection[] = []

  const linens = sharedCatalogs.has('linens')
    ? data.linens.filter((item) => item.is_active).map((item) => toPreviewItem(item, linenIcon(item), visibility))
    : []
  if (linens.length > 0) {
    sections.push({
      key: 'linens',
      title: profile?.sharedCatalogPresentation.linens?.title ?? 'Biancheria e comfort',
      description: profile?.sharedCatalogPresentation.linens?.description ?? 'Set tessili, ricambi, cuscini e dotazioni da soggiorno.',
      items: linens,
    })
  }

  const laundry = sharedCatalogs.has('laundry')
    ? data.laundry.filter((item) => item.is_active).map((item) => toPreviewItem(item, laundryIcon(item), visibility))
    : []
  if (laundry.length > 0) {
    sections.push({
      key: 'laundry',
      title: profile?.sharedCatalogPresentation.laundry?.title ?? 'Lavanderia',
      description: profile?.sharedCatalogPresentation.laundry?.description ?? 'Servizi self-service o gestiti dallo staff.',
      items: laundry,
    })
  }

  const kitchen = sharedCatalogs.has('kitchen')
    ? data.kitchen.filter((item) => item.is_active).map((item) => toKitchenPreviewItem(item))
    : []
  if (kitchen.length > 0) {
    sections.push({
      key: 'kitchen',
      title: profile?.sharedCatalogPresentation.kitchen?.title ?? 'Dotazione cucina',
      description: profile?.sharedCatalogPresentation.kitchen?.description ?? 'Elettrodomestici, stoviglie e dotazioni operative.',
      items: kitchen,
    })
  }

  const extras = sharedCatalogs.has('extras')
    ? data.extras
      .filter((item) => item.is_active && shouldIncludeVisibility(item.guest_visible, visibility))
      .flatMap((item) => {
      const previewItems = [toPreviewItem(item, extraIcon(item), visibility, item.guest_visible)]

      if (item.kind === 'pool' && item.pool_details?.accessories?.length) {
        const accessoryItems = item.pool_details.accessories
          .filter((accessory) => accessory.is_active && shouldIncludeVisibility(accessory.guest_visible, visibility))
          .map((accessory) => toPoolAccessoryPreviewItem(item.name, accessory, visibility))

        if (item.pool_details.opening_hours) {
          previewItems[0] = {
            ...previewItems[0]!,
            highlights: [...previewItems[0]!.highlights, `Orari ${item.pool_details.opening_hours}`],
          }
        }

        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.pool_details.heated ? ['Piscina riscaldata'] : []),
            ...(item.pool_details.private_access ? ['Accesso privato'] : []),
            ...(item.pool_details.seasonal ? ['Stagionale'] : ['Aperta tutto l\'anno']),
            ...(item.pool_details.children_friendly ? ['Family friendly'] : []),
          ],
        }

        return [...previewItems, ...accessoryItems]
      }

      if (item.kind === 'spa' && item.spa_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.spa_details.opening_hours ? [`Orari ${item.spa_details.opening_hours}`] : []),
            ...(item.spa_details.adults_only ? ['Adults only'] : []),
            ...(item.spa_details.private_access ? ['Accesso privato'] : []),
            ...(item.spa_details.treatments_available ? ['Trattamenti prenotabili'] : []),
            ...(item.spa_details.slot_minutes ? [`Slot ${item.spa_details.slot_minutes} min`] : []),
          ],
        }
      }

      if (item.kind === 'bike' && item.bike_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.bike_details.e_bike ? ['E-bike disponibili'] : []),
            ...(item.bike_details.helmet_included ? ['Casco incluso'] : []),
            ...(item.bike_details.child_seat ? ['Seggiolino bimbo'] : []),
            ...(item.bike_details.guided_tours ? ['Tour guidati'] : []),
          ],
        }
      }

      if ((item.kind === 'parking' || item.kind === 'ev_charger') && item.parking_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.parking_details.covered ? ['Parcheggio coperto'] : []),
            ...(item.parking_details.indoor ? ['Indoor / garage'] : []),
            ...(item.parking_details.guarded ? ['Custodito'] : []),
            ...(item.parking_details.ev_charger ? ['Ricarica EV'] : []),
            ...(item.parking_details.requires_plate ? ['Targa richiesta'] : []),
          ],
        }
      }

      if (item.kind === 'transfer' && item.transfer_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.transfer_details.airport_service ? ['Servizio aeroporto'] : []),
            ...(item.transfer_details.station_service ? ['Servizio stazione'] : []),
            ...(item.transfer_details.private_transfer ? ['Transfer privato'] : []),
            ...(item.transfer_details.roundtrip ? ['Andata e ritorno'] : []),
          ],
        }
      }

      if (item.kind === 'baby_kit' && item.family_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.family_details.crib ? ['Culla disponibile'] : []),
            ...(item.family_details.high_chair ? ['Seggiolone'] : []),
            ...(item.family_details.baby_bath ? ['Bagnetto bimbo'] : []),
            ...(item.family_details.stroller ? ['Passeggino'] : []),
          ],
        }
      }

      if (item.kind === 'breakfast' && item.breakfast_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.breakfast_details.buffet ? ['Formula buffet'] : []),
            ...(item.breakfast_details.in_room ? ['Servizio in camera'] : []),
            ...(item.breakfast_details.dietary_options ? ['Opzioni alimentari'] : []),
          ],
        }
      }

      if (item.kind === 'beach_service' && item.beach_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.beach_details.private_area ? ['Area privata'] : []),
            ...(item.beach_details.towels_included ? ['Teli inclusi'] : []),
            ...(item.beach_details.seasonal ? ['Servizio stagionale'] : ['Disponibile tutto l\'anno']),
          ],
        }
      }

      if (item.kind === 'coworking' && item.workspace_details) {
        previewItems[0] = {
          ...previewItems[0]!,
          highlights: [
            ...previewItems[0]!.highlights,
            ...(item.workspace_details.desk ? ['Desk dedicato'] : []),
            ...(item.workspace_details.monitor ? ['Monitor'] : []),
            ...(item.workspace_details.printer ? ['Stampante'] : []),
          ],
        }
      }

      return previewItems
    })
    : []
  if (extras.length > 0) {
    sections.push({
      key: 'extras',
      title: profile?.sharedCatalogPresentation.extras?.title ?? 'Servizi extra',
      description: profile?.sharedCatalogPresentation.extras?.description ?? 'Wellness, mobilita\', piscina e servizi accessori.',
      items: extras,
    })
  }

  const typeSpecificItems = Object.entries(data.type_specific)
    .flatMap(([moduleKey, items]) =>
      items
        .filter((item) => item.is_active && shouldIncludeVisibility(item.guest_visible, visibility))
        .map((item) => ({ moduleKey, item }))
    )

  if (typeSpecificItems.length > 0) {
    sections.push({
      key: 'type-specific',
      title: 'Servizi della tipologia',
      description: `Dettagli proprietari per la tipologia ${propertyType}.`,
      items: typeSpecificItems.map(({ moduleKey, item }) => ({
        ...toPreviewItem(item, extraIcon(item), visibility, item.guest_visible),
        badges: [
          { label: moduleKey.replace(/_/g, ' '), tone: 'accent' as const },
          ...toPreviewItem(item, extraIcon(item), visibility, item.guest_visible).badges,
        ],
      })),
    })
  }

  if (petsAllowed) {
    sections.push({
      key: 'pets',
      title: 'Animali',
      description: 'Policy completa animali per booking engine, check-in e PMS.',
      items: [createPetPreviewItem(normalizedPetPolicy)],
    })
  }

  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0)
  const paidItems = sections.reduce(
    (sum, section) =>
      sum +
      section.items.filter((item) => item.price_label !== 'Gratis' && item.price_label !== 'Incluso nella dotazione' && item.price_label !== 'Pet friendly').length,
    0
  )
  const includedItems = sections.reduce(
    (sum, section) =>
      sum +
      section.items.filter((item) =>
        item.badges.some((badge) => badge.label === 'Incluso' || badge.label === 'Standard')
      ).length,
    0
  )

  return {
    title:
      listingProfile.public_title.trim() ||
      propertyName?.trim() ||
      'Scheda struttura',
    subtitle:
      listingProfile.short_description.trim() ||
      (visibility === 'public'
        ? 'Preview pubblicabile in stile booking dei servizi visibili agli ospiti.'
        : 'Preview interna live basata sui servizi attivi configurati nel PMS.'),
    stats: [
      { label: 'Servizi attivi', value: String(totalItems) },
      { label: 'Inclusi', value: String(includedItems) },
      { label: 'A pagamento', value: String(paidItems) },
      { label: 'Pet friendly', value: petsAllowed ? 'Si' : 'No' },
    ],
    sections,
    hidden_item_count: visibility === 'all' ? hiddenItems : 0,
  }
}

function toHotelServicePreviewItem(item: HotelPropertyService): PropertyPreviewItem {
  return {
    id: item.id,
    title: item.name,
    description: item.description,
    icon: extraIcon({ category: item.kind, ...item } as unknown as PropertyTypeModuleItem),
    price_label: formatPriceLabel(item.charge_mode, item.price, item.pricing_mode),
    highlights: compact([
      item.requires_request ? 'Su richiesta' : 'Disponibile',
      item.online_bookable ? 'Prenotabile online' : null,
      item.reservation_required ? 'Richiede prenotazione' : null,
      item.advance_notice_hours > 0 ? `Preavviso ${item.advance_notice_hours}h` : null,
    ]),
    badges: compact([
      item.charge_mode === 'free' ? 'Incluso' : 'A pagamento',
      item.channel_visible ? 'Canali / annuncio' : null,
    ]).map((label) => ({ label, tone: label === 'Incluso' ? 'success' as const : 'accent' as const })),
  }
}

function toHotelAddonPreviewItem(item: HotelAddonService): PropertyPreviewItem {
  return {
    id: item.id,
    title: item.name,
    description: item.description,
    icon: extraIcon({ category: item.kind, ...item } as unknown as PropertyTypeModuleItem),
    price_label: formatPriceLabel(item.charge_mode, item.price, item.pricing_mode),
    highlights: compact([
      item.booking_engine_visible ? 'Visibile nel booking engine' : 'Solo PMS / front office',
      item.online_bookable ? 'Prenotabile online' : null,
      item.reservation_required ? 'Richiede conferma' : null,
      item.folio_group ? `Folio ${item.folio_group}` : null,
    ]),
    badges: compact([
      item.charge_mode === 'free' ? 'Incluso' : 'A pagamento',
      item.channel_visible ? 'Pronto per annuncio' : null,
    ]).map((label) => ({ label, tone: label === 'Incluso' ? 'success' as const : 'warning' as const })),
  }
}

function toHotelLinenPreviewItem(
  item: HotelLinenPolicyItem,
  housekeeping: HotelOperationsSettings['housekeeping']
): PropertyPreviewItem {
  return {
    id: item.id,
    title: item.name,
    description: item.notes || 'Dotazione housekeeping e biancheria hotel.',
    icon: item.kind === 'bath_linen' || item.kind === 'bathrobe' || item.kind === 'slippers' ? 'bath' : 'bed',
    price_label: item.charge_mode === 'free'
      ? 'Incluso nella dotazione'
      : formatPriceLabel(item.charge_mode, item.price, item.pricing_mode),
    highlights: compact([
      `${item.quantity_per_room} per camera`,
      `Par level ${item.par_level}`,
      item.on_request ? 'Su richiesta' : 'Standard camera',
      item.kind === 'bath_linen' ? `Cambio ogni ${housekeeping.change_towels_every_days} gg` : null,
      item.kind === 'bed_linen' ? `Cambio ogni ${housekeeping.change_linens_every_days} gg` : null,
    ]),
    badges: compact([
      item.included ? 'Standard' : null,
      housekeeping.daily_service_included ? 'Servizio giornaliero' : null,
      housekeeping.turndown_available ? 'Turn-down' : null,
    ]).map((label) => ({ label, tone: 'neutral' as const })),
  }
}
