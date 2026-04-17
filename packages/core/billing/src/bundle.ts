import type { SupabaseClient } from '@supabase/supabase-js'
import type { BundleDiscount, ModuleCatalogEntry, ModuleCode } from './types'

export async function listBundles(supabase: SupabaseClient): Promise<BundleDiscount[]> {
  const { data, error } = await supabase
    .from('bundle_discounts')
    .select('*')
    .eq('active', true)
    .order('min_modules', { ascending: true })
  if (error) throw error
  return (data ?? []) as BundleDiscount[]
}

export function bundleDiscountFor(
  bundles: BundleDiscount[],
  count: number
): number {
  const applicable = bundles.filter((b) => b.active && count >= b.min_modules)
  if (applicable.length === 0) return 0
  return Math.max(...applicable.map((b) => b.discount_percent))
}

export function calculateBundle(params: {
  selected: ModuleCode[]
  catalog: ModuleCatalogEntry[]
  bundles: BundleDiscount[]
  priceOverrides?: Partial<Record<ModuleCode, number>>
}): {
  lineItems: Array<{ code: ModuleCode; label: string; unit: number }>
  subtotal: number
  discountPercent: number
  discountAmount: number
  total: number
} {
  const items = params.selected
    .map((code) => {
      const entry = params.catalog.find((c) => c.code === code)
      if (!entry) return null
      const unit = params.priceOverrides?.[code] ?? entry.base_price_eur
      return { code, label: entry.label, unit }
    })
    .filter(Boolean) as Array<{ code: ModuleCode; label: string; unit: number }>

  const subtotal = items.reduce((s, it) => s + it.unit, 0)
  const discountPercent = bundleDiscountFor(params.bundles, items.length)
  const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2)
  const total = +(subtotal - discountAmount).toFixed(2)
  return { lineItems: items, subtotal, discountPercent, discountAmount, total }
}
