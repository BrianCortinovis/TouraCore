import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import type { BookingContext, BookingTemplate, BookingLocale } from '@touracore/hospitality/src/components/booking'
import { normalizeTheme } from '@touracore/hospitality/src/components/booking/core/theme'
import { getPublicBookingContextAction } from './actions'
import { BookingPageClient } from './booking-page-client'

export const dynamic = 'force-dynamic'

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pub = await getPublicBookingContextAction(slug)
  if (!pub.property) notFound()

  const supabase = await createServiceRoleClient()
  const { data: acc } = await supabase
    .from('accommodations')
    .select('booking_template, booking_theme, default_language, default_currency, pet_policy, tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_payment_policy')
    .eq('entity_id', pub.property.id)
    .maybeSingle()

  const template = (acc?.booking_template ?? 'minimal') as BookingTemplate
  const theme = normalizeTheme(acc?.booking_theme)

  // Tourist tax preview rates
  let touristTax: BookingContext['touristTax']
  if (acc?.tourist_tax_enabled) {
    const { data: rates } = await supabase
      .from('tourist_tax_rates')
      .select('rate_per_person, category')
      .eq('entity_id', pub.property.id)
      .eq('is_active', true)
    const adultRate = Number((rates ?? []).find((r) => r.category === 'adult')?.rate_per_person ?? 0)
    const childRate = Number((rates ?? []).find((r) => r.category === 'child_0-9')?.rate_per_person ?? 0)
    touristTax = {
      enabled: true,
      paymentPolicy: (acc.tourist_tax_payment_policy ?? 'onsite_only') as 'online_only' | 'onsite_only' | 'guest_choice',
      adultRatePerNight: adultRate,
      childRatePerNight: childRate,
      maxTaxableNights: acc.tourist_tax_max_nights ?? 5,
    }
  }

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
      id: rp.id,
      name: rp.name,
      code: rp.code,
      description: rp.description,
      meal_plan: rp.meal_plan,
      rate_type: rp.rate_type,
      sort_order: rp.sort_order,
      cancellation_policy_text: pub.cancellationPolicyText,
    })),
    upsells: pub.upsells.map((u) => ({
      id: u.id,
      name: u.name,
      description: u.description,
      price: u.price,
      category: u.category,
      charge_mode: u.charge_mode,
      pricing_mode: u.pricing_mode,
      max_quantity: u.max_quantity,
      sort_order: u.sort_order,
    })),
    defaultRatePlanId: pub.defaultRatePlanId,
    cancellationPolicyText: pub.cancellationPolicyText,
    theme,
    template,
    touristTax,
  }

  return <BookingPageClient context={context} />
}
