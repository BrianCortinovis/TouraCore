import type { PropertyType } from './property-types'
import { getPropertyTypeConfig, getEffectiveCompliance } from './property-types'

// ---------------------------------------------------------------------------
// Sezioni sidebar
// ---------------------------------------------------------------------------

export type SidebarSection =
  | 'overview'
  | 'planning'
  | 'bookings'
  | 'check-in'
  | 'check-out'
  | 'guests'
  | 'rooms'
  | 'room-types'
  | 'room-blocks'
  | 'rate-plans'
  | 'seasons'
  | 'communications'
  | 'booking-engine'
  | 'media'
  | 'financials'
  | 'invoices'
  | 'compliance-alloggiati'
  | 'compliance-tourist-tax'
  | 'compliance-istat'
  | 'settings'
  | 'restaurant'
  | 'housekeeping'
  | 'self-checkin'
  | 'services'
  | 'channels'
  | 'reports'

// ---------------------------------------------------------------------------
// Gruppi navigazione (stile Gest)
// ---------------------------------------------------------------------------

export interface NavGroup {
  key: string
  label: string
  sections: SidebarSection[]
}

export function getNavigation(
  propertyType: PropertyType,
  isImprenditoriale: boolean,
  country: string
): NavGroup[] {
  const config = getPropertyTypeConfig(propertyType)
  const nav = config.navigation
  const compliance = getEffectiveCompliance(propertyType, isImprenditoriale)
  const isIT = country === 'IT'

  const groups: NavGroup[] = [
    {
      key: 'principale',
      label: 'Principale',
      sections: ['overview', 'planning'],
    },
    {
      key: 'ricevimento',
      label: 'Ricevimento',
      sections: [
        'bookings',
        'check-in',
        'check-out',
        'guests',
        ...(config.hasRoomTypes ? ['room-types' as SidebarSection] : []),
        ...(config.hasRooms ? ['rooms' as SidebarSection, 'room-blocks' as SidebarSection] : []),
        ...(nav.showSelfCheckin ? ['self-checkin' as SidebarSection] : []),
      ],
    },
    {
      key: 'commerciale',
      label: 'Commerciale',
      sections: [
        ...(config.hasRatePlans ? ['rate-plans' as SidebarSection] : []),
        ...(config.hasSeasons ? ['seasons' as SidebarSection] : []),
        'communications',
        'booking-engine',
        'services',
        ...(nav.showRestaurant ? ['restaurant' as SidebarSection] : []),
      ],
    },
    {
      key: 'amministrazione',
      label: 'Amministrazione',
      sections: [
        'financials',
        'invoices',
        'reports',
      ],
    },
  ]

  if (isIT) {
    const complianceSections: SidebarSection[] = []
    if (compliance.requiresAlloggiati) complianceSections.push('compliance-alloggiati')
    if (compliance.requiresISTAT) complianceSections.push('compliance-istat')
    complianceSections.push('compliance-tourist-tax')

    if (complianceSections.length > 0) {
      groups.push({
        key: 'compliance',
        label: 'Compliance',
        sections: complianceSections,
      })
    }
  }

  groups.push({
    key: 'configurazione',
    label: 'Configurazione',
    sections: [
      'media',
      'channels',
      'settings',
      ...(nav.showHousekeeping ? ['housekeeping' as SidebarSection] : []),
    ],
  })

  return groups
}

// ---------------------------------------------------------------------------
// Backward compat: flat list di sezioni visibili
// ---------------------------------------------------------------------------

export function getVisibleSections(propertyType: PropertyType): SidebarSection[] {
  const groups = getNavigation(propertyType, false, 'IT')
  return groups.flatMap((g) => g.sections)
}

// ---------------------------------------------------------------------------
// Form visibility (usata dal settings form)
// ---------------------------------------------------------------------------

export interface FormSectionVisibility {
  showRoomTypes: boolean
  showRooms: boolean
  showRatePlans: boolean
  showSeasons: boolean
  showMealPlans: boolean
  showStarRating: boolean
  showCheckInOut: boolean
  showCin: boolean
  showScia: boolean
  showAlloggiati: boolean
  showIstat: boolean
  showCedolareSecca: boolean
}

export function getFormVisibility(propertyType: PropertyType): FormSectionVisibility {
  const config = getPropertyTypeConfig(propertyType)
  return {
    showRoomTypes: config.hasRoomTypes,
    showRooms: config.hasRooms,
    showRatePlans: config.hasRatePlans,
    showSeasons: config.hasSeasons,
    showMealPlans: config.hasMealPlans,
    showStarRating: config.hasStarRating,
    showCheckInOut: config.hasCheckInOut,
    showCin: config.compliance.requiresCIN,
    showScia: config.compliance.requiresSCIA,
    showAlloggiati: config.compliance.requiresAlloggiati,
    showIstat: config.compliance.requiresISTAT,
    showCedolareSecca: config.fiscal.allowCedolareSecca,
  }
}
