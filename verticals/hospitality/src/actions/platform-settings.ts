'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '../auth/access'
import { createServiceRoleClient } from '@touracore/db'
import {
  ALL_PROPERTY_TYPES,
  normalizePropertyTypeAvailability,
} from '../config/platform-property-types'

const ENABLED_PROPERTY_TYPES_KEY = 'enabled_property_types'

export async function updateEnabledPlatformPropertyTypes(types: string[]) {
  const user = await requireSuperAdmin()
  const normalized = normalizePropertyTypeAvailability({ types })
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('platform_settings')
    .upsert({
      key: ENABLED_PROPERTY_TYPES_KEY,
      value: { types: normalized.types },
      updated_at: new Date().toISOString(),
      updated_by: user.email || user.id,
    })

  if (error) {
    throw new Error(`Failed to update platform settings: ${error.message}`)
  }

  revalidatePath('/superadmin')
  revalidatePath('/superadmin/panoramica')
  revalidatePath('/superadmin/tecnico')
  revalidatePath('/settings')
}

export async function updateEnabledPlatformPropertyTypesFromForm(formData: FormData) {
  const types = ALL_PROPERTY_TYPES.filter((propertyType) => formData.get(`property_type_${propertyType}`) === 'on')
  await updateEnabledPlatformPropertyTypes(types)
}
