import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification, isNotificationEnabled } from './queries';
import { sendEmail } from './email';
import type { CreateNotificationInput } from './types';

export interface NotifyInput {
  userId: string;
  tenantId?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  email?: {
    to: string;
    subject: string;
    html: string;
  };
}

/**
 * Invia una notifica in-app e opzionalmente via email.
 * Rispetta le preferenze utente.
 */
export async function notify(
  supabase: SupabaseClient,
  input: NotifyInput
): Promise<{ inApp: boolean; email: boolean }> {
  const result = { inApp: false, email: false };

  const inAppEnabled = await isNotificationEnabled(supabase, input.userId, input.type, 'in_app');
  if (inAppEnabled) {
    const inAppInput: CreateNotificationInput = {
      user_id: input.userId,
      tenant_id: input.tenantId,
      type: input.type,
      channel: 'in_app',
      title: input.title,
      body: input.body,
      data: input.data,
    };
    await createNotification(supabase, inAppInput);
    result.inApp = true;
  }

  if (input.email) {
    const emailEnabled = await isNotificationEnabled(supabase, input.userId, input.type, 'email');
    if (emailEnabled) {
      try {
        await sendEmail({
          to: input.email.to,
          subject: input.email.subject,
          html: input.email.html,
        });

        const emailInput: CreateNotificationInput = {
          user_id: input.userId,
          tenant_id: input.tenantId,
          type: input.type,
          channel: 'email',
          title: input.title,
          body: input.body,
          data: { ...input.data, email_to: input.email.to },
        };
        await createNotification(supabase, emailInput);
        result.email = true;
      } catch (err) {
        const emailInput: CreateNotificationInput = {
          user_id: input.userId,
          tenant_id: input.tenantId,
          type: input.type,
          channel: 'email',
          title: input.title,
          body: `Invio fallito: ${err instanceof Error ? err.message : 'errore sconosciuto'}`,
          data: { ...input.data, email_error: true },
        };
        await createNotification(supabase, emailInput);
      }
    }
  }

  return result;
}
