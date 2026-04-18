import { notFound, redirect } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'
import { AgencyScopedSidebar } from './agency-scoped-sidebar'

interface AgencyScopedLayoutProps {
  children: React.ReactNode
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyScopedLayout({ children, params }: AgencyScopedLayoutProps) {
  const { agencySlug } = await params
  const ctx = await getVisibilityContext()

  if (!ctx.user) redirect(`/login?next=/a/${agencySlug}`)

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, plan, is_active')
    .eq('slug', agencySlug)
    .maybeSingle()

  if (!agency) notFound()

  const canAccess =
    ctx.isPlatformAdmin || (ctx.mode === 'agency' && ctx.agencyId === agency.id)

  if (!canAccess) {
    await logAgencyAction({
      action: 'agency.route_access_denied',
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.mode === 'agency' ? 'agency_member' : 'tenant',
      agencyId: agency.id,
      status: 'denied',
      metadata: { requested_slug: agencySlug },
    })
    redirect('/')
  }

  await logAgencyAction({
    action: 'agency.route_access_ok',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.isPlatformAdmin ? 'platform_admin' : (ctx.agencyRole ?? 'agency_member'),
    agencyId: agency.id,
    status: 'ok',
    metadata: { slug: agencySlug },
  })

  return (
    <div className="flex gap-6">
      <AgencyScopedSidebar agencySlug={agency.slug} agencyName={agency.name} plan={agency.plan} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
