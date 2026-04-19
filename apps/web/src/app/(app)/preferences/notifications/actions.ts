'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@touracore/auth'
import { setPreference } from '@touracore/notifications'

export async function togglePreference(input: { eventKey: string; channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | 'slack'; enabled: boolean }): Promise<{ ok: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }
  await setPreference({ userId: user.id, eventKey: input.eventKey, channel: input.channel, enabled: input.enabled })
  revalidatePath('/preferences/notifications')
  return { ok: true }
}
