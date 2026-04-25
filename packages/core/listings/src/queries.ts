import type { SupabaseClient } from '@supabase/supabase-js'
import { publicListingSchema, type PublicListing } from './types'

export type GetListingUrlOptions = {
  locale?: 'it' | 'en' | 'de' | 'fr'
  baseUrl?: string
}

/** Build public listing URL: /s/{tenantSlug}/{slug} (locale optional prefix) */
export function getListingUrl(
  tenantSlug: string,
  slug: string,
  opts: GetListingUrlOptions = {}
): string {
  const localePrefix = opts.locale && opts.locale !== 'it' ? `/${opts.locale}` : ''
  const path = `${localePrefix}/s/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(slug)}`
  return opts.baseUrl ? new URL(path, opts.baseUrl).toString() : path
}

/** Build booking engine URL (unified multi-vertical) */
export function getBookingUrl(tenantSlug: string, opts: GetListingUrlOptions = {}): string {
  const localePrefix = opts.locale && opts.locale !== 'it' ? `/${opts.locale}` : ''
  const path = `${localePrefix}/book/multi/${encodeURIComponent(tenantSlug)}`
  return opts.baseUrl ? new URL(path, opts.baseUrl).toString() : path
}

/**
 * Fetch a single published listing from public_listings_view.
 * View enforces is_public=true and active tenant/entity.
 * Returns null if not found.
 */
export async function getPublicListing(
  supabase: SupabaseClient,
  tenantSlug: string,
  slug: string
): Promise<PublicListing | null> {
  const { data, error } = await supabase
    .from('public_listings_view')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  const parsed = publicListingSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

/** List all published listings for a tenant (used by tenant portal page) */
export async function listTenantPublicListings(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<PublicListing[]> {
  const { data, error } = await supabase
    .from('public_listings_view')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('entity_kind', { ascending: true })
    .order('entity_name', { ascending: true })

  if (error || !data) return []
  return data
    .map((row) => publicListingSchema.safeParse(row))
    .filter((r): r is { success: true; data: PublicListing } => r.success)
    .map((r) => r.data)
}

/** List every published listing across tenants (portale aggregatore) */
export async function listAllPublicListings(
  supabase: SupabaseClient,
  opts: { limit?: number; kind?: string } = {}
): Promise<PublicListing[]> {
  let q = supabase
    .from('public_listings_view')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (opts.kind) q = q.eq('entity_kind', opts.kind)
  if (opts.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error || !data) return []
  return data
    .map((row) => publicListingSchema.safeParse(row))
    .filter((r): r is { success: true; data: PublicListing } => r.success)
    .map((r) => r.data)
}

export type PublicListingCard = {
  listing_id: string
  tenant_slug: string
  tenant_name: string
  slug: string
  entity_id: string
  entity_kind: string
  entity_name: string
  hero_url: string | null
  tagline: string | null
  updated_at: string | null
}

/**
 * Variante leggera per pagine indice (discover, sitemap card view).
 * Riduce ~80% del payload rispetto a SELECT *: niente description, amenities, gallery, SEO fields.
 */
export async function listAllPublicListingsCards(
  supabase: SupabaseClient,
  opts: { limit?: number; kind?: string } = {}
): Promise<PublicListingCard[]> {
  let q = supabase
    .from('public_listings_view')
    .select('listing_id, tenant_slug, tenant_name, slug, entity_id, entity_kind, entity_name, hero_url, og_image_url, tagline, updated_at')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (opts.kind) q = q.eq('entity_kind', opts.kind)
  if (opts.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error || !data) return []
  return (data as Array<PublicListingCard & { og_image_url: string | null }>).map((r) => ({
    ...r,
    hero_url: r.hero_url ?? r.og_image_url,
  }))
}
