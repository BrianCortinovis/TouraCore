'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import type {
  DailyStats,
  PriceSuggestion,
  PricingRule,
  RatePlan,
  RoomType,
} from '@touracore/hospitality/src/types/database'
import {
  acceptSuggestion,
  calculateSuggestions,
  createPricingRule,
  deletePricingRule,
  rejectSuggestion,
  snapshotDailyStats,
  togglePricingRule,
  updatePricingRule,
  type CreatePricingRuleData,
  type UpdatePricingRuleData,
} from '@touracore/hospitality/src/actions/revenue'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export interface RevenueDashboardData {
  latestStats: DailyStats | null
  dailyStats: DailyStats[]
  pricingRules: PricingRule[]
  priceSuggestions: (PriceSuggestion & {
    room_type: Pick<RoomType, 'id' | 'name' | 'code'> | null
  })[]
  roomTypes: Pick<RoomType, 'id' | 'name' | 'code'>[]
  ratePlans: Pick<RatePlan, 'id' | 'name' | 'code'>[]
}

async function getPropertyId() {
  const bootstrap = await getAuthBootstrapData()
  return bootstrap.property?.id ?? null
}

export async function loadRevenueDashboardAction(): Promise<RevenueDashboardData> {
  const propertyId = await getPropertyId()
  if (!propertyId) {
    return {
      latestStats: null,
      dailyStats: [],
      pricingRules: [],
      priceSuggestions: [],
      roomTypes: [],
      ratePlans: [],
    }
  }

  const supabase = await createServerSupabaseClient()

  const [
    dailyStatsRes,
    pricingRulesRes,
    priceSuggestionsRes,
    roomTypesRes,
    ratePlansRes,
  ] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('*')
      .eq('entity_id', propertyId)
      .order('date', { ascending: false })
      .limit(14),
    supabase
      .from('pricing_rules')
      .select('*, room_type:room_types(id, name, code), rate_plan:rate_plans(id, name, code)')
      .eq('entity_id', propertyId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('price_suggestions')
      .select('*, room_type:room_types(id, name, code)')
      .eq('entity_id', propertyId)
      .order('date', { ascending: false })
      .limit(50),
    supabase
      .from('room_types')
      .select('id, name, code')
      .eq('entity_id', propertyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('rate_plans')
      .select('id, name, code')
      .eq('entity_id', propertyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  return {
    latestStats: (dailyStatsRes.data ?? [])[0] ?? null,
    dailyStats: (dailyStatsRes.data ?? []) as DailyStats[],
    pricingRules: (pricingRulesRes.data ?? []) as PricingRule[],
    priceSuggestions: (priceSuggestionsRes.data ?? []) as RevenueDashboardData['priceSuggestions'],
    roomTypes: (roomTypesRes.data ?? []) as Pick<RoomType, 'id' | 'name' | 'code'>[],
    ratePlans: (ratePlansRes.data ?? []) as Pick<RatePlan, 'id' | 'name' | 'code'>[],
  }
}

export async function savePricingRuleAction(
  input: Omit<CreatePricingRuleData, 'entity_id'> & { id?: string }
): Promise<ActionResult> {
  const propertyId = await getPropertyId()
  if (!propertyId) return { success: false, error: 'Nessuna struttura selezionata.' }

  try {
    if (input.id) {
      const { id, ...payload } = input
      const rule = await updatePricingRule(id, payload as UpdatePricingRuleData)
      revalidatePath('/revenue')
      return { success: true, data: rule }
    }

    const { id: _ignoredId, ...createPayload } = input
    const rule = await createPricingRule(createPayload)
    revalidatePath('/revenue')
    return { success: true, data: rule }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function togglePricingRuleAction(id: string): Promise<ActionResult> {
  try {
    const rule = await togglePricingRule(id)
    revalidatePath('/revenue')
    return { success: true, data: rule }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deletePricingRuleAction(id: string): Promise<ActionResult> {
  try {
    await deletePricingRule(id)
    revalidatePath('/revenue')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function acceptPriceSuggestionAction(id: string): Promise<ActionResult> {
  try {
    const suggestion = await acceptSuggestion(id)
    revalidatePath('/revenue')
    return { success: true, data: suggestion }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function rejectPriceSuggestionAction(id: string): Promise<ActionResult> {
  try {
    const suggestion = await rejectSuggestion(id)
    revalidatePath('/revenue')
    return { success: true, data: suggestion }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function refreshRevenueSnapshotAction(): Promise<ActionResult> {
  try {
    const snapshot = await snapshotDailyStats()
    return { success: true, data: snapshot }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function recalculateRevenueSuggestionsAction(): Promise<ActionResult> {
  try {
    await snapshotDailyStats()
    const result = await calculateSuggestions()
    revalidatePath('/revenue')
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
