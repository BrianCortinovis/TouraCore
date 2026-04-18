import { createServerSupabaseClient } from '@touracore/db'
import type { ExperienceProduct, ProductStatus } from '../types/database'

export async function listProductsByTenant(
  tenantId: string,
  opts: { status?: ProductStatus; entityId?: string } = {}
): Promise<ExperienceProduct[]> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('experience_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (opts.status) q = q.eq('status', opts.status)
  if (opts.entityId) q = q.eq('entity_id', opts.entityId)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as ExperienceProduct[]
}

export async function getProductBySlug(
  entityId: string,
  slug: string
): Promise<ExperienceProduct | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('experience_products')
    .select('*')
    .eq('entity_id', entityId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as unknown as ExperienceProduct | null
}

export async function getProductById(id: string): Promise<ExperienceProduct | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('experience_products')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as unknown as ExperienceProduct | null
}
