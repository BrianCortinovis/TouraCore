import { z } from 'zod';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'canceled' | 'completed' | 'no_show';
export type BookingSource = 'direct' | 'portal' | 'widget' | 'api';

export interface Booking {
  id: string;
  tenant_id: string;
  entity_id: string | null;
  portal_id: string | null;
  guest_id: string | null;
  vertical: string;
  status: BookingStatus;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
  online_checkin_completed: boolean;
  online_checkin_at: string | null;
  pet_count: number;
  pet_details: Record<string, unknown> | null;
  total_amount: number;
  currency: string;
  commission_amount: number;
  commission_rate: number;
  notes: string | null;
  vertical_data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  source: BookingSource;
  stripe_payment_intent_id: string | null;
  canceled_at: string | null;
  canceled_reason: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CreateBookingSchema = z.object({
  tenant_id: z.string().uuid(),
  entity_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  portal_id: z.string().uuid().optional(),
  vertical: z.string().default('hospitality'),
  guest_name: z.string().min(1).max(200),
  guest_email: z.string().email(),
  guest_phone: z.string().max(30).optional(),
  check_in: z.string().date(),
  check_out: z.string().date(),
  total_amount: z.number().min(0),
  currency: z.string().default('EUR'),
  notes: z.string().max(2000).optional(),
  vertical_data: z.record(z.string(), z.unknown()).optional(),
  source: z.enum(['direct', 'portal', 'widget', 'api']).default('direct'),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const UpdateBookingSchema = z.object({
  guest_name: z.string().min(1).max(200).optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().max(30).optional(),
  check_in: z.string().date().optional(),
  check_out: z.string().date().optional(),
  total_amount: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  vertical_data: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;

export const BookingQuerySchema = z.object({
  tenant_id: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'canceled', 'completed', 'no_show']).optional(),
  source: z.enum(['direct', 'portal', 'widget', 'api']).optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

export type BookingQuery = z.infer<typeof BookingQuerySchema>;

// Transizioni di stato valide
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['checked_in', 'canceled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: ['completed'],
  canceled: [],
  completed: [],
  no_show: [],
};
