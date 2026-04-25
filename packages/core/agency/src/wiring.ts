import { createServiceRoleClient } from '@touracore/db/server'
import { accrueCommission, reverseCommissionForReservation, type ReservationType } from './commissions'

type Vertical = 'hospitality' | 'restaurant' | 'experience' | 'bike'

const VERTICAL_TO_TYPE: Record<Vertical, ReservationType> = {
  hospitality: 'hospitality',
  restaurant: 'restaurant',
  experience: 'experience',
  bike: 'bike',
}

const ACCRUE_STATUSES = new Set([
  'confirmed',
  'checked_in',
  'checked_out',
  'completed',
  'returned',
  'finished',
  'seated',
])

const REVERSE_STATUSES = new Set(['cancelled', 'no_show'])

interface OnStatusChangeInput {
  vertical: Vertical
  reservationId: string
  newStatus: string
  previousStatus?: string | null
}

async function resolveAgencyForTenant(tenantId: string): Promise<string | null> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('agency_tenant_links')
    .select('agency_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return (data as { agency_id: string } | null)?.agency_id ?? null
}

interface ReservationFinancials {
  tenantId: string
  entityId: string | null
  grossAmount: number
  currency: string
}

async function fetchReservationFinancials(
  vertical: Vertical,
  reservationId: string,
): Promise<ReservationFinancials | null> {
  const supabase = await createServiceRoleClient()

  if (vertical === 'hospitality') {
    const { data } = await supabase
      .from('reservations')
      .select('entity_id, total_amount, currency, entities:entity_id(tenant_id)')
      .eq('id', reservationId)
      .maybeSingle()
    if (!data) return null
    const row = data as {
      entity_id: string | null
      total_amount: number | null
      currency: string | null
      entities: { tenant_id: string } | { tenant_id: string }[] | null
    }
    const entity = Array.isArray(row.entities) ? row.entities[0] : row.entities
    if (!entity?.tenant_id) return null
    return {
      tenantId: entity.tenant_id,
      entityId: row.entity_id,
      grossAmount: Number(row.total_amount ?? 0),
      currency: row.currency ?? 'EUR',
    }
  }

  if (vertical === 'restaurant') {
    const { data } = await supabase
      .from('restaurant_reservations')
      .select('restaurant_id, deposit_amount, covers_billed_to_folio, restaurants:restaurant_id(tenant_id, entity_id)')
      .eq('id', reservationId)
      .maybeSingle()
    if (!data) return null
    const row = data as {
      restaurant_id: string
      deposit_amount: number | null
      covers_billed_to_folio: number | null
      restaurants: { tenant_id: string; entity_id: string | null } | { tenant_id: string; entity_id: string | null }[] | null
    }
    const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants
    if (!restaurant?.tenant_id) return null
    const gross = Number(row.covers_billed_to_folio ?? 0) || Number(row.deposit_amount ?? 0)
    return {
      tenantId: restaurant.tenant_id,
      entityId: restaurant.entity_id ?? null,
      grossAmount: gross,
      currency: 'EUR',
    }
  }

  if (vertical === 'bike') {
    const { data } = await supabase
      .from('bike_rental_reservations')
      .select('tenant_id, bike_rental_id, total_amount, currency, bike_rentals:bike_rental_id(entity_id)')
      .eq('id', reservationId)
      .maybeSingle()
    if (!data) return null
    const row = data as {
      tenant_id: string
      total_amount: number | null
      currency: string | null
      bike_rentals: { entity_id: string | null } | { entity_id: string | null }[] | null
    }
    const br = Array.isArray(row.bike_rentals) ? row.bike_rentals[0] : row.bike_rentals
    return {
      tenantId: row.tenant_id,
      entityId: br?.entity_id ?? null,
      grossAmount: Number(row.total_amount ?? 0),
      currency: row.currency ?? 'EUR',
    }
  }

  if (vertical === 'experience') {
    const { data } = await supabase
      .from('experience_reservations')
      .select('tenant_id, entity_id, total_cents, currency')
      .eq('id', reservationId)
      .maybeSingle()
    if (!data) return null
    const row = data as {
      tenant_id: string
      entity_id: string | null
      total_cents: number | null
      currency: string | null
    }
    return {
      tenantId: row.tenant_id,
      entityId: row.entity_id,
      grossAmount: Number(row.total_cents ?? 0) / 100,
      currency: row.currency ?? 'EUR',
    }
  }

  return null
}

/**
 * Hook to call from any reservation status-update flow.
 * Idempotent: accrueCommission is unique per (agency_id, reservation_type, reservation_id),
 * reverse only acts on rows in 'accrued' state.
 * Failures are swallowed (logged) so they never break the booking flow.
 */
export async function onReservationStatusChange(input: OnStatusChangeInput): Promise<void> {
  try {
    const fin = await fetchReservationFinancials(input.vertical, input.reservationId)
    if (!fin) return

    const agencyId = await resolveAgencyForTenant(fin.tenantId)
    if (!agencyId) return // tenant senza agenzia: nessuna commissione

    const reservationType = VERTICAL_TO_TYPE[input.vertical]
    const newStatus = input.newStatus.toLowerCase()
    const prevStatus = input.previousStatus?.toLowerCase() ?? null

    if (REVERSE_STATUSES.has(newStatus)) {
      await reverseCommissionForReservation(agencyId, reservationType, input.reservationId)
      return
    }

    const wasAccruing = prevStatus ? ACCRUE_STATUSES.has(prevStatus) : false
    if (ACCRUE_STATUSES.has(newStatus) && !wasAccruing) {
      if (fin.grossAmount <= 0) return // nulla da maturare
      await accrueCommission({
        agencyId,
        tenantId: fin.tenantId,
        entityId: fin.entityId ?? undefined,
        reservationType,
        reservationId: input.reservationId,
        grossAmount: fin.grossAmount,
        currency: fin.currency,
        metadata: { source: 'status_change', new_status: newStatus, prev_status: prevStatus },
      })
    }
  } catch (err) {
    console.error('[agency-wiring] onReservationStatusChange failed', {
      vertical: input.vertical,
      reservationId: input.reservationId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
