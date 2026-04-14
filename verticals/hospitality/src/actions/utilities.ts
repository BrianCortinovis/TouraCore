'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import type { UtilityType } from '../types/database'

interface CreateUtilityCostData {
  utility_type: UtilityType
  period_from: string
  period_to: string
  amount: number
  provider?: string | null
  invoice_number?: string | null
  notes?: string | null
}

export async function createUtilityCost(orgId: string, data: CreateUtilityCostData) {
  if (!orgId) throw new Error('Organization id is required')
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()

  const { data: cost, error } = await supabase
    .from('utility_costs')
    .insert({ entity_id: orgId, ...data })
    .select()
    .single()

  if (error) throw new Error(`Failed to create utility cost: ${error.message}`)
  revalidatePath('/utilities')
  return cost
}

export async function updateUtilityCost(orgId: string, costId: string, data: Partial<CreateUtilityCostData>) {
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()

  const { data: cost, error } = await supabase
    .from('utility_costs')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('entity_id', orgId)
    .eq('id', costId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update utility cost: ${error.message}`)
  revalidatePath('/utilities')
  return cost
}

export async function deleteUtilityCost(orgId: string, costId: string) {
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('utility_costs')
    .delete()
    .eq('entity_id', orgId)
    .eq('id', costId)

  if (error) throw new Error(`Failed to delete utility cost: ${error.message}`)
  revalidatePath('/utilities')
}
