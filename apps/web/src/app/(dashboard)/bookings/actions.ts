'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  createBooking,
  listBookings,
  transitionBookingStatus,
  getBookingStats,
  CreateBookingSchema,
  type BookingStatus,
} from '@touracore/booking'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listBookingsAction(
  page = 1,
  status?: string,
  search?: string
) {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[listBookingsAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  return listBookings(supabase, {
    tenant_id: bootstrap.tenant.id,
    page,
    per_page: 20,
    status: status as BookingStatus | undefined,
    search: search || undefined,
  })
}

export async function createBookingAction(input: unknown): Promise<ActionResult> {

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessun tenant attivo.' }

  const parsed = CreateBookingSchema.safeParse({
    ...(input as Record<string, unknown>),
    tenant_id: bootstrap.tenant.id,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  try {
    const booking = await createBooking(supabase, parsed.data, user.id)

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: 'booking.create',
      entityType: 'booking',
      entityId: booking.id,
      newData: { guest_name: booking.guest_name, status: booking.status, total_amount: booking.total_amount },
    })

    revalidatePath('/bookings')
    return { success: true, data: booking }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function transitionStatusAction(
  bookingId: string,
  newStatus: string,
  reason?: string
): Promise<ActionResult> {

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessun tenant attivo.' }

  try {
    const booking = await transitionBookingStatus(
      supabase,
      bookingId,
      newStatus as BookingStatus,
      reason
    )

    const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
    await logAudit({
      context: auditCtx,
      action: `booking.${newStatus}`,
      entityType: 'booking',
      entityId: bookingId,
      newData: { status: newStatus, reason },
    })

    revalidatePath('/bookings')
    return { success: true, data: booking }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function getBookingStatsAction() {
  const supabase = await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) {
    console.warn('[getBookingStatsAction] TENANT_REQUIRED — utente senza organizzazione')
    throw new Error('TENANT_REQUIRED')
  }

  return getBookingStats(supabase, bootstrap.tenant.id)
}
