'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@touracore/auth'
import { markAsRead, markAllAsRead, archiveEntry } from '@touracore/notifications'

export async function markAsReadAction(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return
  await markAsRead(id, user.id)
  revalidatePath('/messages')
}

export async function markAllAsReadAction(): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return
  await markAllAsRead(user.id)
  revalidatePath('/messages')
}

export async function archiveAction(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return
  await archiveEntry(id, user.id)
  revalidatePath('/messages')
}
