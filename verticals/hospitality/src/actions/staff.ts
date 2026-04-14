'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type { StaffRole } from '../types/database'

export interface InviteStaffData {
  entity_id: string
  email: string
  first_name: string
  last_name: string
  role: StaffRole
  phone?: string
}

/**
 * Invite a new staff member.
 *
 * 1. Create (or find) the user in Supabase Auth via admin.inviteUserByEmail
 * 2. Insert a staff_members record linking user to the organization
 *
 * The invited user will receive an email to set their password.
 */
export async function inviteStaffMember(data: InviteStaffData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.email) throw new Error('email is required')
  if (!data.first_name) throw new Error('first_name is required')
  if (!data.last_name) throw new Error('last_name is required')
  if (!data.role) throw new Error('role is required')

  const { property: organization, staff } = await getCurrentOrg()
  const currentOrgId = organization?.id

  if (!currentOrgId || !staff) {
    throw new Error('Operazione non autorizzata')
  }

  if (data.entity_id !== currentOrgId) {
    throw new Error('Non puoi invitare utenti in un\'altra struttura')
  }

  if (!['owner', 'manager'].includes(staff.role)) {
    throw new Error('Permessi insufficienti per invitare utenti')
  }

  const supabase = await createServiceRoleClient()

  // Check if a staff member with this email already exists in this org
  const { data: existing } = await supabase
    .from('staff_members')
    .select('id')
    .eq('entity_id', data.entity_id)
    .eq('email', data.email)
    .maybeSingle()

  if (existing) {
    throw new Error('Un utente con questa email esiste già nella struttura')
  }

  // Try to find existing auth user by email, or create one via invite
  let userId: string

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === data.email.toLowerCase()
  )

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Invite new user via Supabase Auth
    const { data: inviteResult, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(data.email, {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
        },
      })

    if (inviteError) {
      throw new Error(`Errore invito: ${inviteError.message}`)
    }

    userId = inviteResult.user.id
  }

  // Create staff member record
  const { data: staffMember, error: staffError } = await supabase
    .from('staff_members')
    .insert({
      entity_id: data.entity_id,
      user_id: userId,
      role: data.role,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (staffError) {
    throw new Error(`Errore creazione staff: ${staffError.message}`)
  }

  revalidatePath('/settings/users')
  return staffMember
}

/**
 * Update a staff member's role or active status.
 */
export async function updateStaffMember(
  id: string,
  data: { role?: StaffRole; is_active?: boolean; first_name?: string; last_name?: string; phone?: string }
) {
  if (!id) throw new Error('Staff member id is required')

  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const supabase = await createServiceRoleClient()

  // Verify the staff member belongs to the current org before updating
  const { data: existing } = await supabase
    .from('staff_members')
    .select('id')
    .eq('id', id)
    .eq('entity_id', orgId)
    .single()

  if (!existing) throw new Error('Staff member not found in this organization')

  const { data: staffMember, error } = await supabase
    .from('staff_members')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('entity_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Errore aggiornamento: ${error.message}`)

  revalidatePath('/settings/users')
  return staffMember
}

/**
 * Remove (deactivate) a staff member.
 */
export async function deactivateStaffMember(id: string) {
  return updateStaffMember(id, { is_active: false })
}
