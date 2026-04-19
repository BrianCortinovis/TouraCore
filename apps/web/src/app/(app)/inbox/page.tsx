import { redirect } from 'next/navigation'
import { getCurrentUser } from '@touracore/auth'
import { listInbox } from '@touracore/notifications'
import { InboxList } from './inbox-list'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/inbox')

  const entries = await listInbox(user.id, 100)

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="mt-1 text-sm text-slate-600">Notifiche e messaggi sistema</p>
      </header>

      <InboxList initial={entries} />
    </div>
  )
}
