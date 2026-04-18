/**
 * M031/S02 verification — @touracore/listings package smoke test
 *
 * Run from apps/web: npx tsx scripts/verify-m031-s02.ts
 *
 * Validates:
 *  1. Named exports import without TS errors
 *  2. getAmenity('wifi') returns expected label_it
 *  3. getPublicListing fetches seeded villa-irabo accommodation
 *  4. listTenantPublicListings returns both seeded records
 *  5. getListingUrl builds canonical path
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  AMENITIES,
  AMENITY_KEYS,
  ENTITY_KINDS,
  getAmenity,
  getAmenityLabel,
  getBookingUrl,
  getListingUrl,
  getPublicListing,
  listTenantPublicListings,
  filterKnownAmenities,
} from '@touracore/listings'

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

let failures = 0
function assert(label: string, cond: boolean, details?: string) {
  const mark = cond ? '✅ PASS' : '❌ FAIL'
  console.log(`${mark} — ${label}${details ? ` · ${details}` : ''}`)
  if (!cond) failures++
}

async function main() {
  console.log('M031/S02 — verify @touracore/listings\n')

  assert('AMENITY_KEYS has >=40 entries', AMENITY_KEYS.length >= 40, `count=${AMENITY_KEYS.length}`)
  assert('ENTITY_KINDS has 7 entries', ENTITY_KINDS.length === 7, `count=${ENTITY_KINDS.length}`)
  assert('getAmenity("wifi").label_it === "Wi-Fi"', getAmenity('wifi').label_it === 'Wi-Fi')
  assert('getAmenityLabel("pool", "en") === "Pool"', getAmenityLabel('pool', 'en') === 'Pool')
  assert('AMENITIES.lake_view has icon', typeof AMENITIES.lake_view.icon === 'object' || typeof AMENITIES.lake_view.icon === 'function')

  const url = getListingUrl('villa-irabo', 'trattoria-del-borgo')
  assert('getListingUrl() returns /s/{t}/{s}', url === '/s/villa-irabo/trattoria-del-borgo', url)

  const urlEn = getListingUrl('villa-irabo', 'trattoria-del-borgo', { locale: 'en' })
  assert('getListingUrl(locale:en) prefixed /en', urlEn === '/en/s/villa-irabo/trattoria-del-borgo', urlEn)

  const book = getBookingUrl('villa-irabo')
  assert('getBookingUrl()', book === '/book/multi/villa-irabo', book)

  const filtered = filterKnownAmenities(['wifi', 'pool', 'unknown_key_zzz'])
  assert('filterKnownAmenities drops unknowns', filtered.length === 2 && filtered.includes('wifi') && filtered.includes('pool'))

  const listing = await getPublicListing(supabase, 'villa-irabo', 'villa-irabo')
  assert(
    'getPublicListing(villa-irabo, villa-irabo) returns row',
    !!listing && listing.entity_kind === 'accommodation' && listing.tagline !== null,
    listing ? `tagline=${listing.tagline?.slice(0, 40)}...` : 'null'
  )

  const all = await listTenantPublicListings(supabase, 'villa-irabo')
  assert(
    'listTenantPublicListings returns both seeded rows',
    all.length === 2,
    `count=${all.length}`
  )

  const missing = await getPublicListing(supabase, 'villa-irabo', 'nonesiste')
  assert('getPublicListing(missing) returns null', missing === null)

  console.log(failures ? `\n${failures} failure(s)` : '\nALL PASS')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('unexpected', e)
  process.exit(1)
})
