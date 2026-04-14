'use server'

import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@touracore/db/server'

export async function switchPropertyAction(entityId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: staffMember } = await supabase
    .from('staff_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .maybeSingle()

  if (!staffMember) return

  const cookieStore = await cookies()
  cookieStore.set('touracore_active_entity_id', entityId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
}
