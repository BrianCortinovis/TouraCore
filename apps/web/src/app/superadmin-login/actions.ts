'use server'

import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'

const LoginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password richiesta'),
})

interface LoginResult {
  success: boolean
  error?: string
}

export async function superadminLoginAction(input: unknown): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createServerSupabaseClient()

  // 1. Tentativo login
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (signInError || !authData.user) {
    return { success: false, error: 'Credenziali non valide' }
  }

  // 2. Verifica platform_admin usando service_role (bypassa RLS)
  const adminClient = await createServiceRoleClient()

  const { data: admin, error: adminError } = await adminClient
    .from('platform_admins')
    .select('id, role')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (adminError || !admin) {
    // Logout immediato — l'utente non è superadmin
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Accesso non autorizzato. Questo account non ha privilegi superadmin.',
    }
  }

  return { success: true }
}
