import { redirect } from 'next/navigation'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'
import { PlatformSidebar } from './platform-sidebar'
import { InboxBell } from '../../../components/InboxBell'

interface PlatformLayoutProps {
  children: React.ReactNode
}

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const ctx = await getVisibilityContext()

  if (!ctx.user) redirect('/superadmin-login')

  if (!ctx.isPlatformAdmin) {
    await logAgencyAction({
      action: 'platform.route_access_denied',
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.mode === 'agency' ? 'agency_member' : 'tenant',
      status: 'denied',
    })
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6">
        <PlatformSidebar
          email={ctx.user.email}
          role={ctx.platformRole ?? 'admin'}
        />
        <main className="min-w-0 flex-1 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-end">
            <InboxBell />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
