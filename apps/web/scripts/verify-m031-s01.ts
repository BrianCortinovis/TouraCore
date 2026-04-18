/**
 * M031/S01 verification — public_listings + RLS + view
 *
 * Run: pnpm tsx scripts/verify-m031-s01.ts
 *
 * Validates:
 *  1. Anon read of public_listings_view returns 2 records (seed)
 *  2. Anon read of public_listings raw table is BLOCKED by RLS
 *  3. Toggle is_public=false on one listing reduces view count to 1
 *  4. Toggle back is_public=true restores count to 2
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load env from apps/web/.env.local (script lives in apps/web/scripts)
const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars in apps/web/.env.local')
  process.exit(1)
}

const anon = createClient(SUPABASE_URL, ANON_KEY)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let failures = 0
function assert(label: string, cond: boolean, details?: string) {
  const mark = cond ? '✅ PASS' : '❌ FAIL'
  console.log(`${mark} — ${label}${details ? ` · ${details}` : ''}`)
  if (!cond) failures++
}

async function main() {
  console.log('M031/S01 — verify public_listings foundation\n')

  // 1. anon SELECT view → expect 2
  const { data: v1, error: e1 } = await anon
    .from('public_listings_view')
    .select('listing_id, tenant_slug, slug, entity_kind, tagline')
  assert(
    'anon SELECT public_listings_view returns seeded rows',
    !e1 && Array.isArray(v1) && v1.length === 2,
    e1 ? `error: ${e1.message}` : `count=${v1?.length}`
  )

  // 2. anon SELECT raw → expect permission denied / RLS blocks
  const { data: raw, error: e2 } = await anon
    .from('public_listings')
    .select('id')
  const rawBlocked = (!!e2 && /permission denied|row-level security|access|not found/i.test(e2.message)) || (!e2 && Array.isArray(raw) && raw.length === 0)
  assert(
    'anon SELECT public_listings raw is blocked by RLS',
    rawBlocked,
    e2 ? `error: ${e2.message}` : `rows leaked: ${raw?.length ?? 0}`
  )

  // find trattoria listing to toggle
  const { data: trat } = await admin
    .from('public_listings_view')
    .select('listing_id')
    .eq('slug', 'trattoria-del-borgo')
    .maybeSingle()
  if (!trat) {
    console.error('❌ trattoria seed not found, aborting toggle test')
    process.exit(1)
  }

  // 3. service_role toggles is_public=false → anon view count = 1
  await admin
    .from('public_listings')
    .update({ is_public: false })
    .eq('id', trat.listing_id)
  const { data: v2 } = await anon
    .from('public_listings_view')
    .select('listing_id')
  assert(
    'toggle is_public=false hides listing from public view',
    Array.isArray(v2) && v2.length === 1,
    `count=${v2?.length}`
  )

  // 4. restore
  await admin
    .from('public_listings')
    .update({ is_public: true })
    .eq('id', trat.listing_id)
  const { data: v3 } = await anon
    .from('public_listings_view')
    .select('listing_id')
  assert(
    'toggle is_public=true restores listing to public view',
    Array.isArray(v3) && v3.length === 2,
    `count=${v3?.length}`
  )

  console.log(failures ? `\n${failures} failure(s)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('unexpected error', e)
  process.exit(1)
})
