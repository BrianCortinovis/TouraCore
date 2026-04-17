import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getAllergenLabel, getAllergenSymbol } from '@/lib/allergens-qr'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}

export default async function AllergensPublicPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { lang } = await searchParams
  const language = (lang === 'en' ? 'en' : 'it') as 'it' | 'en'

  const admin = await createServiceRoleClient()
  const { data: entity } = await admin
    .from('entities')
    .select('id, name')
    .eq('slug', slug)
    .eq('kind', 'restaurant')
    .eq('is_active', true)
    .maybeSingle()

  if (!entity) notFound()

  const { data: items } = await admin
    .from('menu_items')
    .select('name, description, allergens, menu_categories(name)')
    .eq('restaurant_id', entity.id)
    .eq('active', true)
    .order('order_idx')

  const allergensInUse = new Set<string>()
  for (const it of items ?? []) {
    for (const a of (it.allergens as string[]) ?? []) allergensInUse.add(a)
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <p className="text-xs font-bold uppercase text-amber-700">UE 1169/2011</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{entity.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {language === 'it' ? 'Allergeni dichiarati' : 'Declared allergens'}
          </p>
          <div className="mt-2 text-xs">
            <a href={`?lang=it`} className={`px-2 ${language === 'it' ? 'font-bold text-amber-800' : 'text-gray-500'}`}>IT</a>
            |
            <a href={`?lang=en`} className={`px-2 ${language === 'en' ? 'font-bold text-amber-800' : 'text-gray-500'}`}>EN</a>
          </div>
        </header>

        <section className="mt-6 rounded-lg border border-amber-300 bg-white p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
            {language === 'it' ? 'Allergeni presenti nel menu' : 'Allergens present in menu'}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from(allergensInUse).map((a) => (
              <div key={a} className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm">
                <span className="text-2xl">{getAllergenSymbol(a)}</span>
                <span className="font-medium">{getAllergenLabel(a, language)}</span>
              </div>
            ))}
            {allergensInUse.size === 0 && (
              <p className="col-span-3 text-center text-sm text-gray-500">
                {language === 'it' ? 'Nessun allergene dichiarato' : 'No declared allergens'}
              </p>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
            {language === 'it' ? 'Piatti con allergeni' : 'Items with allergens'}
          </h2>
          <ul className="mt-3 space-y-3">
            {(items ?? []).filter((i) => ((i.allergens as string[]) ?? []).length > 0).map((item, i) => {
              const cat = Array.isArray(item.menu_categories) ? item.menu_categories[0] : item.menu_categories
              return (
                <li key={i} className="border-b border-gray-100 pb-3">
                  <p className="text-xs uppercase text-gray-500">{(cat as { name?: string } | null)?.name ?? ''}</p>
                  <p className="font-medium">{item.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {((item.allergens as string[]) ?? []).map((a) => (
                      <span key={a} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        {getAllergenSymbol(a)} {getAllergenLabel(a, language)}
                      </span>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <footer className="mt-6 text-center text-xs text-gray-500">
          {language === 'it'
            ? 'Reg. CE 1169/2011 — informazioni fornite dall\'esercente'
            : 'EU Reg. 1169/2011 — information provided by venue'}
          <br />
          {language === 'it' ? 'Per dubbi rivolgersi al personale' : 'Ask staff for clarifications'}
        </footer>
      </div>
    </div>
  )
}

export const metadata = { robots: 'noindex, nofollow' }
