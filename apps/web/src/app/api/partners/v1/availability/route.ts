import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@touracore/db/server'
import { checkAvailability } from '@touracore/bike-rental'
import { authenticate, apiSuccess, apiError, finalizeAudit } from '../_auth'

const QuerySchema = z.object({
  entity_id: z.string().uuid(),
  rental_start: z.string(),
  rental_end: z.string(),
  bike_type: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const start = Date.now()
  const { ctx, error } = await authenticate(req, 'availability:read')
  if (error) return error

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    entity_id: url.searchParams.get('entity_id'),
    rental_start: url.searchParams.get('rental_start'),
    rental_end: url.searchParams.get('rental_end'),
    bike_type: url.searchParams.get('bike_type') ?? undefined,
  })
  if (!parsed.success) {
    await finalizeAudit(ctx, req, 400, Date.now() - start, 'invalid_query')
    return apiError(400, 'invalid_query', parsed.error.message)
  }

  // Verify entity belongs to partner's tenant
  const supabase = await createServiceRoleClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, kind, tenant_id')
    .eq('id', parsed.data.entity_id)
    .maybeSingle()
  if (!entity || entity.tenant_id !== ctx.partner.tenant_id) {
    await finalizeAudit(ctx, req, 404, Date.now() - start, 'entity_not_found')
    return apiError(404, 'entity_not_found', 'Entity not in your tenant')
  }

  if (entity.kind !== 'bike_rental') {
    await finalizeAudit(ctx, req, 501, Date.now() - start, 'vertical_not_supported')
    return apiError(
      501,
      'vertical_not_supported',
      `Availability API for kind=${entity.kind} not yet available. Supported: bike_rental.`,
    )
  }

  try {
    const avail = await checkAvailability({
      bikeRentalId: parsed.data.entity_id,
      rentalStart: parsed.data.rental_start,
      rentalEnd: parsed.data.rental_end,
      bikeType: parsed.data.bike_type as never,
      usePublicClient: true,
    })
    const res = apiSuccess({
      entity_id: parsed.data.entity_id,
      rental_start: parsed.data.rental_start,
      rental_end: parsed.data.rental_end,
      availability: avail,
    })
    await finalizeAudit(ctx, req, 200, Date.now() - start)
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await finalizeAudit(ctx, req, 500, Date.now() - start, 'internal')
    return apiError(500, 'internal', msg)
  }
}
