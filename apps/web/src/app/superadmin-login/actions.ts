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
  const adminClient = await createServiceRoleClient()

  // Sign-in: necessario per password verify (Supabase non espone verify-only API)
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (signInError || !authData.user) {
    return { success: false, error: 'Credenziali non valide' }
  }

  const userId = authData.user.id

  // Platform admin check (bypassa RLS via service role)
  const { data: admin } = await adminClient
    .from('platform_admins')
    .select('id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (!admin) {
    // Non admin: logout immediato + revoca tutte le sessioni del utente via Admin API
    // per chiudere race window se cookie session è stato già scritto.
    await supabase.auth.signOut()
    try {
      await adminClient.auth.admin.signOut(userId)
    } catch {
      // best-effort: se fallisce, signOut locale comunque ha rimosso il cookie
    }
    return {
      success: false,
      error: 'Accesso non autorizzato. Questo account non ha privilegi superadmin.',
    }
  }

  return { success: true }
}
