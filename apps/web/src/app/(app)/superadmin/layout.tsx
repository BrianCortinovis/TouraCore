import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { SuperadminSidebar } from './superadmin-sidebar'

interface SuperadminLayoutProps {
  children: React.ReactNode
}

export default async function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const user = await getCurrentUser()
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
