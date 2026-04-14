import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification, NotificationPreference, CreateNotificationInput } from './types';

export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      tenant_id: input.tenant_id ?? null,
      type: input.type,
      channel: input.channel,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      sent_at: input.channel === 'in_app' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw new Error(`Errore creazione notifica: ${error.message}`);
  return data as Notification;
}

export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Errore lettura notifiche: ${error.message}`);
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw new Error(`Errore conteggio notifiche: ${error.message}`);
  return count ?? 0;
}

export async function markAsRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw new Error(`Errore aggiornamento notifica: ${error.message}`);
}

export async function markAllAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw new Error(`Errore aggiornamento notifiche: ${error.message}`);
}

export async function deleteNotification(
  supabase: SupabaseClient,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw new Error(`Errore eliminazione notifica: ${error.message}`);
}

// --- Preferenze ---

export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('notification_type');

  if (error) throw new Error(`Errore lettura preferenze: ${error.message}`);
  return (data ?? []) as NotificationPreference[];
}

export async function setPreference(
  supabase: SupabaseClient,
  userId: string,
  notificationType: string,
  channel: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        notification_type: notificationType,
        channel,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,notification_type,channel' }
    );

  if (error) throw new Error(`Errore aggiornamento preferenza: ${error.message}`);
}

export async function isNotificationEnabled(
  supabase: SupabaseClient,
  userId: string,
  notificationType: string,
  channel: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return true; // Default: abilitato
    throw new Error(`Errore lettura preferenza: ${error.message}`);
  }
  return (data as { enabled: boolean }).enabled;
}
