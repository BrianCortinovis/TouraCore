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
    .select('id, name, tenant_id')
    .eq('id', checkinToken.entity_id)
    .single()

  // Accommodation config: tassa soggiorno
  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('tourist_tax_enabled, tourist_tax_max_nights, tourist_tax_municipality, tourist_tax_payment_policy')
    .eq('entity_id', checkinToken.entity_id)
    .maybeSingle()

  // Calcola tassa soggiorno se attiva
  let taxAmountCents = 0
  let taxNights = 0
  let taxPerPerson = 0
  const checkIn = checkinToken.reservation?.check_in as string | undefined
  const checkOut = checkinToken.reservation?.check_out as string | undefined
  const adults = Number(checkinToken.reservation?.adults ?? 1)
  const children = Number(checkinToken.reservation?.children ?? 0)

  if (accommodation?.tourist_tax_enabled && checkIn && checkOut) {
    const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))
    const maxNights = accommodation.tourist_tax_max_nights ?? 5
    taxNights = Math.min(nights, maxNights)
    const { data: rates } = await supabase
      .from('tourist_tax_rates')
      .select('rate_per_person, category')
      .eq('entity_id', checkinToken.entity_id)
      .eq('is_active', true)
    const adultRate = Number((rates ?? []).find((r) => r.category === 'adult')?.rate_per_person ?? 0)
    const childRate = Number((rates ?? []).find((r) => r.category === 'child_0-9')?.rate_per_person ?? 0)
    taxPerPerson = adultRate
    const totalEur = (adultRate * adults + childRate * children) * taxNights
    taxAmountCents = Math.round(totalEur * 100)
  }

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
            entityId={checkinToken.entity_id}
            reservation={checkinToken.reservation as Record<string, unknown>}
            guestData={(checkinToken.guest_data ?? {}) as Record<string, string>}
            taxAmountCents={taxAmountCents}
            taxNights={taxNights}
            taxPerPerson={taxPerPerson}
            taxAlreadyPaid={Boolean(checkinToken.tourist_tax_paid_at)}
            taxPaymentPolicy={(accommodation?.tourist_tax_payment_policy ?? 'onsite_only') as 'online_only' | 'onsite_only' | 'guest_choice'}
            taxInitialChoice={(checkinToken.tourist_tax_payment_choice ?? null) as 'online' | 'onsite' | null}
            hasFrontDoc={Boolean(checkinToken.document_front_url)}
            hasBackDoc={Boolean(checkinToken.document_back_url)}
          />
        )}
      </div>
    </div>
  )
}
