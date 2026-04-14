'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  setPreference,
} from '@touracore/notifications/server'

interface ActionResult {
  success: boolean
  error?: string
}

export async function listNotificationsAction(unreadOnly = false) {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) {
    console.warn('[listNotificationsAction] Utente non autenticato')
    throw new Error('TENANT_REQUIRED')
  }

  return listNotifications(supabase, user.id, { unreadOnly })
}

export async function getUnreadCountAction(): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) {
    console.warn('[getUnreadCountAction] Utente non autenticato')
    return 0
  }

  return getUnreadCount(supabase, user.id)
}

export async function markAsReadAction(notificationId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  try {
    await markAsRead(supabase, notificationId)
    revalidatePath('/notifications')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function markAllAsReadAction(): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  try {
    await markAllAsRead(supabase, user.id)
    revalidatePath('/notifications')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteNotificationAction(notificationId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  try {
    await deleteNotification(supabase, notificationId)
    revalidatePath('/notifications')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function getPreferencesAction() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) {
    console.warn('[getPreferencesAction] Utente non autenticato')
    throw new Error('TENANT_REQUIRED')
  }

  return getUserPreferences(supabase, user.id)
}

export async function setPreferenceAction(
  notificationType: string,
  channel: string,
  enabled: boolean
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  try {
    await setPreference(supabase, user.id, notificationType, channel, enabled)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
