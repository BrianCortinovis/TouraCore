import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { TeamInviteForm } from './invite-form'
import { RevokeButton, RemoveButton } from './team-buttons'

interface TeamPageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { agencySlug } = await params
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const canAdmin = hasPermission(ctx, 'team.admin') || ctx.isPlatformAdmin

  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    supabase
      .from('agency_memberships')
      .select('id, role, is_active, user_id, created_at, permissions')
      .eq('agency_id', agency.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('agency_invitations')
      .select('id, email, role, created_at, expires_at, accepted_at, revoked_at')
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false }),
  ])

  const userIds = (memberships ?? []).map((m) => m.user_id)
  const userMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    for (const p of profiles ?? []) userMap.set(p.id, p.display_name ?? p.id.slice(0, 8))
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Team · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Membri attivi e inviti pending. Ruoli: owner/admin/member.
        </p>
      </header>

      {canAdmin && <TeamInviteForm agencySlug={agencySlug} />}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Membri ({memberships?.length ?? 0})
          </h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(memberships ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{userMap.get(m.user_id) ?? m.user_id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">{m.role} · dal {new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              {canAdmin && m.user_id !== ctx.user?.id && m.role !== 'agency_owner' && (
                <RemoveButton agencySlug={agencySlug} membershipId={m.id} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Inviti ({invitations?.length ?? 0})
          </h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {(invitations ?? []).map((i) => {
            const status = i.accepted_at ? 'accettato' : i.revoked_at ? 'revocato' : new Date(i.expires_at) < new Date() ? 'scaduto' : 'pending'
            return (
              <li key={i.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{i.email}</p>
                  <p className="text-xs text-slate-500">{i.role} · {status}</p>
                </div>
                {canAdmin && status === 'pending' && <RevokeButton agencySlug={agencySlug} invitationId={i.id} />}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
