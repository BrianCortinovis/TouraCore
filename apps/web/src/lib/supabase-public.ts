import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Anonymous Supabase client for truly public routes (no cookies, no auth).
 * Uses NEXT_PUBLIC_SUPABASE_ANON_KEY; RLS + views enforce what anon can read.
 *
 * Use this in /s/[tenantSlug]/[entitySlug], /embed/*, /portal, sitemap, etc.
 * Do NOT use for admin/settings pages — those need createServerSupabaseClient.
 */
export function createPublicClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
