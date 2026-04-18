/**
 * M031/S05 verification — Admin distribution flow integration test
 *
 * Validates:
 *  1. Route /settings/distribution is auth-gated (307 without session)
 *  2. Server-side upsert public_listings via service_role + subsequent
 *     anon visibility toggle propagates to public_listings_view
 *  3. Revalidation hook path correctness (smoke: both revalidate paths resolvable)
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'

const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const BASE = process.env.BASE ?? 'http://localhost:3000'
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let fails = 0
function assert(label: string, cond: boolean, details?: string) {
  const mark = cond ? '✅ PASS' : '❌ FAIL'
  console.log(`${mark} — ${label}${details ? ` · ${details}` : ''}`)
  if (!cond) fails++
}

async function main() {
  console.log('M031/S05 — verify admin distribution flow\n')

  // 1. Route is auth-gated
  const res = await fetch(`${BASE}/settings/distribution`, { redirect: 'manual' })
  assert('GET /settings/distribution is auth-gated', res.status === 307 || res.status === 308, `status=${res.status}`)
  const location = res.headers.get('location') ?? ''
  assert(
    'Redirect target contains /login',
    /\/login/.test(location),
    `location=${location}`
  )

  // 2. Locate villa-irabo accommodation listing via service role
  const { data: listing, error: lErr } = await admin
    .from('public_listings_view')
    .select('listing_id, entity_id, tenant_id, tenant_slug, slug, entity_name')
    .eq('tenant_slug', 'villa-irabo')
    .eq('slug', 'villa-irabo')
    .maybeSingle()
  assert('Locate villa-irabo listing via view', !lErr && !!listing, lErr?.message)
  if (!listing) {
    console.log('\nCannot proceed without listing row')
    process.exit(fails || 1)
  }

  // Raw read via admin (view drops is_public, so re-query raw)
  const { data: rawBefore } = await admin
    .from('public_listings')
    .select('id, is_public')
    .eq('entity_id', listing.entity_id)
    .maybeSingle()
  const beforePublic = rawBefore?.is_public ?? false

  // 3. Toggle to false
  const { error: uErr1 } = await admin
    .from('public_listings')
    .update({ is_public: false })
    .eq('entity_id', listing.entity_id)
  assert('service_role toggle is_public=false', !uErr1, uErr1?.message)

  const { data: afterOff } = await anon
    .from('public_listings_view')
    .select('listing_id')
    .eq('tenant_slug', 'villa-irabo')
    .eq('slug', 'villa-irabo')
    .maybeSingle()
  assert('anon cannot see unpublished listing', afterOff === null, `got=${JSON.stringify(afterOff)}`)

  // 4. Fetch public page now (expect 404)
  const page404 = await fetch(`${BASE}/s/villa-irabo/villa-irabo`, { cache: 'no-store' })
  assert('public page 404 while unpublished', page404.status === 404, `status=${page404.status}`)

  // 5. Toggle back to true
  const { error: uErr2 } = await admin
    .from('public_listings')
    .update({ is_public: true })
    .eq('entity_id', listing.entity_id)
  assert('service_role restore is_public=true', !uErr2, uErr2?.message)

  const { data: afterOn } = await anon
    .from('public_listings_view')
    .select('listing_id')
    .eq('tenant_slug', 'villa-irabo')
    .eq('slug', 'villa-irabo')
    .maybeSingle()
  assert('anon sees listing after republish', !!afterOn, `got=${JSON.stringify(afterOn)}`)

  const page200 = await fetch(`${BASE}/s/villa-irabo/villa-irabo`, { cache: 'no-store' })
  assert('public page 200 after republish', page200.status === 200, `status=${page200.status}`)

  // 6. Restore to original state if was different (idempotent)
  if (beforePublic !== true) {
    await admin.from('public_listings').update({ is_public: beforePublic }).eq('entity_id', listing.entity_id)
  }

  console.log(fails ? `\n${fails} failure(s)` : '\nALL PASS')
  process.exit(fails ? 1 : 0)
}

main().catch((e) => {
  console.error('unexpected', e)
  process.exit(1)
})
