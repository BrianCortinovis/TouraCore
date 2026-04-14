import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createServiceRoleClient } from '@touracore/db/server'
import { getPortalBySlug } from '@touracore/portals'
import { buildMetadata, buildTouristDestinationLd, JsonLdScript } from '@touracore/seo'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServiceRoleClient()
  const portal = await getPortalBySlug(supabase, slug)

  if (!portal) return { title: 'Portale non trovato' }

  return buildMetadata({
    title: portal.seo.title ?? portal.name,
    description: portal.seo.description ?? `Scopri le strutture di ${portal.name}`,
    keywords: portal.seo.keywords,
    ogImage: portal.seo.og_image,
    canonicalUrl: portal.seo.canonical_base
      ? `${portal.seo.canonical_base}/portali/${slug}`
      : undefined,
  })
}

async function getPortalProperties(tenantIds: string[]) {
  if (tenantIds.length === 0) return []
  const supabase = await createServiceRoleClient()

  const { data: properties } = await supabase
    .from('entities')
    .select('id, tenant_id, name, slug, description, type, city, province, logo_url, default_check_in_time, default_check_out_time')
    .in('tenant_id', tenantIds)
    .eq('is_active', true)

  if (!properties) return []

  const entityIds = properties.map((p) => p.id)
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, entity_id, name, base_price')
    .in('entity_id', entityIds)
    .eq('is_active', true)
    .order('base_price', { ascending: true })

  const { data: media } = await supabase
    .from('media')
    .select('tenant_id, url, thumbnail_url')
    .in('tenant_id', entityIds)
    .limit(3 * properties.length)

  return properties.map((p) => ({
    ...p,
    minPrice: (roomTypes ?? [])
      .filter((rt) => rt.entity_id === p.id)
      .reduce((min, rt) => Math.min(min, rt.base_price), Infinity),
    roomTypeCount: (roomTypes ?? []).filter((rt) => rt.entity_id === p.id).length,
    coverImage: (media ?? []).find((m) => m.tenant_id === p.id)?.url ?? null,
  }))
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  residence: 'Residence',
  mixed: 'Struttura ricettiva',
  b_and_b: 'B&B',
  agriturismo: 'Agriturismo',
  apartment: 'Appartamento',
  affittacamere: 'Affittacamere',
}

export default async function PortalPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServiceRoleClient()
  const portal = await getPortalBySlug(supabase, slug)

  if (!portal || portal.status !== 'active') {
    notFound()
  }

  const tenantIds = portal.tenants.map((t) => t.tenant_id)
  const featuredIds = new Set(portal.tenants.filter((t) => t.featured).map((t) => t.tenant_id))
  const properties = await getPortalProperties(tenantIds)

  const featured = properties.filter((p) => featuredIds.has(p.tenant_id!))
  const others = properties.filter((p) => !featuredIds.has(p.tenant_id!))

  const jsonLd = buildTouristDestinationLd({
    name: portal.name,
    description: portal.seo.description,
    url: portal.seo.canonical_base
      ? `${portal.seo.canonical_base}/portali/${slug}`
      : undefined,
    image: portal.seo.og_image,
    properties: properties.map((p) => ({
      name: p.name,
      description: p.description || undefined,
      url: p.slug ? `/property/${p.slug}` : undefined,
      image: p.coverImage || undefined,
    })),
  })

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{portal.name}</h1>
            {portal.seo.description && (
              <p className="mt-3 max-w-2xl text-lg text-gray-600">{portal.seo.description}</p>
            )}
            <p className="mt-2 text-sm text-gray-400">
              {properties.length} struttur{properties.length === 1 ? 'a' : 'e'} disponibil{properties.length === 1 ? 'e' : 'i'}
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10">
          {properties.length === 0 ? (
            <p className="py-20 text-center text-gray-500">
              Nessuna struttura disponibile in questo portale.
            </p>
          ) : (
            <div className="space-y-10">
              {/* Featured */}
              {featured.length > 0 && (
                <section>
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">In evidenza</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {featured.map((p) => (
                      <PropertyCard key={p.id} property={p} featured />
                    ))}
                  </div>
                </section>
              )}

              {/* All properties */}
              {others.length > 0 && (
                <section>
                  {featured.length > 0 && (
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">Tutte le strutture</h2>
                  )}
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {others.map((p) => (
                      <PropertyCard key={p.id} property={p} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

        <footer className="border-t border-gray-200 bg-white py-6">
          <p className="text-center text-xs text-gray-400">
            Powered by TouraCore
          </p>
        </footer>
      </div>
    </>
  )
}

interface PropertyCardProps {
  property: {
    id: string
    name: string
    slug: string | null
    description: string | null
    type: string
    city: string | null
    province: string | null
    coverImage: string | null
    minPrice: number
    roomTypeCount: number
  }
  featured?: boolean
}

function PropertyCard({ property: p, featured }: PropertyCardProps) {
  const href = p.slug ? `/property/${p.slug}` : `/book/${p.slug || p.id}`
  const bookHref = p.slug ? `/book/${p.slug}` : '#'

  return (
    <div className={`group overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-lg ${featured ? 'border-yellow-300' : 'border-gray-200'}`}>
      {p.coverImage ? (
        <div className="relative h-48 overflow-hidden">
          <Image
            src={p.coverImage}
            alt={p.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            fill
            unoptimized
          />
          {featured && (
            <span className="absolute top-3 left-3 rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-medium text-yellow-900">
              In evidenza
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center bg-gray-100">
          <span className="text-4xl text-gray-300">{p.name.charAt(0)}</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{p.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {TYPE_LABELS[p.type] || p.type}
              {p.city ? ` · ${p.city}` : ''}
              {p.province ? ` (${p.province})` : ''}
            </p>
          </div>
        </div>

        {p.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{p.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          {p.minPrice < Infinity && (
            <p className="text-lg font-bold text-gray-900">
              da €{p.minPrice.toFixed(0)}<span className="text-sm font-normal text-gray-500">/notte</span>
            </p>
          )}
          <div className="flex gap-2">
            {p.slug && (
              <Link
                href={href}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Dettagli
              </Link>
            )}
            <Link
              href={bookHref}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Prenota
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
