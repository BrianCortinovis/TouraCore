import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@touracore/db/server'
import { createReservation } from '@touracore/bike-rental'
import { authenticate, apiSuccess, apiError, finalizeAudit } from '../_auth'

const BookingBody = z.object({
  entity_id: z.string().uuid(),
  vertical: z.enum(['bike_rental']), // Phase 1 solo bike_rental
  rental_start: z.string(),
  rental_end: z.string(),
  items: z.array(
    z.object({
      bike_type_id: z.string().uuid(),
      bike_type_key: z.string(),
      quantity: z.number().int().min(1),
    }),
  ),
  addons: z.array(z.object({ addon_key: z.string(), quantity: z.number().default(1) })).optional(),
  insurance_tier: z.enum(['none', 'basic', 'standard', 'premium']).optional(),
  pickup_location_id: z.string().uuid().optional(),
  return_location_id: z.string().uuid().optional(),
  guest: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  partner_link_code: z.string().optional(),
  voucher_code: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const start = Date.now()
  const { ctx, error } = await authenticate(req, 'bookings:write')
  if (error) return error

  let body
  try {
    body = BookingBody.parse(await req.json())
  } catch (e) {
    await finalizeAudit(ctx, req, 400, Date.now() - start, 'invalid_body')
    return apiError(400, 'invalid_body', e instanceof Error ? e.message : String(e))
  }

  // Verify entity belongs to partner's tenant
  const supabase = await createServiceRoleClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, kind, tenant_id')
    .eq('id', body.entity_id)
    .maybeSingle()
  if (!entity || entity.tenant_id !== ctx.partner.tenant_id) {
    await finalizeAudit(ctx, req, 404, Date.now() - start, 'entity_not_found')
    return apiError(404, 'entity_not_found', 'Entity not in your tenant')
  }

  if (body.vertical !== 'bike_rental' || entity.kind !== 'bike_rental') {
    await finalizeAudit(ctx, req, 501, Date.now() - start, 'vertical_not_supported')
    return apiError(501, 'vertical_not_supported', 'Phase 1: only bike_rental supported')
  }

  // Auto-resolve partner_link_code: se non fornito, usa primo link 'api' channel del partner
  let partnerRef = body.partner_link_code
  if (!partnerRef) {
    const { data: link } = await supabase
      .from('partner_links')
      .select('code')
      .eq('partner_id', ctx.partner.id)
      .eq('channel', 'api')
      .eq('active', true)
      .limit(1)
      .maybeSingle()
    partnerRef = (link as { code?: string } | null)?.code
  }

  try {
    const result = await createReservation({
      bikeRentalId: body.entity_id,
      rentalStart: body.rental_start,
      rentalEnd: body.rental_end,
      items: body.items.map((i) => ({
        bikeTypeId: i.bike_type_id,
        bikeTypeKey: i.bike_type_key,
        quantity: i.quantity,
      })),
      addons: body.addons?.map((a) => ({ addonKey: a.addon_key, quantity: a.quantity })),
      insuranceTier: body.insurance_tier,
      pickupLocationId: body.pickup_location_id,
      returnLocationId: body.return_location_id,
      guest: body.guest,
      source: 'api',
      voucherCode: body.voucher_code,
      partnerRef,
      actorIp: ctx.ip ?? undefined,
      usePublicClient: true,
    })

    if (!result.success) {
      await finalizeAudit(ctx, req, 422, Date.now() - start, 'booking_failed')
      return apiError(422, 'booking_failed', result.error ?? 'unknown')
    }

    const res = apiSuccess(
      {
        reservation_id: result.reservationId,
        reference_code: result.referenceCode,
        total_amount: result.quote?.totalAmount,
        currency: result.quote?.currency,
        status: 'pending',
      },
      201,
    )
    await finalizeAudit(ctx, req, 201, Date.now() - start)
    return res
  } catch (e) {
    await finalizeAudit(ctx, req, 500, Date.now() - start, 'internal')
    return apiError(500, 'internal', e instanceof Error ? e.message : String(e))
  }
}
