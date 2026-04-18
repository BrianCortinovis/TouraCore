'use server'

import { createServiceRoleClient } from '@touracore/db/server'
import { createReservation, type CreateReservationInput, computeQuote, type ExperienceProduct, type ExperienceVariant, type ExperienceTimeslot } from '@touracore/experiences'

export interface CreateExperienceReservationActionInput extends Omit<CreateReservationInput, 'partnerId' | 'source' | 'tenantId' | 'subtotalCents' | 'addonsCents' | 'pickupCents' | 'discountCents' | 'taxCents' | 'totalCents'> {
  partnerRef?: string
}

/**
 * SECURITY: recalcola prezzi server-side + valida tenant_id da entity_id (trusted source).
 * Client NON può spoofare tenantId né price — action ignora input financial e re-compute.
 */
export async function createExperienceReservationAction(input: CreateExperienceReservationActionInput) {
  const supabase = await createServiceRoleClient()

  // 1. Validate entity_id → trusted tenant_id lookup
  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id, kind, is_active')
    .eq('id', input.entityId)
    .maybeSingle()

  if (!entity || entity.kind !== 'activity' || !entity.is_active) {
    throw new Error('Invalid entity')
  }
  const trustedTenantId = entity.tenant_id as string

  // 2. Validate product belongs to entity
  const { data: product } = await supabase
    .from('experience_products')
    .select('*')
    .eq('id', input.productId)
    .eq('entity_id', input.entityId)
    .eq('status', 'active')
    .maybeSingle()
  if (!product) throw new Error('Invalid product')

  // 3. Validate timeslot if provided
  let timeslot: ExperienceTimeslot | null = null
  if (input.timeslotId) {
    const { data: ts } = await supabase
      .from('experience_timeslots')
      .select('*')
      .eq('id', input.timeslotId)
      .eq('product_id', input.productId)
      .eq('status', 'open')
      .maybeSingle()
    if (!ts) throw new Error('Timeslot not available')
    timeslot = ts as unknown as ExperienceTimeslot
    const avail = (ts as { capacity_total: number; capacity_booked: number; capacity_held: number }).capacity_total - (ts as { capacity_total: number; capacity_booked: number; capacity_held: number }).capacity_booked - (ts as { capacity_total: number; capacity_booked: number; capacity_held: number }).capacity_held
    if (avail < input.guests.length) throw new Error('Capacity exhausted')
  }

  // 4. Validate variants exist + belong to product
  const variantIds = Array.from(new Set(input.guests.map((g) => g.variantId).filter(Boolean))) as string[]
  const { data: variants } = variantIds.length > 0
    ? await supabase.from('experience_variants').select('*').in('id', variantIds).eq('product_id', input.productId).eq('active', true)
    : { data: [] }
  const variantsList = (variants ?? []) as unknown as ExperienceVariant[]
  const variantsMap = new Map(variantsList.map((v) => [v.id, v]))
  if (variantIds.length > 0 && variantsMap.size !== variantIds.length) throw new Error('Invalid variant')

  // 5. Validate addons
  const addonIds = (input.addons ?? []).map((a) => a.addonId)
  const { data: addons } = addonIds.length > 0
    ? await supabase.from('experience_addons').select('id, price_cents, price_per').in('id', addonIds).eq('product_id', input.productId).eq('active', true)
    : { data: [] }
  const addonsList = (addons ?? []) as Array<{ id: string; price_cents: number; price_per: 'booking' | 'guest' | 'hour' | 'unit' }>
  const addonsMap = new Map(addonsList.map((a) => [a.id, a]))
  if (addonIds.length > 0 && addonsMap.size !== addonIds.length) throw new Error('Invalid addon')

  // 6. Validate pickup zone + get surcharge from DB
  let pickupSurchargeCents = 0
  if (input.pickupZoneId) {
    const { data: zone } = await supabase.from('experience_pickup_zones').select('surcharge_cents, entity_id, active').eq('id', input.pickupZoneId).eq('entity_id', input.entityId).eq('active', true).maybeSingle()
    if (!zone) throw new Error('Invalid pickup zone')
    pickupSurchargeCents = (zone as { surcharge_cents: number }).surcharge_cents
  }

  // 7. Server-side compute quote (ignora tutto ciò che arriva dal client per price)
  const variantQty = new Map<string, number>()
  for (const g of input.guests) {
    if (!g.variantId) continue
    variantQty.set(g.variantId, (variantQty.get(g.variantId) ?? 0) + 1)
  }
  const variantsQuote = Array.from(variantQty.entries()).map(([id, quantity]) => ({ variant: variantsMap.get(id)!, quantity }))
  const addonsQuote = (input.addons ?? []).map((a) => {
    const meta = addonsMap.get(a.addonId)!
    return { price_cents: meta.price_cents, quantity: a.quantity, price_per: meta.price_per }
  })

  const quote = computeQuote({
    product: product as unknown as ExperienceProduct,
    variants: variantsQuote,
    addons: addonsQuote,
    timeslot,
    pickupSurchargeCents,
    durationHours: (product as { duration_minutes: number }).duration_minutes / 60,
  })

  // 8. Create reservation con tenant_id trusted + totali computed
  const source = input.partnerRef ? 'partner' : 'direct'
  return await createReservation({
    ...input,
    tenantId: trustedTenantId,
    source,
    partnerId: undefined,
    subtotalCents: quote.subtotal_cents,
    addonsCents: quote.addons_cents,
    pickupCents: quote.pickup_cents,
    discountCents: quote.discount_cents,
    taxCents: quote.tax_cents,
    totalCents: quote.total_cents,
  })
}
