import type { SupabaseClient } from '@supabase/supabase-js';
import type { Booking, BookingQuery, CreateBookingInput, UpdateBookingInput, BookingStatus } from './types';
import { VALID_TRANSITIONS } from './types';

export async function createBooking(
  supabase: SupabaseClient,
  input: CreateBookingInput,
  userId?: string
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...input,
      portal_id: input.portal_id ?? null,
      vertical_data: input.vertical_data ?? {},
      created_by: userId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Errore creazione booking: ${error.message}`);
  return data as Booking;
}

export async function getBookingById(
  supabase: SupabaseClient,
  id: string
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Errore query booking: ${error.message}`);
  }
  return data as Booking;
}

export async function listBookings(
  supabase: SupabaseClient,
  query: BookingQuery
): Promise<{ data: Booking[]; count: number }> {
  const from = (query.page - 1) * query.per_page;
  const to = from + query.per_page - 1;

  let q = supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .eq('tenant_id', query.tenant_id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query.status) q = q.eq('status', query.status);
  if (query.source) q = q.eq('source', query.source);
  if (query.from_date) q = q.gte('check_in', query.from_date);
  if (query.to_date) q = q.lte('check_out', query.to_date);
  if (query.search) {
    q = q.or(`guest_name.ilike.%${query.search}%,guest_email.ilike.%${query.search}%`);
  }

  const { data, count, error } = await q;
  if (error) throw new Error(`Errore query bookings: ${error.message}`);
  return { data: (data ?? []) as Booking[], count: count ?? 0 };
}

export async function updateBooking(
  supabase: SupabaseClient,
  id: string,
  input: UpdateBookingInput
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Errore aggiornamento booking: ${error.message}`);
  return data as Booking;
}

export async function transitionBookingStatus(
  supabase: SupabaseClient,
  id: string,
  newStatus: BookingStatus,
  reason?: string
): Promise<Booking> {
  const booking = await getBookingById(supabase, id);
  if (!booking) throw new Error(`Booking non trovato: ${id}`);

  const allowed = VALID_TRANSITIONS[booking.status];
  if (!allowed?.includes(newStatus)) {
    throw new Error(
      `Transizione non valida: ${booking.status} → ${newStatus}. Consentite: ${allowed?.join(', ') ?? 'nessuna'}`
    );
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'confirmed') updateData['confirmed_at'] = now;
  if (newStatus === 'checked_in') updateData['actual_check_in'] = now;
  if (newStatus === 'checked_out') updateData['actual_check_out'] = now;
  if (newStatus === 'completed') updateData['completed_at'] = now;
  if (newStatus === 'canceled') {
    updateData['canceled_at'] = now;
    if (reason) updateData['canceled_reason'] = reason;
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Errore transizione booking: ${error.message}`);
  return data as Booking;
}

export async function deleteBooking(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Errore eliminazione booking: ${error.message}`);
}

export async function getBookingStats(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Record<BookingStatus, number>> {
  const stats: Record<BookingStatus, number> = {
    pending: 0,
    confirmed: 0,
    checked_in: 0,
    checked_out: 0,
    canceled: 0,
    completed: 0,
    no_show: 0,
  };

  const { data, error } = await supabase
    .from('bookings')
    .select('status')
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`Errore stats booking: ${error.message}`);

  for (const row of data ?? []) {
    const s = (row as { status: BookingStatus }).status;
    if (s in stats) stats[s]++;
  }

  return stats;
}
