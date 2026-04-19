import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getCurrentUser } from '@touracore/auth'
import { getUnreadCount } from '@touracore/notifications'

export async function InboxBell() {
  const user = await getCurrentUser()
  if (!user) return null
  const count = await getUnreadCount(user.id)

  return (
    <Link
      href="/messages"
      className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
      aria-label={`Inbox (${count} non letti)`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
