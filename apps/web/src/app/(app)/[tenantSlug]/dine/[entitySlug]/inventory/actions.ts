'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { assertUserOwnsRestaurant } from '@/lib/restaurant-guard'

const IngredientSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  name: z.string().min(1).max(120),
  category: z.string().optional(),
  unitOfMeasure: z.enum(['kg', 'g', 'l', 'ml', 'pcs', 'bottle', 'box']),
  avgCost: z.number().min(0).default(0),
  stockQty: z.number().min(0).default(0),
  lowStockThreshold: z.number().min(0).optional(),
})

const StockMovementSchema = z.object({
  ingredientId: z.string().uuid(),
  movementType: z.enum(['IN', 'OUT', 'ADJUST', 'WASTE']),
  qty: z.number(),
  unitCost: z.number().min(0).default(0),
  notes: z.string().optional(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/inventory`
}

export async function createIngredient(input: z.infer<typeof IngredientSchema>) {
  const parsed = IngredientSchema.parse(input)
  await assertUserOwnsRestaurant(parsed.restaurantId)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('ingredients').insert({
    restaurant_id: parsed.restaurantId,
    name: parsed.name,
    category: parsed.category ?? null,
    unit_of_measure: parsed.unitOfMeasure,
    avg_cost: parsed.avgCost,
    stock_qty: parsed.stockQty,
    low_stock_threshold: parsed.lowStockThreshold ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function recordStockMovement(input: z.infer<typeof StockMovementSchema>) {
  const parsed = StockMovementSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data: ing } = await admin.from('ingredients').select('restaurant_id').eq('id', parsed.ingredientId).maybeSingle()
  if (!ing) throw new Error('Ingredient not found')
  await assertUserOwnsRestaurant(ing.restaurant_id as string)

  const sign = parsed.movementType === 'IN' ? 1 : -1
  const delta = parsed.movementType === 'ADJUST' ? parsed.qty : sign * Math.abs(parsed.qty)

  await admin.from('stock_movements').insert({
    ingredient_id: parsed.ingredientId,
    movement_type: parsed.movementType,
    qty: Math.abs(parsed.qty),
    unit_cost: parsed.unitCost,
    notes: parsed.notes ?? null,
  })

  await admin.rpc('increment_ingredient_stock', { p_id: parsed.ingredientId, p_delta: delta }).then(() => {}, async () => {
    // Fallback se RPC non esiste
    const { data: ing } = await admin.from('ingredients').select('stock_qty').eq('id', parsed.ingredientId).single()
    if (ing) {
      await admin.from('ingredients').update({ stock_qty: Number(ing.stock_qty) + delta }).eq('id', parsed.ingredientId)
    }
  })

  revalidatePath(pathFor(parsed))
}
