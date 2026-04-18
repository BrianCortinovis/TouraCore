import { redirect } from 'next/navigation'
import { getCurrentUser } from '@touracore/auth'
import { createServiceRoleClient } from '@touracore/db/server'
import { logAgencyAction } from '@touracore/audit'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitationPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) return <ErrorCard msg="Token mancante" />

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/invitations/accept?token=${encodeURIComponent(token)}`)

  const supabase = await createServiceRoleClient()
  const { data: rows, error } = await supabase.rpc('agency_invitation_accept', {
    p_token: token,
    p_user_id: user.id,
  })

  if (error) {
    return <ErrorCard msg={`Errore: ${error.message}`} />
  }

  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) return <ErrorCard msg="Invito non valido" />

  const { data: agency } = await supabase
    .from('agencies')
    .select('slug, name')
    .eq('id', row.agency_id)
    .single()

  await logAgencyAction({
    action: 'team.invite_accepted',
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: row.role as 'agency_owner' | 'agency_admin' | 'agency_member',
    agencyId: row.agency_id,
    targetType: 'membership',
    targetId: row.membership_id,
  })

  redirect(`/a/${agency?.slug ?? ''}`)
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-rose-700">Invito non valido</h1>
        <p className="mt-2 text-sm text-slate-600">{msg}</p>
      </div>
    </div>
  )
}
