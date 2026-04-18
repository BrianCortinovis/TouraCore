import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { BOOKING_MODES, CATEGORY_META } from '@touracore/experiences'
import { Sparkles, Plus, ArrowRight, Calendar, Users } from 'lucide-react'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

export default async function ActivitiesList({ params }: Props) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()
  if (!tenant) notFound()

  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, name, description, short_description, is_active, experience_entities(category, city, languages)')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'activity')
    .order('name', { ascending: true })

  const rows = (entities ?? []).map((e: {
    id: string; slug: string; name: string
    description: string | null; short_description: string | null; is_active: boolean
    experience_entities: Array<{ category: string; city: string | null; languages: string[] }>
  }) => ({
    ...e,
    experience_entities: e.experience_entities?.[0] ?? null,
  })) as Array<{
    id: string; slug: string; name: string
    description: string | null; short_description: string | null; is_active: boolean
    experience_entities: { category: string; city: string | null; languages: string[] } | null
  }>

  const { count: productsCount } = await supabase
    .from('experience_products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  const { count: slotsCount } = await supabase
    .from('experience_timeslots')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('status', 'open')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Esperienze</h1>
          <p className="text-sm text-gray-500 mt-1">
            Attività, tour, noleggi e parchi avventura. Gestisci prodotti, disponibilità, risorse e canali.
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/activities/new`}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuova esperienza
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-50 p-2"><Sparkles className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Entità</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-purple-50 p-2"><Calendar className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Prodotti totali</p>
              <p className="text-2xl font-bold text-gray-900">{productsCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-green-50 p-2"><Users className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Slot aperti</p>
              <p className="text-2xl font-bold text-gray-900">{slotsCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nessuna esperienza</h3>
          <p className="mt-2 text-sm text-gray-500">Crea la prima esperienza per iniziare.</p>
          <Link
            href={`/${tenantSlug}/activities/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Crea esperienza
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((e) => {
            const ext = e.experience_entities
            const cat = ext?.category && CATEGORY_META[ext.category as keyof typeof CATEGORY_META]
            return (
              <Link
                key={e.id}
                href={`/${tenantSlug}/activities/${e.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {cat && <span className="text-lg">{cat.icon}</span>}
                      <h3 className="text-base font-semibold text-gray-900 truncate">{e.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{e.short_description || e.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
                      {cat && <span>{cat.label}</span>}
                      {ext?.city && <span>📍 {ext.city}</span>}
                      {ext?.languages && ext.languages.length > 0 && (
                        <span>{ext.languages.join('·').toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Booking mode supportati</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(BOOKING_MODES).map(([key, meta]) => (
            <div key={key} className="rounded-md border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
              <p className="text-xs text-gray-500 mt-1">{meta.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
