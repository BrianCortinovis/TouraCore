import { createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { CheckinWizard } from './checkin-wizard'

interface CheckinPageProps {
  params: Promise<{ token: string }>
}

export default async function PublicCheckinPage({ params }: CheckinPageProps) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: checkinToken } = await supabase
    .from('checkin_tokens')
    .select(`
      *,
      reservation:reservations(
        *,
        guest:guests(first_name, last_name, email, phone),
        room_type:room_types(name)
      )
    `)
    .eq('token', token)
    .single()

  if (!checkinToken) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('name')
    .eq('id', checkinToken.entity_id)
    .single()

  const isExpired =
    checkinToken.status === 'expired' ||
    new Date(checkinToken.expires_at) < new Date()

  const isCompleted = checkinToken.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-xl font-bold text-white">T</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Check-in Online</h1>
          <p className="mt-1 text-sm text-gray-500">{entity?.name ?? 'Struttura'}</p>
        </div>

        {isExpired && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">Link scaduto</p>
            <p className="mt-2 text-sm text-red-600">
              Questo link di check-in non è più valido. Contatta la struttura per richiederne uno nuovo.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <p className="font-medium text-green-800">Check-in completato</p>
            <p className="mt-2 text-sm text-green-600">
              Hai già completato il check-in online. Ti aspettiamo!
            </p>
          </div>
        )}

        {!isExpired && !isCompleted && (
          <CheckinWizard
            token={token}
            reservation={checkinToken.reservation as Record<string, unknown>}
            guestData={(checkinToken.guest_data ?? {}) as Record<string, string>}
          />
        )}
      </div>
    </div>
  )
}
