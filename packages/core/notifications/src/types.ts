import { z } from 'zod';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export interface Notification {
  id: string;
  user_id: string;
  tenant_id: string | null;
  type: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  channel: NotificationChannel;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const CreateNotificationSchema = z.object({
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  type: z.string().min(1).max(100),
  channel: z.enum(['in_app', 'email', 'push']),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(5000),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;

export const NotificationPreferenceSchema = z.object({
  notification_type: z.string().min(1),
  channel: z.enum(['in_app', 'email', 'push']),
  enabled: z.boolean(),
});

export type NotificationPreferenceInput = z.infer<typeof NotificationPreferenceSchema>;

export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_MODIFIED: 'booking.modified',
  GUEST_CHECKIN: 'guest.checkin',
  GUEST_CHECKOUT: 'guest.checkout',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  SYSTEM_ALERT: 'system.alert',
  WELCOME: 'system.welcome',
} as const;
