'use server'

import { createServiceRoleClient } from '@touracore/db/server'

interface Ok<T = unknown> { success: true; data?: T }
interface Err { success: false; error: string }
export type ActionResult<T = unknown> = Ok<T> | Err

// ============================================================================
// M015: INBOX
// ============================================================================

export async function listMessageThreadsAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('message_threads')
    .select('*')
    .eq('entity_id', entityId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100)
  return data ?? []
}

export async function getThreadMessagesAction(threadId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('inbound_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('received_at', { ascending: true })
  return data ?? []
}

export async function sendMessageAction(input: {
  threadId: string
  body: string
  channel: string
  fromName?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('inbound_messages').insert({
    thread_id: input.threadId,
    direction: 'outbound',
    channel: input.channel,
    from_name: input.fromName ?? 'Host',
    body: input.body,
    sent_at: new Date().toISOString(),
    delivery_status: 'sent',
  })
  if (error) return { success: false, error: error.message }
  await supabase
    .from('message_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', input.threadId)
  return { success: true }
}

export async function createManualThreadAction(input: {
  tenantId: string
  entityId: string
  channel: string
  subject: string
  guestEmail?: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('message_threads')
    .insert({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      channel: input.channel,
      subject: input.subject,
      external_thread_id: `manual-${Date.now()}`,
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: data.id } }
}

// ============================================================================
// M016: REVIEWS
// ============================================================================

export async function listReviewsAction(entityId: string, filter?: { sentiment?: string; source?: string }) {
  const supabase = await createServiceRoleClient()
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('entity_id', entityId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100)
  if (filter?.sentiment) query = query.eq('sentiment', filter.sentiment)
  if (filter?.source) query = query.eq('source', filter.source)
  const { data } = await query
  return data ?? []
}

export async function getReviewStatsAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('reviews')
    .select('rating, sentiment, source')
    .eq('entity_id', entityId)
  const list = data ?? []
  const total = list.length
  const avg = total > 0 ? list.reduce((s, r) => s + Number(r.rating ?? 0), 0) / total : 0
  const bySentiment: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }
  const bySource: Record<string, number> = {}
  for (const r of list) {
    if (r.sentiment) bySentiment[r.sentiment] = (bySentiment[r.sentiment] ?? 0) + 1
    if (r.source) bySource[r.source] = (bySource[r.source] ?? 0) + 1
  }
  return { total, avg_rating: Math.round(avg * 10) / 10, by_sentiment: bySentiment, by_source: bySource }
}

export async function replyToReviewAction(input: { reviewId: string; body: string }): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('reviews')
    .update({
      response_body: input.body,
      response_published_at: new Date().toISOString(),
    })
    .eq('id', input.reviewId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function createReviewManualAction(input: {
  tenantId: string
  entityId: string
  source: string
  reviewerName: string
  rating: number
  body: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const sentiment = input.rating >= 7 ? 'positive' : input.rating >= 5 ? 'neutral' : 'negative'
  const { error } = await supabase.from('reviews').insert({
    tenant_id: input.tenantId,
    entity_id: input.entityId,
    source: input.source,
    external_id: `manual-${Date.now()}`,
    reviewer_name: input.reviewerName,
    rating: input.rating,
    body: input.body,
    sentiment,
    published_at: new Date().toISOString(),
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ============================================================================
// M017: ANALYTICS + MAINTENANCE + HOUSEKEEPING TEMPLATES
// ============================================================================

export async function getDailyKpiAction(entityId: string, fromDate: string, toDate: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('v_daily_kpi')
    .select('*')
    .eq('entity_id', entityId)
    .gte('kpi_date', fromDate)
    .lte('kpi_date', toDate)
    .order('kpi_date')
  return data ?? []
}

export async function getKpiSummaryAction(entityId: string, fromDate: string, toDate: string) {
  const rows = await getDailyKpiAction(entityId, fromDate, toDate)
  const totalRevenue = rows.reduce((s, r) => s + Number(r.daily_revenue ?? 0), 0)
  const totalSold = rows.reduce((s, r) => s + Number(r.rooms_sold ?? 0), 0)
  const totalAvailable = rows.reduce((s, r) => s + Number(r.rooms_available ?? 0), 0)
  const adr = totalSold > 0 ? totalRevenue / totalSold : 0
  const revpar = totalAvailable > 0 ? totalRevenue / totalAvailable : 0
  const occupancy = totalAvailable > 0 ? totalSold / totalAvailable : 0
  return {
    total_revenue: Math.round(totalRevenue * 100) / 100,
    adr: Math.round(adr * 100) / 100,
    revpar: Math.round(revpar * 100) / 100,
    occupancy_pct: Math.round(occupancy * 10000) / 100,
    nights_sold: totalSold,
    nights_available: totalAvailable,
  }
}

export async function forecastOccupancyAction(entityId: string, daysAhead: number) {
  const supabase = await createServiceRoleClient()
  const today = new Date()
  const start = today.toISOString().slice(0, 10)
  const future = new Date(today.getTime() + daysAhead * 86400_000).toISOString().slice(0, 10)

  const { data: roomsCountRows } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', entityId)
    .eq('is_active', true)
  const roomsCount = (roomsCountRows as unknown as { count?: number })?.count ?? 0

  const { data: onBook } = await supabase
    .from('reservations')
    .select('check_in, check_out, total_amount')
    .eq('entity_id', entityId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('check_in', future)
    .gte('check_out', start)

  const dayMap = new Map<string, { sold: number; revenue: number }>()
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getTime() + i * 86400_000).toISOString().slice(0, 10)
    dayMap.set(d, { sold: 0, revenue: 0 })
  }

  for (const r of onBook ?? []) {
    const start = new Date(r.check_in).getTime()
    const end = new Date(r.check_out).getTime()
    const nights = Math.max(1, Math.round((end - start) / 86400_000))
    const perNight = Number(r.total_amount ?? 0) / nights
    for (let t = start; t < end; t += 86400_000) {
      const key = new Date(t).toISOString().slice(0, 10)
      const cur = dayMap.get(key)
      if (cur) {
        cur.sold += 1
        cur.revenue += perNight
      }
    }
  }

  return Array.from(dayMap.entries()).map(([date, stats]) => ({
    date,
    on_book_rooms: stats.sold,
    on_book_revenue: Math.round(stats.revenue * 100) / 100,
    forecast_occupancy_pct: roomsCount > 0 ? Math.round((stats.sold / roomsCount) * 10000) / 100 : 0,
    rooms_available: roomsCount,
  }))
}

export async function getSourceMixAction(entityId: string, fromDate: string, toDate: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('reservations')
    .select('source, total_amount')
    .eq('entity_id', entityId)
    .gte('check_in', fromDate)
    .lte('check_in', toDate)
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  const byMix: Record<string, { count: number; revenue: number }> = {}
  for (const r of data ?? []) {
    const s = r.source ?? 'unknown'
    if (!byMix[s]) byMix[s] = { count: 0, revenue: 0 }
    byMix[s].count += 1
    byMix[s].revenue += Number(r.total_amount ?? 0)
  }
  return byMix
}

export async function listMaintenanceTicketsAction(entityId: string, statusFilter?: string) {
  const supabase = await createServiceRoleClient()
  let q = supabase.from('maintenance_tickets').select('*').eq('entity_id', entityId).order('created_at', { ascending: false })
  if (statusFilter) q = q.eq('status', statusFilter)
  const { data } = await q.limit(200)
  return data ?? []
}

export async function createMaintenanceTicketAction(input: {
  tenantId: string
  entityId: string
  roomId?: string
  title: string
  description?: string
  category?: string
  priority?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const code = `MNT-${Date.now().toString(36).toUpperCase()}`
  const { error } = await supabase.from('maintenance_tickets').insert({
    tenant_id: input.tenantId,
    entity_id: input.entityId,
    room_id: input.roomId || null,
    ticket_code: code,
    title: input.title,
    description: input.description,
    category: input.category ?? 'other',
    priority: input.priority ?? 'normal',
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateMaintenanceTicketAction(id: string, patch: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('maintenance_tickets').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listHousekeepingTemplatesAction(tenantId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('housekeeping_checklist_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('task_type')
  return data ?? []
}

export async function saveHousekeepingTemplateAction(input: {
  tenantId: string
  entityId?: string
  roomTypeId?: string
  taskType: string
  checklist: string[]
  estimatedMinutes?: number
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('housekeeping_checklist_templates').insert({
    tenant_id: input.tenantId,
    entity_id: input.entityId || null,
    room_type_id: input.roomTypeId || null,
    task_type: input.taskType,
    checklist: input.checklist,
    estimated_minutes: input.estimatedMinutes,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listSuppliesAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('supplies').select('*').eq('entity_id', entityId).order('name')
  return data ?? []
}

export async function recordSupplyMovementAction(input: {
  supplyId: string
  movementType: 'restock' | 'consumption' | 'adjustment' | 'waste'
  quantity: number
  reason?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const signedQty = input.movementType === 'consumption' || input.movementType === 'waste' ? -Math.abs(input.quantity) : Math.abs(input.quantity)
  const { error: movErr } = await supabase.from('supply_movements').insert({
    supply_id: input.supplyId,
    movement_type: input.movementType,
    quantity: signedQty,
    reason: input.reason,
  })
  if (movErr) return { success: false, error: movErr.message }

  const { data: supply } = await supabase.from('supplies').select('quantity').eq('id', input.supplyId).single()
  if (supply) {
    const newQty = Number(supply.quantity) + signedQty
    await supabase
      .from('supplies')
      .update({
        quantity: newQty,
        last_restocked_at: input.movementType === 'restock' ? new Date().toISOString() : undefined,
      })
      .eq('id', input.supplyId)
  }
  return { success: true }
}

// ============================================================================
// M018: PROMOTIONS + UPSELL ORDERS + COMPETITOR PRICES + LOCKS + IDENTITY
// ============================================================================

export async function listPromotionsAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .eq('entity_id', entityId)
    .order('priority', { ascending: false })
  return data ?? []
}

export async function upsertPromotionAction(input: {
  id?: string
  tenantId: string
  entityId?: string
  name: string
  promotionType: string
  discountType: string
  discountValue: number
  minAdvanceDays?: number
  maxAdvanceDays?: number
  minStayNights?: number
  validFrom?: string
  validTo?: string
  countryCodes?: string[]
  isActive?: boolean
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const payload = {
    tenant_id: input.tenantId,
    entity_id: input.entityId || null,
    name: input.name,
    promotion_type: input.promotionType,
    discount_type: input.discountType,
    discount_value: input.discountValue,
    min_advance_days: input.minAdvanceDays,
    max_advance_days: input.maxAdvanceDays,
    min_stay_nights: input.minStayNights,
    valid_from: input.validFrom,
    valid_to: input.validTo,
    country_codes: input.countryCodes,
    is_active: input.isActive ?? true,
  }
  if (input.id) {
    const { error } = await supabase.from('promotions').update(payload).eq('id', input.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('promotions').insert(payload)
    if (error) return { success: false, error: error.message }
  }
  return { success: true }
}

export async function deletePromotionAction(id: string): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function createPromoCodeAction(input: {
  promotionId: string
  code: string
  maxUses?: number
  expiresAt?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('promo_codes').insert({
    promotion_id: input.promotionId,
    code: input.code.toUpperCase(),
    max_uses: input.maxUses,
    expires_at: input.expiresAt,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listPromoCodesAction(promotionId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('promotion_id', promotionId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function evaluatePromotionsForReservationAction(input: {
  entityId: string
  checkIn: string
  checkOut: string
  country?: string
  totalAmount: number
  promoCode?: string
}) {
  const supabase = await createServiceRoleClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data: promos } = await supabase
    .from('promotions')
    .select('*, promo_codes(id, code, uses_count, max_uses, expires_at)')
    .eq('entity_id', input.entityId)
    .eq('is_active', true)

  const advanceDays = Math.round(
    (new Date(input.checkIn).getTime() - new Date(today).getTime()) / 86400_000
  )
  const nights = Math.max(
    1,
    Math.round((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86400_000)
  )

  const applicable: Array<{ id: string; name: string; discount: number; type: string }> = []
  for (const p of promos ?? []) {
    if (p.valid_from && today < p.valid_from) continue
    if (p.valid_to && today > p.valid_to) continue
    if (p.min_advance_days && advanceDays < p.min_advance_days) continue
    if (p.max_advance_days && advanceDays > p.max_advance_days) continue
    if (p.min_stay_nights && nights < p.min_stay_nights) continue
    if (p.max_stay_nights && nights > p.max_stay_nights) continue
    if (p.country_codes && p.country_codes.length > 0 && input.country && !p.country_codes.includes(input.country)) continue
    if (p.promotion_type === 'promo_code') {
      if (!input.promoCode) continue
      const codes = (p.promo_codes ?? []) as Array<{ code: string; uses_count: number; max_uses: number | null; expires_at: string | null }>
      const match = codes.find((c) => c.code === input.promoCode?.toUpperCase())
      if (!match) continue
      if (match.expires_at && new Date(match.expires_at) < new Date()) continue
      if (match.max_uses && match.uses_count >= match.max_uses) continue
    }
    const discount =
      p.discount_type === 'percentage'
        ? (input.totalAmount * Number(p.discount_value)) / 100
        : p.discount_type === 'fixed_amount'
          ? Number(p.discount_value)
          : 0
    applicable.push({ id: p.id, name: p.name, discount: Math.round(discount * 100) / 100, type: p.promotion_type })
  }
  applicable.sort((a, b) => b.discount - a.discount)
  const bestNonStackable = applicable[0]
  const totalDiscount = bestNonStackable?.discount ?? 0
  return { applicable, total_discount: totalDiscount, final_amount: Math.max(0, input.totalAmount - totalDiscount) }
}

export async function listUpsellOrdersAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('upsell_orders')
    .select('*, upsell_offers(name, category), reservations(reservation_code, guest_name)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export async function updateUpsellOrderStatusAction(id: string, status: string): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'delivered') patch.delivered_at = new Date().toISOString()
  if (status === 'cancelled') patch.cancelled_at = new Date().toISOString()
  const { error } = await supabase.from('upsell_orders').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listCompetitorPricesAction(entityId: string, days = 30) {
  const supabase = await createServiceRoleClient()
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('competitor_prices')
    .select('*')
    .eq('entity_id', entityId)
    .gte('sample_date', since)
    .order('sample_date', { ascending: false })
  return data ?? []
}

export async function recordCompetitorPriceAction(input: {
  tenantId: string
  entityId: string
  competitorName: string
  sampleDate: string
  price: number
  currency?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('competitor_prices').upsert(
    {
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      competitor_name: input.competitorName,
      sample_date: input.sampleDate,
      price: input.price,
      currency: input.currency ?? 'EUR',
      source: 'manual',
    },
    { onConflict: 'entity_id,competitor_name,sample_date' }
  )
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listSmartLocksAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('smart_locks').select('*').eq('entity_id', entityId).order('nickname')
  return data ?? []
}

export async function addSmartLockAction(input: {
  tenantId: string
  entityId: string
  roomId?: string
  provider: string
  providerDeviceId: string
  nickname?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('smart_locks').insert({
    tenant_id: input.tenantId,
    entity_id: input.entityId,
    room_id: input.roomId || null,
    provider: input.provider,
    provider_device_id: input.providerDeviceId,
    nickname: input.nickname,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ============================================================================
// M019: AI GUIDEBOOK
// ============================================================================

export async function listGuidebooksAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('guidebooks')
    .select('*, guidebook_items(count)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createGuidebookAction(input: {
  tenantId: string
  entityId: string
  title: string
  intro?: string
  language?: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('guidebooks')
    .insert({
      tenant_id: input.tenantId,
      entity_id: input.entityId,
      title: input.title,
      intro: input.intro,
      language: input.language ?? 'it',
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: data.id } }
}

export async function addGuidebookItemAction(input: {
  guidebookId: string
  category: string
  name: string
  description?: string
  address?: string
  url?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('guidebook_items').insert({
    guidebook_id: input.guidebookId,
    category: input.category,
    name: input.name,
    description: input.description,
    address: input.address,
    url: input.url,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function publishGuidebookAction(id: string, isPublished: boolean): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('guidebooks').update({ is_published: isPublished }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ============================================================================
// M020: ACCOUNTING + FX + MARKETPLACE
// ============================================================================

export async function listAccountingConnectionsAction(tenantId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('accounting_connections')
    .select('id, provider, entity_id, is_active, last_sync_at, last_sync_status, last_sync_error')
    .eq('tenant_id', tenantId)
  return data ?? []
}

export async function createAccountingConnectionAction(input: {
  tenantId: string
  entityId?: string
  provider: string
  credentials: Record<string, unknown>
  settings?: Record<string, unknown>
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('accounting_connections').upsert(
    {
      tenant_id: input.tenantId,
      entity_id: input.entityId || null,
      provider: input.provider,
      credentials: input.credentials,
      settings: input.settings ?? {},
      is_active: true,
    },
    { onConflict: 'tenant_id,provider,entity_id' }
  )
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getFxRateAction(base: string, quote: string, date?: string) {
  if (base === quote) return { rate: 1, date: date ?? new Date().toISOString().slice(0, 10) }
  const supabase = await createServiceRoleClient()
  const q = supabase
    .from('fx_rates')
    .select('rate, rate_date')
    .eq('base_currency', base)
    .eq('quote_currency', quote)
    .order('rate_date', { ascending: false })
    .limit(1)
  if (date) q.lte('rate_date', date)
  const { data } = await q.maybeSingle()
  return data ? { rate: Number(data.rate), date: data.rate_date } : { rate: 1, date: new Date().toISOString().slice(0, 10) }
}

export async function upsertFxRateAction(input: {
  base: string
  quote: string
  rate: number
  rateDate: string
  source?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('fx_rates').upsert(
    {
      base_currency: input.base,
      quote_currency: input.quote,
      rate: input.rate,
      rate_date: input.rateDate,
      source: input.source ?? 'manual',
    },
    { onConflict: 'base_currency,quote_currency,rate_date' }
  )
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listMarketplaceAppsAction() {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('marketplace_apps')
    .select('id, slug, name, description, pricing_model, pricing_amount, pricing_currency, icon_url, is_verified')
    .eq('is_published', true)
    .order('name')
  return data ?? []
}

export async function listInstalledAppsAction(tenantId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('marketplace_installations')
    .select('id, app_id, granted_scopes, is_active, created_at, marketplace_apps(name, slug, icon_url)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  return data ?? []
}

export async function uninstallAppAction(installationId: string): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('marketplace_installations')
    .update({ is_active: false, uninstalled_at: new Date().toISOString() })
    .eq('id', installationId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
