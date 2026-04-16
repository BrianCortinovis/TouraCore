'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db'
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

function slugifyStructureName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'struttura'
  )
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
  const authBootstrap = await getAuthBootstrapData()
  const user = authBootstrap.user

  if (!user) {
    throw new Error('Sessione non valida')
  }

  const tenant = authBootstrap.tenant

  if (!tenant) {
    throw new Error('Nessuna attività attiva selezionata')
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
  const metadataName = primaryStaff
    ? `${primaryStaff.first_name ?? ''} ${primaryStaff.last_name ?? ''}`.trim()
    : ''
  const fallbackName = user.email?.split('@')[0] ?? ''

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
  const slug = slugifyStructureName(name)
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
    .from('entities')
    .insert({
      tenant_id: tenant.id,
      kind: 'accommodation',
      slug,
      name,
      short_description: null,
      description: null,
      country_override: country !== 'IT' ? country : null,
      management_mode: 'self_service',
      is_active: true,
    })
    .select('id, slug, name')
    .single()

  if (organizationError || !organization) {
    throw new Error(`Impossibile creare la struttura: ${organizationError?.message || 'unknown error'}`)
  }

  const { error: accommodationError } = await serviceSupabase
    .from('accommodations')
    .insert({
      entity_id: organization.id,
      property_type: input.type,
      is_imprenditoriale: true,
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
      default_check_in_time: '14:00',
      default_check_out_time: '10:00',
      settings: {
        created_from_platform: true,
      },
    })

  if (accommodationError) {
    await serviceSupabase.from('entities').delete().eq('id', organization.id)
    throw new Error(`Impossibile creare la struttura: ${accommodationError.message}`)
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
    await serviceSupabase.from('entities').delete().eq('id', organization.id)
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
    .from('entities')
    .select('id, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (existingOrganizationError || !existingOrganization) {
    throw new Error('Struttura non trovata per questo account')
  }

  const { data, error } = await serviceSupabase
    .from('entities')
    .update({
      name,
      country_override: country !== 'IT' ? country : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select('id, tenant_id, name, slug, country_override, is_active')
    .single()

  if (error || !data) {
    throw new Error(`Impossibile aggiornare la struttura: ${error?.message || 'unknown error'}`)
  }

  const { error: accommodationError } = await serviceSupabase
    .from('accommodations')
    .update({
      property_type: input.type,
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
    })
    .eq('entity_id', id)

  if (accommodationError) {
    throw new Error(`Impossibile aggiornare la struttura: ${accommodationError.message}`)
  }

  revalidatePath('/platform')
  revalidatePath('/select-org')
  revalidatePath('/settings')

  return data as unknown as Organization
}
