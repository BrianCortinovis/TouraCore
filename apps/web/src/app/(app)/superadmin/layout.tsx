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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6">
        <SuperadminSidebar role={admin.role} />
        <main className="min-w-0 flex-1 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur">
          {children}
        </main>
      </div>
    </div>
  )
}
