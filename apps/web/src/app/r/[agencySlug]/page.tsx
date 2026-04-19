import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'

interface Props {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function AgencyReferralLanding({ params }: Props) {
  const { agencySlug } = await params
  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, branding, is_active')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency || !agency.is_active) notFound()

  const branding = (agency.branding ?? {}) as { color?: string; logo_url?: string }
  const color = branding.color ?? '#4f46e5'

  const cookieStore = await cookies()
  cookieStore.set('ref_agency', agency.id, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {branding.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={agency.name} className="h-10" />
          )}
          <span className="text-lg font-semibold" style={{ color }}>
            {agency.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-slate-900">
          Inizia con <span style={{ color }}>{agency.name}</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Registra la tua struttura o attività e fatti seguire da {agency.name}.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={`/register?ref=${agency.slug}`}
            className="rounded-lg px-6 py-3 text-base font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            Crea account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
          >
            Accedi
          </Link>
        </div>
        <p className="mt-10 text-xs text-slate-500">
          Powered by TouraCore · Sarai automaticamente collegato a {agency.name}
        </p>
      </main>
    </div>
  )
}
