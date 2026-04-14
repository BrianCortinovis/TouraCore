'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { getEnabledPlatformPropertyTypes } from '../queries/platform-settings'
import { getAuthBootstrapData } from '../queries/auth'
import type {
  Property as Organization,
  PropertyType,
  StaffRole,
  TenantAccount,
  TenantMembership,
} from '../types/database'

interface UpdateTenantProfileInput {
  name: string
  legalName?: string
  billingEmail?: string
  billingPhone?: string
}

interface CreateTenantOrganizationInput {
  name: string
  type: PropertyType
  legalName?: string
  vatNumber?: string
  fiscalCode?: string
  address?: string
  city?: string
  province?: string
  zip?: string
  country?: string
  email?: string
  phone?: string
  website?: string
}

interface UpdateTenantOrganizationInput {
  id: string
  name: string
  type: PropertyType
  legalName?: string
  vatNumber?: string
  fiscalCode?: string
  address?: string
  city?: string
  province?: string
  zip?: string
  country?: string
  email?: string
  phone?: string
  website?: string
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ')
  const [firstName, ...rest] = normalized.split(' ')

  return {
    firstName: firstName || 'Owner',
    lastName: rest.join(' ') || 'Gest',
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function requireTenantAccess(): Promise<{
  userId: string
  userEmail: string
  tenant: TenantAccount
  membership: TenantMembership
  staffRole: StaffRole
  displayName: string
}> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Sessione non valida')
  }

  const authBootstrap = await getAuthBootstrapData()
  const tenant = authBootstrap.tenant ?? authBootstrap.tenants[0] ?? null

  if (!tenant) {
    throw new Error('Account piattaforma non trovato')
  }

  const membership = authBootstrap.tenantMemberships.find(
    (item) => item.tenant_id === tenant.id && item.is_active
  )

  if (!membership) {
    throw new Error('Accesso account non disponibile')
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    throw new Error('Permessi insufficienti per gestire l\'account')
  }

  const primaryStaff = authBootstrap.staffMemberships[0]
  const metadataName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
  const fallbackName =
    primaryStaff
      ? `${primaryStaff.first_name} ${primaryStaff.last_name}`.trim()
      : user.email?.split('@')[0] ?? ''

  return {
    userId: user.id,
    userEmail: user.email?.toLowerCase() ?? '',
    tenant,
    membership,
    staffRole: membership.role === 'owner' ? 'owner' : 'manager',
    displayName: metadataName || fallbackName || 'Owner Gest',
  }
}

export async function updateTenantAccountProfile(input: UpdateTenantProfileInput) {
  const { tenant } = await requireTenantAccess()
  const name = input.name.trim()
  const legalName = input.legalName?.trim() || null
  const billingEmail = input.billingEmail?.trim().toLowerCase() || null
  const billingPhone = input.billingPhone?.trim() || null

  if (!name) {
    throw new Error('Il nome account è obbligatorio')
  }

  if (billingEmail && !isValidEmail(billingEmail)) {
    throw new Error('Email amministrativa non valida')
  }

  const serviceSupabase = await createServiceRoleClient()
  const { data, error } = await serviceSupabase
    .from('tenant_accounts')
    .update({
      name,
      legal_name: legalName,
      billing_email: billingEmail,
      billing_phone: billingPhone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenant.id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Impossibile aggiornare l'account: ${error?.message || 'unknown error'}`)
  }

  revalidatePath('/platform')
  revalidatePath('/select-org')

  return data as TenantAccount
}

export async function createOrganizationForTenant(input: CreateTenantOrganizationInput) {
  const { tenant, userId, userEmail, staffRole, displayName } = await requireTenantAccess()
  const name = input.name.trim()
  const legalName = input.legalName?.trim() || tenant.legal_name || tenant.name
  const vatNumber = input.vatNumber?.trim() || null
  const fiscalCode = input.fiscalCode?.trim() || null
  const address = input.address?.trim() || null
  const city = input.city?.trim() || null
  const province = input.province?.trim().toUpperCase() || null
  const zip = input.zip?.trim() || null
  const country = input.country?.trim().toUpperCase() || 'IT'
  const email = input.email?.trim().toLowerCase() || userEmail || tenant.billing_email || null
  const phone = input.phone?.trim() || null
  const website = input.website?.trim() || null

  if (!name) {
    throw new Error('Il nome struttura è obbligatorio')
  }

  if (email && !isValidEmail(email)) {
    throw new Error('Email struttura non valida')
  }

  const enabledTypes = await getEnabledPlatformPropertyTypes()

  if (!enabledTypes.includes(input.type)) {
    throw new Error('Questa tipologia struttura non è attiva sulla piattaforma')
  }

  const { firstName, lastName } = splitFullName(displayName)
  const serviceSupabase = await createServiceRoleClient()

  const { data: organization, error: organizationError } = await serviceSupabase
    .from('organizations')
    .insert({
      tenant_id: tenant.id,
      name,
      type: input.type,
      legal_name: legalName,
      vat_number: vatNumber,
      fiscal_code: fiscalCode,
      address,
      city,
      province,
      zip,
      country,
      email,
      phone,
      website,
      subscription_plan: 'trial',
      subscription_status: 'trialing',
      trial_ends_at: daysFromNow(14),
      settings: {
        created_from_platform: true,
      },
    })
    .select('*, tenant:tenant_accounts(*)')
    .single()

  if (organizationError || !organization) {
    throw new Error(`Impossibile creare la struttura: ${organizationError?.message || 'unknown error'}`)
  }

  const { error: staffError } = await serviceSupabase.from('staff_members').insert({
    entity_id: organization.id,
    user_id: userId,
    role: staffRole,
    first_name: firstName,
    last_name: lastName,
    email,
    is_active: true,
  })

  if (staffError) {
    await serviceSupabase.from('organizations').delete().eq('id', organization.id)
    throw new Error(`Impossibile collegare l'utente alla struttura: ${staffError.message}`)
  }

  revalidatePath('/platform')
  revalidatePath('/select-org')

  return organization as Organization
}

export async function updateTenantOrganization(input: UpdateTenantOrganizationInput) {
  const { tenant } = await requireTenantAccess()
  const id = input.id.trim()
  const name = input.name.trim()
  const legalName = input.legalName?.trim() || null
  const vatNumber = input.vatNumber?.trim() || null
  const fiscalCode = input.fiscalCode?.trim() || null
  const address = input.address?.trim() || null
  const city = input.city?.trim() || null
  const province = input.province?.trim().toUpperCase() || null
  const zip = input.zip?.trim() || null
  const country = input.country?.trim().toUpperCase() || 'IT'
  const email = input.email?.trim().toLowerCase() || null
  const phone = input.phone?.trim() || null
  const website = input.website?.trim() || null

  if (!id) {
    throw new Error('Identificativo struttura mancante')
  }

  if (!name) {
    throw new Error('Il nome struttura è obbligatorio')
  }

  if (email && !isValidEmail(email)) {
    throw new Error('Email struttura non valida')
  }

  const enabledTypes = await getEnabledPlatformPropertyTypes()

  if (!enabledTypes.includes(input.type)) {
    throw new Error('Questa tipologia struttura non è attiva sulla piattaforma')
  }

  const serviceSupabase = await createServiceRoleClient()
  const { data: existingOrganization, error: existingOrganizationError } = await serviceSupabase
    .from('organizations')
    .select('id, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (existingOrganizationError || !existingOrganization) {
    throw new Error('Struttura non trovata per questo account')
  }

  const { data, error } = await serviceSupabase
    .from('organizations')
    .update({
      name,
      type: input.type,
      legal_name: legalName,
      vat_number: vatNumber,
      fiscal_code: fiscalCode,
      address,
      city,
      province,
      zip,
      country,
      email,
      phone,
      website,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select('*, tenant:tenant_accounts(*)')
    .single()

  if (error || !data) {
    throw new Error(`Impossibile aggiornare la struttura: ${error?.message || 'unknown error'}`)
  }

  revalidatePath('/platform')
  revalidatePath('/select-org')
  revalidatePath('/settings')

  return data as Organization
}
