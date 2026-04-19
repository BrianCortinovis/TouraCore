import { createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { CheckoutWizard } from './checkout-wizard'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicCheckoutPage({ params }: Props) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: checkoutToken } = await supabase
    .from('checkout_tokens')
    .select(`
      *,
      booking:reservations(id, check_in, check_out, adults, children, total_amount, guest:guests(first_name, last_name), room_type:room_types(name))
    `)
    .eq('token', token)
    .maybeSingle()

  if (!checkoutToken) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('id', checkoutToken.entity_id)
    .maybeSingle()

  const isExpired = checkoutToken.status === 'expired' || new Date(checkoutToken.expires_at) < new Date()
  const isCompleted = checkoutToken.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-xl font-bold text-white">T</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Check-out Online</h1>
          <p className="mt-1 text-sm text-gray-500">{entity?.name ?? 'Struttura'}</p>
        </div>

        {isExpired && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">Link scaduto</p>
          </div>
        )}
        {isCompleted && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <p className="font-medium text-green-800">Check-out completato. Grazie!</p>
          </div>
        )}
        {!isExpired && !isCompleted && (
          <CheckoutWizard
            token={token}
            booking={(checkoutToken.booking ?? {}) as Record<string, unknown>}
          />
        )}
      </div>
    </div>
  )
}
