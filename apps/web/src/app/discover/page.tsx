import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Image as ImageIcon, MapPin, ArrowUpRight, Hotel, UtensilsCrossed, Mountain, Bike, Compass } from 'lucide-react'
import {
  type PublicListingCard,
  ENTITY_KINDS,
} from '@touracore/listings'
import { buildBreadcrumbLd } from '@touracore/seo'
import { listAllPublicListingsCardsCached } from '@/lib/listings-cache'
import { getSiteBaseUrl } from '@/lib/site-url'
import { SearchClient } from './_components/SearchClient'

export const revalidate = 3600

type SearchParams = { kind?: string; q?: string; city?: string; type?: string; duration?: string }
type Props = { searchParams: Promise<SearchParams> }

const KIND_LABEL: Record<string, string> = {
  accommodation: 'Hospitality',
  restaurant: 'Ristorazione',
  activity: 'Esperienze',
  wellness: 'Wellness',
  bike_rental: 'Bike',
  moto_rental: 'Moto',
  ski_school: 'Sci',
}

interface Theme {
  bgGradient: string
  accent: string
  accentBg: string
  accentText: string
  chip: string
  heroPattern: string
  heroPhoto: string
  heroEyebrow: string
  heroTitle: string
  heroTitleAccent: string
  heroDesc: string
  searchPlaceholder: string
  Icon: typeof Hotel
  extraFields?: { name: string; label: string; options: { value: string; label: string }[] }[]
}

const THEMES: Record<string, Theme> = {
  all: {
    bgGradient: 'from-slate-50 via-white to-slate-50',
    accent: '#0f172a',
    accentBg: 'bg-slate-900 hover:bg-slate-800',
    accentText: 'text-slate-900',
    chip: 'bg-slate-900 text-white',
    heroPattern:
      'radial-gradient(circle at 20% 20%, #0f766e 0, transparent 40%), radial-gradient(circle at 80% 80%, #0ea5e9 0, transparent 35%)',
    heroPhoto: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=2000&q=80&auto=format&fit=crop',
    heroEyebrow: 'Portale ufficiale',
    heroTitle: 'Il turismo italiano,',
    heroTitleAccent: 'raccolto in un solo posto.',
    heroDesc:
      'Hotel, ville, ristoranti, esperienze guidate e noleggi. Operatori verificati, schede curate, prenotazione diretta — senza intermediari.',
    searchPlaceholder: 'Cerca strutture, città, esperienze…',
    Icon: Compass,
  },
  accommodation: {
    bgGradient: 'from-blue-50 via-white to-blue-50/40',
    accent: '#1e3a8a',
    accentBg: 'bg-blue-900 hover:bg-blue-800',
    accentText: 'text-blue-900',
    chip: 'bg-blue-900 text-white',
    heroPattern:
      'radial-gradient(circle at 30% 30%, #1e3a8a 0, transparent 45%), radial-gradient(circle at 75% 70%, #0369a1 0, transparent 40%)',
    heroPhoto: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=2000&q=80&auto=format&fit=crop',
    heroEyebrow: 'Hospitality',
    heroTitle: 'Dormi nei posti',
    heroTitleAccent: 'più belli d\'Italia.',
    heroDesc:
      'Hotel, ville, B&B e residence selezionati. Tariffe dirette, cancellazione flessibile, accoglienza italiana.',
    searchPlaceholder: 'Cerca hotel, villa, B&B, città…',
    Icon: Hotel,
    extraFields: [
      {
        name: 'type',
        label: 'Tipologia',
        options: [
          { value: 'hotel', label: 'Hotel' },
          { value: 'villa', label: 'Villa' },
          { value: 'bnb', label: 'B&B' },
          { value: 'resort', label: 'Resort' },
          { value: 'residence', label: 'Residence' },
        ],
      },
    ],
  },
  restaurant: {
    bgGradient: 'from-amber-50 via-white to-orange-50/40',
    accent: '#b45309',
    accentBg: 'bg-amber-700 hover:bg-amber-800',
    accentText: 'text-amber-800',
    chip: 'bg-amber-700 text-white',
    heroPattern:
      'radial-gradient(circle at 25% 30%, #b45309 0, transparent 45%), radial-gradient(circle at 75% 65%, #c2410c 0, transparent 40%)',
    heroPhoto: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=2000&q=80&auto=format&fit=crop',
    heroEyebrow: 'Ristorazione',
    heroTitle: 'Cucina del territorio,',
    heroTitleAccent: 'tavoli garantiti.',
    heroDesc:
      'Trattorie, osterie e ristoranti d\'autore. Prenotazione real-time, menù aggiornati, allergeni dichiarati.',
    searchPlaceholder: 'Cerca cucina, città, atmosfera…',
    Icon: UtensilsCrossed,
    extraFields: [
      {
        name: 'type',
        label: 'Tipo cucina',
        options: [
          { value: 'italiana', label: 'Italiana' },
          { value: 'tradizionale', label: 'Tradizionale' },
          { value: 'pesce', label: 'Pesce' },
          { value: 'vegetariana', label: 'Vegetariana' },
          { value: 'pizza', label: 'Pizzeria' },
        ],
      },
    ],
  },
  activity: {
    bgGradient: 'from-emerald-50 via-white to-teal-50/40',
    accent: '#065f46',
    accentBg: 'bg-emerald-700 hover:bg-emerald-800',
    accentText: 'text-emerald-800',
    chip: 'bg-emerald-700 text-white',
    heroPattern:
      'radial-gradient(circle at 20% 25%, #065f46 0, transparent 45%), radial-gradient(circle at 80% 70%, #0e7490 0, transparent 40%)',
    heroPhoto: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2000&q=80&auto=format&fit=crop',
    heroEyebrow: 'Esperienze',
    heroTitle: 'Vivi l\'Italia',
    heroTitleAccent: 'con chi la conosce.',
    heroDesc:
      'Tour guidati, escursioni, attività outdoor. Guide certificate, gruppi piccoli, conferma immediata.',
    searchPlaceholder: 'Cerca tour, escursione, città…',
    Icon: Mountain,
    extraFields: [
      {
        name: 'duration',
        label: 'Durata',
        options: [
          { value: 'half-day', label: 'Mezza giornata' },
          { value: 'full-day', label: 'Giornata intera' },
          { value: 'multi-day', label: 'Più giorni' },
        ],
      },
    ],
  },
  bike_rental: {
    bgGradient: 'from-sky-50 via-white to-cyan-50/40',
    accent: '#0c4a6e',
    accentBg: 'bg-sky-800 hover:bg-sky-900',
    accentText: 'text-sky-800',
    chip: 'bg-sky-800 text-white',
    heroPattern:
      'radial-gradient(circle at 25% 30%, #0c4a6e 0, transparent 45%), radial-gradient(circle at 75% 70%, #0e7490 0, transparent 40%)',
    heroPhoto: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=2000&q=80&auto=format&fit=crop',
    heroEyebrow: 'Bike & E-Bike',
    heroTitle: 'Pedala dove',
    heroTitleAccent: 'inizia il panorama.',
    heroDesc:
      'Bike e E-bike per ogni terreno. Prenotazione oraria o multi-giorno, ritiro flessibile, casco incluso.',
    searchPlaceholder: 'Cerca tipo bici, città, percorso…',
    Icon: Bike,
    extraFields: [
      {
        name: 'type',
        label: 'Tipo bici',
        options: [
          { value: 'mtb', label: 'Mountain Bike' },
          { value: 'ebike', label: 'E-Bike' },
          { value: 'road', label: 'Da strada' },
          { value: 'city', label: 'City Bike' },
          { value: 'gravel', label: 'Gravel' },
        ],
      },
    ],
  },
}

const NAV_KINDS: Array<{ key: string; label: string; Icon: typeof Hotel }> = [
  { key: 'all', label: 'Tutti', Icon: Compass },
  { key: 'accommodation', label: 'Hospitality', Icon: Hotel },
  { key: 'restaurant', label: 'Ristorazione', Icon: UtensilsCrossed },
  { key: 'activity', label: 'Esperienze', Icon: Mountain },
  { key: 'bike_rental', label: 'Bike', Icon: Bike },
]

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { kind } = await searchParams
  const theme: Theme = (kind && THEMES[kind]) || THEMES.all!
  return {
    title: `Portale TouraCore — ${theme.heroEyebrow}`,
    description: theme.heroDesc,
  }
}

export default async function DiscoverPage({ searchParams }: Props) {
  const sp = await searchParams
  const { kind, q, city, type, duration } = sp
  const activeKind = kind && THEMES[kind] ? kind : 'all'
  const theme: Theme = THEMES[activeKind] ?? THEMES.all!

  const listings = (await listAllPublicListingsCardsCached(200)) as PublicListingCard[]

  const filtered = listings.filter((l) => {
    if (kind && l.entity_kind !== kind) return false
    if (q) {
      const needle = q.toLowerCase()
      const hay = [l.entity_name, l.tagline ?? '', l.tenant_name].join(' ').toLowerCase()
      if (!hay.includes(needle)) return false
    }
    if (city) {
      if (!l.tenant_name.toLowerCase().includes(city.toLowerCase())) return false
    }
    if (type) {
      const synonyms: Record<string, string[]> = {
        ebike: ['e-bike', 'ebike'],
        mtb: ['mountain', 'mtb'],
        road: ['strada', 'road', 'corsa'],
        city: ['city', 'città', 'urban'],
        gravel: ['gravel'],
        hotel: ['hotel'],
        villa: ['villa'],
        bnb: ['b&b', 'b & b', 'bnb'],
        resort: ['resort'],
        residence: ['residence'],
        italiana: ['italiana', 'territorio'],
        tradizionale: ['tradiz', 'territorio', 'borgo'],
        pesce: ['pesce', 'mare'],
        vegetariana: ['vegetar', 'vegan'],
        pizza: ['pizza', 'pizzeria'],
      }
      const hay = [l.entity_name, l.tagline ?? ''].join(' ').toLowerCase()
      const tokens = synonyms[type.toLowerCase()] ?? [type.toLowerCase()]
      if (!tokens.some((t) => hay.includes(t))) return false
    }
    if (duration) {
      const hay = (l.tagline ?? '').toLowerCase()
      if (!hay.includes(duration.toLowerCase())) return false
    }
    return true
  })

  const counts: Record<string, number> = {}
  for (const l of listings) counts[l.entity_kind] = (counts[l.entity_kind] ?? 0) + 1

  const baseUrl = getSiteBaseUrl()
  const breadcrumbLd = buildBreadcrumbLd([
    { name: 'Home', url: new URL('/', baseUrl).toString() },
    { name: 'Portale', url: new URL('/discover', baseUrl).toString() },
    ...(kind && KIND_LABEL[kind]
      ? [{ name: KIND_LABEL[kind], url: new URL(`/discover?kind=${kind}`, baseUrl).toString() }]
      : []),
  ])

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.bgGradient} text-slate-900`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <TopBar activeKind={activeKind} counts={counts} totalCount={listings.length} />

      <Hero theme={theme} listingsCount={kind ? (counts[kind] ?? 0) : listings.length} kindsCount={Object.keys(counts).length} />

      <SearchSection theme={theme} />

      <main className="mx-auto max-w-[1320px] px-6 pb-20">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-6 mt-10 flex items-baseline justify-between">
              <h2 className="text-[15px] font-medium text-slate-600">
                {filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'}
                {kind ? ` in ${KIND_LABEL[kind] ?? kind}` : ''}
                {q ? ` per "${q}"` : ''}
              </h2>
              <span className="text-[12px] uppercase tracking-[0.16em] text-slate-400">
                Aggiornato in tempo reale
              </span>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((l, idx) => (
                <DiscoverCard key={l.listing_id} listing={l} priority={idx < 4} />
              ))}
            </ul>
          </>
        )}
      </main>

      <Footer total={listings.length} />
    </div>
  )
}

function TouraCoreLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 shadow-[0_8px_24px_-12px_rgba(15,118,110,0.6)]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L4 7 L4 17 L12 22 L20 17 L20 7 Z" />
          <path d="M12 2 L12 22" />
          <path d="M4 7 L20 17" />
          <path d="M20 7 L4 17" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900">
          Toura<span className="text-teal-600">Core</span>
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-slate-400">
          Tourism Platform
        </span>
      </span>
    </span>
  )
}

function TopBar({
  activeKind,
  counts,
  totalCount,
}: {
  activeKind: string
  counts: Record<string, number>
  totalCount: number
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-4">
        <Link href="/" aria-label="TouraCore home" className="shrink-0">
          <TouraCoreLogo />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_KINDS.map(({ key, label, Icon }) => {
            const isActive = activeKind === key
            const count = key === 'all' ? totalCount : (counts[key] ?? 0)
            const href = key === 'all' ? '/discover' : `/discover?kind=${key}`
            return (
              <Link
                key={key}
                href={href}
                className={[
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
              >
                <Icon size={14} />
                {label}
                <span className={isActive ? 'text-white/70' : 'text-slate-400'}>{count}</span>
              </Link>
            )
          })}
        </nav>

        <Link
          href="/login"
          className="shrink-0 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800"
        >
          Accedi
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 bg-white/70 px-4 py-2 lg:hidden">
        {NAV_KINDS.map(({ key, label, Icon }) => {
          const isActive = activeKind === key
          const href = key === 'all' ? '/discover' : `/discover?kind=${key}`
          return (
            <Link
              key={key}
              href={href}
              className={[
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              <Icon size={12} />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

function Hero({
  theme,
  listingsCount,
  kindsCount,
}: {
  theme: Theme
  listingsCount: number
  kindsCount: number
}) {
  const { Icon } = theme
  return (
    <section className="relative overflow-hidden border-b border-slate-200/60 bg-white">
      <div className="absolute inset-0">
        <Image
          src={theme.heroPhoto}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/40" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: theme.heroPattern }}
        />
      </div>

      <div className="relative mx-auto max-w-[1320px] px-6 py-20 md:py-28">
        <div className="max-w-3xl">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur"
            style={{ color: theme.accent }}
          >
            <Icon size={13} />
            {theme.heroEyebrow} · {listingsCount} {listingsCount === 1 ? 'operatore' : 'operatori'}
          </span>
          <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-900 md:text-[64px]">
            {theme.heroTitle}
            <br />
            <span style={{ color: theme.accent }}>{theme.heroTitleAccent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.55] text-slate-600 md:text-[19px]">
            {theme.heroDesc}
          </p>

          <div className="mt-10 flex flex-wrap gap-8 text-[13px] text-slate-500">
            <Stat value={String(listingsCount)} label={theme.heroEyebrow} />
            <Stat value={String(kindsCount)} label="Verticali totali" />
            <Stat value="100%" label="Prenotazione diretta" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[28px] font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </span>
      <span className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
    </div>
  )
}

function SearchSection({ theme }: { theme: Theme }) {
  return (
    <section className="border-b border-slate-200/60 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto max-w-[1320px] px-6 py-8">
        <SearchClient
          placeholder={theme.searchPlaceholder}
          accentClass={theme.accentBg}
          extraFields={theme.extraFields}
        />
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-20 text-center">
      <p className="text-[18px] font-semibold text-slate-900">Nessun risultato</p>
      <p className="mt-2 text-[14px] text-slate-500">
        Prova a rimuovere i filtri o cambiare termine di ricerca.
      </p>
    </div>
  )
}

function DiscoverCard({ listing, priority }: { listing: PublicListingCard; priority: boolean }) {
  const theme: Theme = THEMES[listing.entity_kind] ?? THEMES.all!
  const href = `/s/${listing.tenant_slug}/${listing.slug}`
  return (
    <li className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {listing.hero_url ? (
            <Image
              src={listing.hero_url}
              alt={listing.entity_name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <ImageIcon size={32} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${theme.chip}`}
          >
            {KIND_LABEL[listing.entity_kind] ?? listing.entity_kind}
          </span>
          <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100">
            <ArrowUpRight size={15} />
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            <MapPin size={11} />
            {listing.tenant_name}
          </div>
          <h3 className="mt-2 line-clamp-1 text-[17px] font-semibold tracking-tight text-slate-900">
            {listing.entity_name}
          </h3>
          {listing.tagline ? (
            <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-[1.5] text-slate-600">
              {listing.tagline}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  )
}

function Footer({ total }: { total: number }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <TouraCoreLogo />
          <p className="mt-3 max-w-md text-[13px] leading-[1.55] text-slate-500">
            Piattaforma multi-verticale per il turismo italiano. {total} operatori distribuiti, prenotazione diretta, zero intermediazione.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[13px] text-slate-500 md:items-end">
          <div className="flex gap-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <Link href="/portali" className="hover:text-slate-900">Destinazioni</Link>
            <Link href="/login" className="hover:text-slate-900">Accedi</Link>
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
            © TouraCore · Tutti i diritti riservati
          </span>
        </div>
      </div>
    </footer>
  )
}

void ENTITY_KINDS
