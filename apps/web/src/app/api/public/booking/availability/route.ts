import type { NextRequest } from 'next/server'
import { searchAvailabilityAction } from '../../../../book/[slug]/actions'
import { jsonWithCors } from '../_shared'
import { createServiceRoleClient } from '@touracore/db/server'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

/**
 * GET /api/public/booking/availability?slug=xxx&check_in=...&check_out=...&guests=N&rate_plan_id=...
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const origin = req.headers.get('origin')
  const slug = sp.get('slug')
  const checkIn = sp.get('check_in')
  const checkOut = sp.get('check_out')
  const guests = parseInt(sp.get('guests') ?? '2', 10)
  const ratePlanId = sp.get('rate_plan_id') || undefined

  if (!slug || !checkIn || !checkOut) {
    return jsonWithCors({ error: 'slug, check_in, check_out required' }, { status: 400, origin })
  }

  const supabase = await createServiceRoleClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (!entity) return jsonWithCors({ error: 'Not found' }, { status: 404, origin })

  const items = await searchAvailabilityAction(entity.id, checkIn, checkOut, guests, ratePlanId)
  const nights = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))

  return jsonWithCors(
    {
      nights,
      items: items.map((it) => ({
        roomTypeId: it.roomType.id,
        roomTypeName: it.roomType.name,
        description: it.roomType.description,
        baseOccupancy: it.roomType.base_occupancy,
        maxOccupancy: it.roomType.max_occupancy,
        photos: it.roomType.photos ?? [],
        amenities: it.roomType.amenities,
        sizeSqm: it.roomType.size_sqm,
        bedConfiguration: it.roomType.bed_configuration,
        availableRooms: it.availableRooms,
        totalRooms: it.totalRooms,
        pricePerNight: it.offer?.effectivePricePerNight ?? it.roomType.base_price ?? 0,
        totalPrice: it.offer?.totalPrice ?? (it.roomType.base_price ?? 0),
      })),
    },
    { status: 200, origin }
  )
}
