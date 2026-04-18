'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'

export interface InviteInput {
  agencySlug: string
  email: string
  role: 'agency_admin' | 'agency_member'
}

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

function defaultPermissions(role: 'agency_owner' | 'agency_admin' | 'agency_member'): Record<string, boolean> {
  if (role === 'agency_owner') {
    return { 'billing.read': true, 'billing.write': true, 'team.admin': true, 'tenant.read': true, 'tenant.write': true }
  }
  if (role === 'agency_admin') {
    return { 'billing.read': true, 'team.admin': true, 'tenant.read': true, 'tenant.write': true }
  }
  return { 'tenant.read': true, 'billing.read': true }
}

export async function inviteTeamMemberAction(input: InviteInput): Promise<{ ok: boolean; error?: string; token?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'team.admin')) {
    await logAgencyAction({
      action: 'team.permission_denied',
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.agencyRole ?? 'tenant',
      agencyId: ctx.agencyId,
      status: 'denied',
      metadata: { attempted: 'invite', slug: input.agencySlug },
    })
    return { ok: false, error: 'forbidden' }
  }

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', input.agencySlug)
    .maybeSingle()
  if (!agency || agency.id !== ctx.agencyId) {
    return { ok: false, error: 'agency_mismatch' }
  }

  const token = generateToken()
  const perms = defaultPermissions(input.role)

  const { data: invite, error } = await supabase
    .from('agency_invitations')
    .insert({
      agency_id: agency.id,
      email: input.email.toLowerCase().trim(),
      role: input.role,
      permissions: perms,
      token,
      invited_by: ctx.user.id,
    })
    .select('id')
    .single()

  if (error || !invite) return { ok: false, error: error?.message ?? 'insert_failed' }

  await logAgencyAction({
    action: 'team.invite_sent',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole,
    agencyId: agency.id,
    targetType: 'invitation',
    targetId: invite.id,
    metadata: { email: input.email, role: input.role },
  })

  // Email stub — se Resend/SMTP configurato invia, altrimenti console
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'
  const acceptUrl = `${baseUrl}/invitations/accept?token=${token}`
  console.log(`[invite] email to ${input.email}: ${acceptUrl}`)

  revalidatePath(`/a/${input.agencySlug}/team`)
  return { ok: true, token }
}

export async function revokeInvitationAction(agencySlug: string, invitationId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'team.admin')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: inv } = await supabase
    .from('agency_invitations')
    .select('id, agency_id, agencies!inner(slug)')
    .eq('id', invitationId)
    .maybeSingle()
  if (!inv || inv.agency_id !== ctx.agencyId) return { ok: false, error: 'not_found' }

  const { error } = await supabase
    .from('agency_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
  if (error) return { ok: false, error: error.message }

  await logAgencyAction({
    action: 'team.invite_revoked',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole,
    agencyId: ctx.agencyId,
    targetType: 'invitation',
    targetId: invitationId,
  })

  revalidatePath(`/a/${agencySlug}/team`)
  return { ok: true }
}

export async function removeMembershipAction(agencySlug: string, membershipId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'team.admin')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: mem } = await supabase
    .from('agency_memberships')
    .select('id, agency_id, role, user_id')
    .eq('id', membershipId)
    .maybeSingle()
  if (!mem || mem.agency_id !== ctx.agencyId) return { ok: false, error: 'not_found' }
  if (mem.user_id === ctx.user.id) return { ok: false, error: 'cannot_remove_self' }

  const { error } = await supabase
    .from('agency_memberships')
    .update({ is_active: false })
    .eq('id', membershipId)
  if (error) return { ok: false, error: error.message }

  await logAgencyAction({
    action: 'team.member_removed',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole,
    agencyId: ctx.agencyId,
    targetType: 'membership',
    targetId: membershipId,
  })

  revalidatePath(`/a/${agencySlug}/team`)
  return { ok: true }
}
