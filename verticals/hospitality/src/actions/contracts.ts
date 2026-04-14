'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import type { ContractStatus } from '../types/database'

interface CreateContractData {
  reservation_id?: string | null
  guest_id?: string | null
  contract_number: string
  contract_date?: string
  start_date: string
  end_date: string
  rental_amount: number
  security_deposit_amount?: number
  terms_and_conditions?: string | null
  special_conditions?: string | null
}

interface UpdateContractData {
  status?: ContractStatus
  signed_at?: string | null
  signed_by_guest?: string | null
  pdf_url?: string | null
  ade_registration_number?: string | null
  ade_registered_at?: string | null
  rental_amount?: number
  security_deposit_amount?: number
  terms_and_conditions?: string | null
  special_conditions?: string | null
}

export async function createContract(orgId: string, data: CreateContractData) {
  if (!orgId) throw new Error('Organization id is required')
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()

  if (data.reservation_id) {
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id')
      .eq('id', data.reservation_id)
      .eq('entity_id', orgId)
      .maybeSingle()

    if (!reservation) {
      throw new Error('Reservation not found in this organization')
    }
  }

  if (data.guest_id) {
    const { data: guest } = await supabase
      .from('guests')
      .select('id')
      .eq('id', data.guest_id)
      .eq('entity_id', orgId)
      .maybeSingle()

    if (!guest) {
      throw new Error('Guest not found in this organization')
    }
  }

  const { data: contract, error } = await supabase
    .from('rental_contracts')
    .insert({
      entity_id: orgId,
      ...data,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create contract: ${error.message}`)
  revalidatePath('/contracts')
  return contract
}

export async function updateContract(orgId: string, contractId: string, data: UpdateContractData) {
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()

  const { data: contract, error } = await supabase
    .from('rental_contracts')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('entity_id', orgId)
    .eq('id', contractId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update contract: ${error.message}`)
  revalidatePath('/contracts')
  return contract
}

export async function deleteContract(orgId: string, contractId: string) {
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('rental_contracts')
    .delete()
    .eq('entity_id', orgId)
    .eq('id', contractId)

  if (error) throw new Error(`Failed to delete contract: ${error.message}`)
  revalidatePath('/contracts')
}
