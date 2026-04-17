import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import type { BookingContext, BookingTemplate, BookingLocale } from '@touracore/hospitality/src/components/booking'
import { normalizeTheme } from '@touracore/hospitality/src/components/booking/core/theme'
import { getPublicBookingContextAction } from '../../book/[slug]/actions'
import { EmbedClient } from './embed-client'

export const dynamic = 'force-dynamic'

/**
 * Route /embed/[slug] — ottimizzata per iframe embed:
 * - senza cornice/padding esterno (solo contenuto)
 * - postMessage di resize al parent window
 * - query params per override template/theme
 * - no powered_by se tenant ha disabilitato
 */
export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const q = await searchParams

  const pub = await getPublicBookingContextAction(slug)
  if (!pub.property) notFound()

  const supabase = await createServiceRoleClient()
  const { data: acc } = await supabase
    .from('accommodations')
    .select('booking_template, booking_theme, default_language, default_currency, pet_policy')
    .eq('entity_id', pub.property.id)
    .maybeSingle()

  const templateParam = typeof q.template === 'string' ? q.template : undefined
  const template = ((templateParam && ['minimal', 'luxury', 'mobile'].includes(templateParam))
    ? templateParam
    : (acc?.booking_template ?? 'minimal')) as BookingTemplate

  const theme = normalizeTheme(acc?.booking_theme)
  // Override da query params (per preview live)
  if (typeof q.accent === 'string') theme.accent_color = '#' + q.accent.replace(/^#/, '')
  if (typeof q.hide_powered === 'string') theme.show_powered_by = false

  const context: BookingContext = {
    property: {
      id: pub.property.id,
      slug: pub.property.slug,
      name: pub.property.name,
      short_description: pub.property.short_description ?? null,
      default_currency: (pub.property.default_currency as string) ?? 'EUR',
      default_language: ((pub.property.default_language as string) ?? 'it') as BookingLocale,
      pet_policy: pub.property.pet_policy,
    },
    ratePlans: pub.ratePlans.map((rp) => ({
      id: rp.id, name: rp.name, code: rp.code, description: rp.description,
      meal_plan: rp.meal_plan, rate_type: rp.rate_type, sort_order: rp.sort_order,
      cancellation_policy_text: pub.cancellationPolicyText,
    })),
    upsells: pub.upsells.map((u) => ({
      id: u.id, name: u.name, description: u.description, price: u.price,
      category: u.category, charge_mode: u.charge_mode, pricing_mode: u.pricing_mode,
      max_quantity: u.max_quantity, sort_order: u.sort_order,
    })),
    defaultRatePlanId: pub.defaultRatePlanId,
    cancellationPolicyText: pub.cancellationPolicyText,
    theme,
    template,
  }

  return <EmbedClient context={context} />
}
