import { createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { CheckCircle2, Calendar, Mail, Phone } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string; ref: string }>
}

export const dynamic = 'force-dynamic'

export default async function ConfirmPage({ params }: Props) {
  const { slug, ref } = await params
  const supabase = await createServiceRoleClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, slug, tenant_id')
    .eq('slug', slug)
    .eq('kind', 'activity')
    .single()
  if (!entity) notFound()

  const { data: reservation } = await supabase
    .from('experience_reservations')
    .select('reference_code, customer_name, customer_email, customer_phone, start_at, guests_count, total_cents, currency, status, payment_status, notes')
    .eq('reference_code', ref)
    .eq('tenant_id', entity.tenant_id as string)
    .single()
  if (!reservation) notFound()

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="mt-3 text-xl font-bold text-gray-900">Prenotazione confermata</h1>
        <p className="mt-1 text-sm text-gray-500">Codice: <span className="font-mono font-semibold">{reservation.reference_code}</span></p>
        <div className="mt-5 space-y-2 rounded-md bg-gray-50 p-4 text-left text-sm">
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />{new Date(reservation.start_at as string).toLocaleString('it-IT')}</p>
          <p>{entity.name} — {reservation.guests_count} partecipanti</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{reservation.customer_email}</p>
          {reservation.customer_phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{reservation.customer_phone}</p>}
          <p className="mt-2 border-t pt-2 font-semibold">Totale: €{((reservation.total_cents as number) / 100).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Status: {reservation.status} · Pagamento: {reservation.payment_status}</p>
        </div>
        <p className="mt-4 text-xs text-gray-400">Ti abbiamo inviato i dettagli via email.</p>
      </div>
    </div>
  )
}
