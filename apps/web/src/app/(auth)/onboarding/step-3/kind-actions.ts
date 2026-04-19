'use server'

import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

const BaseSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
})

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'entity'
  )
}

async function resolveTenant(userId: string): Promise<{ tenantId: string; tenantSlug: string } | null> {
  const supabase = await createServerSupabaseClient()
  const { data: m } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
  if (!m || m.length === 0) return null
  const tenantId = m[0]!.tenant_id as string
  const admin = await createServiceRoleClient()
  const { data: t } = await admin.from('tenants').select('slug').eq('id', tenantId).single()
  if (!t) return null
  return { tenantId, tenantSlug: t.slug as string }
}

async function insertEntity(
  tenantId: string,
  kind: string,
  name: string,
): Promise<{ id: string; slug: string } | null> {
  const admin = await createServiceRoleClient()
  const { data, error } = await admin
    .from('entities')
    .insert({
      tenant_id: tenantId,
      kind,
      slug: slugify(name),
      name,
      management_mode: 'self_service',
      is_active: true,
    })
    .select('id, slug')
    .single()
  if (error || !data) return null
  return data
}

async function attachStaff(entityId: string, userId: string) {
  const admin = await createServiceRoleClient()
  await admin.from('staff_members').insert({ entity_id: entityId, user_id: userId, role: 'owner', is_active: true })
}

export async function createRestaurantEntityAction(input: {
  name: string
  cuisineType?: string[]
  capacity?: number
  address?: string
  city?: string
  zip?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'unauthenticated' as const }
  const tenant = await resolveTenant(user.id)
  if (!tenant) return { success: false, error: 'no_tenant' as const }

  const parsed = BaseSchema.safeParse({ name: input.name, address: input.address, city: input.city, zip: input.zip })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' }

  const entity = await insertEntity(tenant.tenantId, 'restaurant', parsed.data.name)
  if (!entity) return { success: false, error: 'entity_insert_failed' }

  const admin = await createServiceRoleClient()
  const { error } = await admin.from('restaurants').insert({
    id: entity.id,
    tenant_id: tenant.tenantId,
    cuisine_type: input.cuisineType ?? [],
    capacity_total: input.capacity ?? 0,
  })
  if (error) {
    await admin.from('entities').delete().eq('id', entity.id)
    return { success: false, error: `restaurant_insert: ${error.message}` }
  }
  await attachStaff(entity.id, user.id)
  return { success: true, entityId: entity.id, entitySlug: entity.slug, tenantSlug: tenant.tenantSlug }
}

export async function createBikeRentalEntityAction(input: {
  name: string
  address?: string
  city?: string
  zip?: string
  bikeTypes?: string[]
  capacity?: number
}) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'unauthenticated' as const }
  const tenant = await resolveTenant(user.id)
  if (!tenant) return { success: false, error: 'no_tenant' as const }

  const parsed = BaseSchema.safeParse({ name: input.name, address: input.address, city: input.city, zip: input.zip })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' }

  const entity = await insertEntity(tenant.tenantId, 'bike_rental', parsed.data.name)
  if (!entity) return { success: false, error: 'entity_insert_failed' }

  const admin = await createServiceRoleClient()
  const { error } = await admin.from('bike_rentals').insert({
    id: entity.id,
    tenant_id: tenant.tenantId,
    bike_types: input.bikeTypes ?? [],
    capacity_total: input.capacity ?? 0,
    address: input.address || null,
    city: input.city || null,
    zip: input.zip || null,
  })
  if (error) {
    await admin.from('entities').delete().eq('id', entity.id)
    return { success: false, error: `bike_insert: ${error.message}` }
  }
  await attachStaff(entity.id, user.id)
  return { success: true, entityId: entity.id, entitySlug: entity.slug, tenantSlug: tenant.tenantSlug }
}

export async function createExperienceEntityAction(input: {
  name: string
  category: string
  address?: string
  city?: string
  zip?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'unauthenticated' as const }
  const tenant = await resolveTenant(user.id)
  if (!tenant) return { success: false, error: 'no_tenant' as const }

  const parsed = BaseSchema.safeParse({ name: input.name, address: input.address, city: input.city, zip: input.zip })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' }

  const entity = await insertEntity(tenant.tenantId, 'activity', parsed.data.name)
  if (!entity) return { success: false, error: 'entity_insert_failed' }

  const admin = await createServiceRoleClient()
  const { error } = await admin.from('experience_entities').insert({
    id: entity.id,
    tenant_id: tenant.tenantId,
    category: input.category,
  })
  if (error) {
    await admin.from('entities').delete().eq('id', entity.id)
    return { success: false, error: `experience_insert: ${error.message}` }
  }
  await attachStaff(entity.id, user.id)
  return { success: true, entityId: entity.id, entitySlug: entity.slug, tenantSlug: tenant.tenantSlug }
}

export async function createGenericEntityAction(input: {
  name: string
  kind: 'wellness' | 'moto_rental' | 'ski_school'
  address?: string
  city?: string
  zip?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'unauthenticated' as const }
  const tenant = await resolveTenant(user.id)
  if (!tenant) return { success: false, error: 'no_tenant' as const }

  const parsed = BaseSchema.safeParse({ name: input.name, address: input.address, city: input.city, zip: input.zip })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' }

  const entity = await insertEntity(tenant.tenantId, input.kind, parsed.data.name)
  if (!entity) return { success: false, error: 'entity_insert_failed' }
  await attachStaff(entity.id, user.id)
  return { success: true, entityId: entity.id, entitySlug: entity.slug, tenantSlug: tenant.tenantSlug }
}
