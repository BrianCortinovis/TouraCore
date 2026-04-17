import type { NextRequest } from 'next/server'
import { getPublicBookingContextAction } from '../../../../book/[slug]/actions'
import { createServiceRoleClient } from '@touracore/db/server'
import { normalizeTheme } from '@touracore/hospitality/src/components/booking/core/theme'
import { jsonWithCors } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

/**
 * GET /api/public/booking/context?slug=xxx
 * Ritorna property + rate plans + upsells + theme + template. Pubblico, no auth.
 * Rate limit affidato a Vercel/Cloudflare edge.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const origin = req.headers.get('origin')

  if (!slug) return jsonWithCors({ error: 'slug required' }, { status: 400, origin })

  const pub = await getPublicBookingContextAction(slug)
  if (!pub.property) return jsonWithCors({ error: 'Not found' }, { status: 404, origin })

  const supabase = await createServiceRoleClient()
  const { data: acc } = await supabase
    .from('accommodations')
    .select('booking_template, booking_theme')
    .eq('entity_id', pub.property.id)
    .maybeSingle()

  const theme = normalizeTheme(acc?.booking_theme)
  const template = acc?.booking_template ?? 'minimal'

  return jsonWithCors(
    {
      property: pub.property,
      ratePlans: pub.ratePlans,
      upsells: pub.upsells,
      defaultRatePlanId: pub.defaultRatePlanId,
      cancellationPolicyText: pub.cancellationPolicyText,
      theme,
      template,
    },
    { status: 200, origin }
  )
}
