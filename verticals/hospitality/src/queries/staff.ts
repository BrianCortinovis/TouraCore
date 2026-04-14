import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { StaffMember } from '../types/database'

export async function getStaffMembers() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('staff_members')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .order('role', { ascending: true })
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (error) throw error
  return data as StaffMember[]
}
