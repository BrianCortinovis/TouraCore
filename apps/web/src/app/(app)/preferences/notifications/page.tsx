import { redirect } from 'next/navigation'
import { getCurrentUser } from '@touracore/auth'
import { listPreferences } from '@touracore/notifications'
import { PrefsForm } from './prefs-form'

export const dynamic = 'force-dynamic'

const EVENTS = [
  'booking.confirmed',
  'booking.cancelled',
  'booking.reminder',
  'payment.received',
  'payment.failed',
  'review.request',
  'team.invite_sent',
  'agency.onboarding_completed',
  'commission.paid',
] as const

const CHANNELS = ['email', 'sms', 'whatsapp', 'push', 'in_app'] as const

export default async function PrefsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/preferences/notifications')

  const prefs = await listPreferences(user.id, null)
  const prefMap = new Map<string, boolean>()
  for (const p of prefs) prefMap.set(`${p.event_key}|${p.channel}`, p.enabled)

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Preferenze notifiche</h1>
        <p className="mt-1 text-sm text-slate-600">
          Controllo GDPR (Art. 21): disabilita canali specifici per evento. Default: opt-in.
        </p>
      </header>

      <PrefsForm events={[...EVENTS]} channels={[...CHANNELS]} initial={Object.fromEntries(prefMap)} />
    </div>
  )
}
