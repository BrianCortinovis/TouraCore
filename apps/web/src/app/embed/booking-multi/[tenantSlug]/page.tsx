import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import Link from 'next/link'
import { Bike, Building2, UtensilsCrossed, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface EntityCard {
  id: string
  slug: string
  name: string
  kind: string
  description: string | null
  bookingHref: string
}

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  accommodation: { label: 'Struttura', icon: Building2, color: '#003b95' },
  restaurant: { label: 'Ristorante', icon: UtensilsCrossed, color: '#da3743' },
  bike_rental: { label: 'Noleggio Bici', icon: Bike, color: '#0369a1' },
  activity: { label: 'Esperienza', icon: Sparkles, color: '#7c3aed' },
  wellness: { label: 'Wellness', icon: Sparkles, color: '#059669' },
}

/**
 * Route /embed/booking-multi/[tenantSlug]?entities=slug1,slug2&kinds=bike_rental,restaurant
 * Multi-entity booking engine embed — user può scegliere quali attività includere.
 * Senza filtri ?entities= mostra TUTTE le attività attive+pubbliche del tenant.
 */
export default async function EmbedBookingMultiPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params
  const q = await searchParams
  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('slug', tenantSlug)
    .maybeSingle()
  if (!tenant) notFound()

  // Parse ?entities= (comma-sep slugs) or ?kinds= (comma-sep kinds filter)
  const entitiesFilter =
    typeof q.entities === 'string'
      ? q.entities.split(',').map((s) => s.trim()).filter(Boolean)
      : null
  const kindsFilter =
    typeof q.kinds === 'string'
      ? q.kinds.split(',').map((s) => s.trim()).filter(Boolean)
      : null

  let entitiesQuery = supabase
    .from('entities')
    .select('id, slug, name, kind, description, is_active')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)

  if (entitiesFilter && entitiesFilter.length > 0) {
    entitiesQuery = entitiesQuery.in('slug', entitiesFilter)
  }
  if (kindsFilter && kindsFilter.length > 0) {
    entitiesQuery = entitiesQuery.in('kind', kindsFilter)
  }

  const { data: entities } = await entitiesQuery
  const rows = (entities ?? []) as Array<{
    id: string
    slug: string
    name: string
    kind: string
    description: string | null
  }>

  if (rows.length === 0) {
    return (
      <div style={{ padding: 32, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Nessuna attività disponibile per la prenotazione.</p>
      </div>
    )
  }

  // Build cards con booking href per kind
  const cards: EntityCard[] = rows.map((e) => {
    let bookingHref = `/book/multi/${tenantSlug}`
    if (e.kind === 'bike_rental') bookingHref = `/book/bike/${e.slug}?tenant=${tenantSlug}`
    else if (e.kind === 'accommodation' || e.kind === 'restaurant') bookingHref = `/book/${tenantSlug}`
    return {
      id: e.id,
      slug: e.slug,
      name: e.name,
      kind: e.kind,
      description: e.description,
      bookingHref,
    }
  })

  // Single entity → embed booking diretto
  if (cards.length === 1) {
    const c = cards[0]!
    return (
      <div style={{ padding: 16, background: '#fff', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <iframe
          src={`/embed/booking/${tenantSlug}/${c.slug}`}
          style={{ width: '100%', minHeight: 680, border: 'none' }}
          title={c.name}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-4" style={{ fontFamily: 'Inter, sans-serif', background: '#fff', minHeight: '100vh' }}>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Prenota online</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{tenant.name as string}</h1>
        <p className="mt-1 text-sm text-gray-600">Scegli il servizio che vuoi prenotare</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const meta = KIND_META[c.kind] ?? { label: c.kind, icon: Sparkles, color: '#6b7280' }
          const Icon = meta.icon
          return (
            <Link
              key={c.id}
              href={c.bookingHref}
              target="_top"
              className="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  <Icon size={16} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <p className="font-semibold text-gray-900">{c.name}</p>
              {c.description && (
                <p className="mt-1 line-clamp-3 text-xs text-gray-600">{c.description}</p>
              )}
              <span className="mt-auto pt-3 text-xs font-semibold text-blue-600 group-hover:underline">
                Prenota →
              </span>
            </Link>
          )
        })}
      </div>

      <footer className="mt-6 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-500">
        Powered by <b>TouraCore</b>
      </footer>
    </div>
  )
}
