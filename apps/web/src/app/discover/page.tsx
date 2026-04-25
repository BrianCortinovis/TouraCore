import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Image as ImageIcon, Search } from 'lucide-react'
import {
  listAllPublicListingsCards,
  type PublicListingCard,
  ENTITY_KINDS,
} from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Discover · TouraCore',
  description:
    'Scopri le attività distribuite su TouraCore: hotel, villa, ristoranti, esperienze, spa, noleggio bici.',
}

type SearchParams = { kind?: string; q?: string }
type Props = { searchParams: Promise<SearchParams> }

const KIND_LABEL: Record<string, string> = {
  accommodation: 'Alloggi',
  restaurant: 'Ristoranti',
  activity: 'Esperienze',
  wellness: 'Spa & Wellness',
  bike_rental: 'Noleggio bici',
  moto_rental: 'Noleggio moto',
  ski_school: 'Scuola sci',
}

const KIND_CHIP_COLOR: Record<string, { bg: string; fg: string }> = {
  accommodation: { bg: '#e7f0ff', fg: '#003b95' },
  restaurant: { bg: '#fde8ea', fg: '#a32129' },
  activity: { bg: '#ffe8e1', fg: '#d64421' },
  wellness: { bg: '#ccfbf1', fg: '#0f766e' },
  bike_rental: { bg: '#e0f2fe', fg: '#0369a1' },
  moto_rental: { bg: '#f3e8ff', fg: '#4c1d95' },
  ski_school: { bg: '#ddf4ff', fg: '#0b4ac2' },
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { kind, q } = await searchParams
  const supabase = createPublicClient()
  const listings = await listAllPublicListingsCards(supabase, { limit: 200 })

  const filtered = listings.filter((l) => {
    if (kind && l.entity_kind !== kind) return false
    if (q) {
      const needle = q.toLowerCase()
      const hay = [l.entity_name, l.tagline ?? '', l.tenant_name].join(' ').toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

  const counts: Record<string, number> = {}
  for (const l of listings) counts[l.entity_kind] = (counts[l.entity_kind] ?? 0) + 1

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#0b1220]">
      <div className="bg-[#003b95] py-2.5 text-[13px] text-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6">
          <span className="font-bold text-[18px]">TouraCore</span>
          <Link href="/" className="text-[11px] uppercase tracking-wide opacity-90 hover:opacity-100">
            Home
          </Link>
        </div>
      </div>

      <header className="bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <h1 className="text-[36px] font-bold leading-tight md:text-[48px]">Discover</h1>
          <p className="mt-2 max-w-[60ch] text-[16px] text-[#1f2937]">
            Tutte le attività distribuite su TouraCore: alloggi, ristoranti, esperienze, spa, noleggi.
          </p>

          <form method="get" className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
              />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Cerca villa, ristorante, esperienza…"
                className="w-full rounded-md border border-[#d1d5db] bg-white px-4 py-3 pl-11 text-[14px]"
              />
            </label>
            {kind ? <input type="hidden" name="kind" value={kind} /> : null}
            <button
              type="submit"
              className="rounded-md bg-[#003b95] px-5 py-3 text-[14px] font-bold text-white"
            >
              Cerca
            </button>
          </form>

          <ul className="mt-6 flex flex-wrap gap-2">
            <li>
              <Link
                href="/discover"
                className={[
                  'rounded-full border px-3 py-1.5 text-[12px] font-semibold',
                  !kind
                    ? 'border-[#003b95] bg-[#003b95] text-white'
                    : 'border-[#d1d5db] bg-white text-[#1f2937] hover:border-[#9ca3af]',
                ].join(' ')}
              >
                Tutti · {listings.length}
              </Link>
            </li>
            {ENTITY_KINDS.map((k) => {
              if (!counts[k]) return null
              const isActive = kind === k
              return (
                <li key={k}>
                  <Link
                    href={`/discover?kind=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                    className={[
                      'rounded-full border px-3 py-1.5 text-[12px] font-semibold',
                      isActive
                        ? 'border-[#003b95] bg-[#003b95] text-white'
                        : 'border-[#d1d5db] bg-white text-[#1f2937] hover:border-[#9ca3af]',
                    ].join(' ')}
                  >
                    {KIND_LABEL[k] ?? k} · {counts[k]}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-10">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d1d5db] bg-white p-16 text-center">
            <p className="text-[16px] font-semibold">Nessun risultato</p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              Prova a rimuovere i filtri o cambiare termine di ricerca.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((l, idx) => (
              <DiscoverCard key={l.listing_id} listing={l} priority={idx < 4} />
            ))}
          </ul>
        )}
      </main>

      <footer className="border-t border-[#e5e7eb] bg-white py-8 text-center text-[12px] text-[#6b7280]">
        <span>
          Aggregatore pubblico distribuito con <b>TouraCore</b> · {listings.length} schede attive
        </span>
      </footer>
    </div>
  )
}

function DiscoverCard({ listing, priority }: { listing: PublicListingCard; priority: boolean }) {
  const color = KIND_CHIP_COLOR[listing.entity_kind] ?? { bg: '#e7f0ff', fg: '#003b95' }
  const href = `/s/${listing.tenant_slug}/${listing.slug}`
  return (
    <li className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-sm transition hover:shadow-md">
      <Link href={href}>
        <div className="relative aspect-[16/10] bg-[#e5e7eb]">
          {listing.hero_url ? (
            <Image
              src={listing.hero_url}
              alt={listing.entity_name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#9ca3af]">
              <ImageIcon size={28} />
            </div>
          )}
          <span
            className="absolute left-3 top-3 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: color.bg, color: color.fg }}
          >
            {KIND_LABEL[listing.entity_kind] ?? listing.entity_kind}
          </span>
        </div>
        <div className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            {listing.tenant_name}
          </div>
          <h3 className="mt-1 line-clamp-1 text-[16px] font-bold">{listing.entity_name}</h3>
          {listing.tagline ? (
            <p className="mt-1 line-clamp-2 text-[13px] text-[#6b7280]">{listing.tagline}</p>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
