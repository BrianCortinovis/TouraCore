import type { Json, PropertyType } from '../types/database'

export const ALL_PROPERTY_TYPES: PropertyType[] = [
  'hotel',
  'residence',
  'mixed',
  'b_and_b',
  'agriturismo',
  'casa_vacanze',
  'affittacamere',
]

export interface PropertyTypeAvailabilitySettings {
  types: PropertyType[]
}

export const DEFAULT_PROPERTY_TYPE_AVAILABILITY: PropertyTypeAvailabilitySettings = {
  types: ALL_PROPERTY_TYPES,
}

export function normalizePropertyTypeAvailability(
  value: Json | null | undefined
): PropertyTypeAvailabilitySettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PROPERTY_TYPE_AVAILABILITY
  }

  const rawTypes = Array.isArray(value.types) ? value.types : []
  const types = rawTypes.filter(isPropertyType)

  return {
    types: types.length > 0 ? types : DEFAULT_PROPERTY_TYPE_AVAILABILITY.types,
  }
}

export function isPropertyTypeEnabled(
  propertyType: PropertyType,
  enabledTypes: PropertyType[]
): boolean {
  return enabledTypes.includes(propertyType)
}

function isPropertyType(value: unknown): value is PropertyType {
  return ALL_PROPERTY_TYPES.includes(value as PropertyType)
}
