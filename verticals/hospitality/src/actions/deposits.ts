'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import type { DepositCollectionMethod, DepositStatus } from '../types/database'

interface CreateDepositData {
  reservation_id: string
  amount: number
  collection_method: DepositCollectionMethod
  notes?: string | null
}

interface UpdateDepositData {
  status?: DepositStatus
  collected_at?: string | null
  returned_at?: string | null
  returned_amount?: number | null
  deduction_amount?: number
  deduction_reason?: string | null
  notes?: string | null
}

export async function createSecurityDeposit(orgId: string, data: CreateDepositData) {
  if (!orgId) throw new Error('Organization id is required')
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()
  const { data: reservation } = await supabase
    .from('reservations')
    .select('id')
    .eq('id', data.reservation_id)
    .eq('entity_id', orgId)
    .maybeSingle()

  if (!reservation) {
    throw new Error('Reservation not found in this organization')
  }

  const { data: deposit, error } = await supabase
    .from('security_deposits')
    .insert({ entity_id: orgId, ...data })
    .select()
    .single()

  if (error) throw new Error(`Failed to create security deposit: ${error.message}`)
  revalidatePath('/reservations')
  return deposit
}

export async function updateSecurityDeposit(orgId: string, depositId: string, data: UpdateDepositData) {
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()

  const { data: deposit, error } = await supabase
    .from('security_deposits')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('entity_id', orgId)
    .eq('id', depositId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update security deposit: ${error.message}`)
  revalidatePath('/reservations')
  return deposit
}

export async function collectDeposit(orgId: string, depositId: string) {
  return updateSecurityDeposit(orgId, depositId, {
    status: 'collected',
    collected_at: new Date().toISOString(),
  })
}

export async function returnDeposit(orgId: string, depositId: string, returnedAmount: number, deductionAmount?: number, deductionReason?: string) {
  return updateSecurityDeposit(orgId, depositId, {
    status: deductionAmount && deductionAmount > 0 ? 'partially_returned' : 'returned',
    returned_at: new Date().toISOString(),
    returned_amount: returnedAmount,
    deduction_amount: deductionAmount ?? 0,
    deduction_reason: deductionReason ?? null,
  })
}
