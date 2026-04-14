import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { redirect } from 'next/navigation'
import { AgencySidebar } from './agency-sidebar'

interface AgencyLayoutProps {
  children: React.ReactNode
}

export default async function AgencyLayout({ children }: AgencyLayoutProps) {
  const supabase = await createServerSupabaseClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('agency_memberships')
    .select('agency_id, role, agencies(id, name, slug)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/')

  const agency = membership.agencies as unknown as { id: string; name: string; slug: string }

  return (
    <div className="flex gap-6">
      <AgencySidebar agencyName={agency.name} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
