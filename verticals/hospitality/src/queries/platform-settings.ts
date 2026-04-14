import { createServiceRoleClient } from '@touracore/db'
import {
  DEFAULT_PROPERTY_TYPE_AVAILABILITY,
  normalizePropertyTypeAvailability,
} from '../config/platform-property-types'
import type { PropertyType } from '../types/database'

const ENABLED_PROPERTY_TYPES_KEY = 'enabled_property_types'

export async function getEnabledPlatformPropertyTypes(): Promise<PropertyType[]> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', ENABLED_PROPERTY_TYPES_KEY)
    .maybeSingle()

  if (error || !data) {
    return DEFAULT_PROPERTY_TYPE_AVAILABILITY.types
  }

  return normalizePropertyTypeAvailability(data.value).types
}
