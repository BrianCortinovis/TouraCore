import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { SuperadminSidebar } from './superadmin-sidebar'

interface SuperadminLayoutProps {
  children: React.ReactNode
}

export default async function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/superadmin-login')

  // Verifica platform_admin usando service_role per bypassare RLS
  const adminClient = await createServiceRoleClient()

  const { data: admin } = await adminClient
    .from('platform_admins')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) redirect('/superadmin-login')

  return (
    <div className="flex gap-6">
      <SuperadminSidebar role={admin.role} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
