import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { CurationEditor } from './curation-editor'

export const dynamic = 'force-dynamic'

type Params = { entityId: string }
type Props = { params: Promise<Params> }

export default async function CurationPage({ params }: Props) {
  const { entityId } = await params
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind')
    .eq('id', entityId)
    .eq('tenant_id', bootstrap.tenant.id)
    .maybeSingle()
  if (!entity) notFound()

  const { data: listing } = await supabase
    .from('public_listings')
    .select('id, is_public, tagline, featured_amenities, seo_title, seo_description')
    .eq('entity_id', entity.id)
    .maybeSingle()

  return (
    <div className="space-y-4">
      <nav className="text-[13px] text-[#6b7280]">
        <Link href="/settings/distribution" className="text-[#003b95] hover:underline">
          ← Distribuzione
        </Link>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
      <p className="text-sm text-[#6b7280]">
        Personalizza scheda pubblica · {entity.kind.replace('_', ' ')}
      </p>
      <CurationEditor
        entityId={entity.id}
        entitySlug={entity.slug}
        tenantSlug={bootstrap.tenant.slug ?? ''}
        initial={{
          tagline: listing?.tagline ?? '',
          featured: (listing?.featured_amenities as string[] | null) ?? [],
          seoTitle: listing?.seo_title ?? '',
          seoDescription: listing?.seo_description ?? '',
          isPublic: listing?.is_public ?? false,
        }}
      />
    </div>
  )
}
