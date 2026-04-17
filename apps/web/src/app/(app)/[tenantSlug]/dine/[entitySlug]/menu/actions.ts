'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const ALLERGENS_UE = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const

const CategorySchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  name: z.string().min(1).max(80),
  availableServices: z.array(z.string()).default([]),
  orderIdx: z.number().int().default(0),
})

const ItemSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  priceBase: z.number().min(0),
  vatPct: z.number().min(0).max(30).default(10),
  courseNumber: z.number().int().min(1).max(5).default(1),
  stationCode: z.string().optional(),
  allergens: z.array(z.enum(ALLERGENS_UE)).default([]),
  availableServices: z.array(z.string()).default([]),
})

const UpdateItemSchema = ItemSchema.partial().extend({
  itemId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/menu`
}

export async function createCategory(input: z.infer<typeof CategorySchema>) {
  const parsed = CategorySchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('menu_categories').insert({
    restaurant_id: parsed.restaurantId,
    name: parsed.name,
    available_services: parsed.availableServices,
    order_idx: parsed.orderIdx,
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function deleteCategory(input: { categoryId: string; tenantSlug: string; entitySlug: string }) {
  const admin = await createServiceRoleClient()
  await admin.from('menu_categories').update({ active: false }).eq('id', input.categoryId)
  revalidatePath(pathFor(input))
}

export async function createItem(input: z.infer<typeof ItemSchema>) {
  const parsed = ItemSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('menu_items').insert({
    restaurant_id: parsed.restaurantId,
    category_id: parsed.categoryId,
    name: parsed.name,
    description: parsed.description,
    price_base: parsed.priceBase,
    vat_pct: parsed.vatPct,
    course_number: parsed.courseNumber,
    station_code: parsed.stationCode,
    allergens: parsed.allergens,
    available_services: parsed.availableServices,
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function updateItem(input: z.infer<typeof UpdateItemSchema>) {
  const parsed = UpdateItemSchema.parse(input)
  const admin = await createServiceRoleClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.name !== undefined) update.name = parsed.name
  if (parsed.description !== undefined) update.description = parsed.description
  if (parsed.priceBase !== undefined) update.price_base = parsed.priceBase
  if (parsed.vatPct !== undefined) update.vat_pct = parsed.vatPct
  if (parsed.courseNumber !== undefined) update.course_number = parsed.courseNumber
  if (parsed.stationCode !== undefined) update.station_code = parsed.stationCode
  if (parsed.allergens !== undefined) update.allergens = parsed.allergens
  await admin.from('menu_items').update(update).eq('id', parsed.itemId)
  revalidatePath(pathFor(parsed))
}

export async function deleteItem(input: { itemId: string; tenantSlug: string; entitySlug: string }) {
  const admin = await createServiceRoleClient()
  await admin.from('menu_items').update({ active: false }).eq('id', input.itemId)
  revalidatePath(pathFor(input))
}
