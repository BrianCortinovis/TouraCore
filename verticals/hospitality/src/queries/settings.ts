import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { Property } from '../types/database'

export async function getProperty(entityId: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()

  if (property?.id && property.id !== entityId) {
    throw new Error('Unauthorized: property mismatch')
  }

  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single()

  if (error) throw error
  return data as Property
}
