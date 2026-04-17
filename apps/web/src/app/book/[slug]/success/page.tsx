import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ code?: string }>
}) {
  const { slug } = await params
  const { code } = await searchParams
  if (!code) notFound()

  const supabase = await createServiceRoleClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (!entity) notFound()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('reservation_code, check_in, check_out, total_amount, paid_amount, currency')
    .eq('entity_id', entity.id)
    .eq('reservation_code', code)
    .maybeSingle()

  return (
    <div style={{ maxWidth: 560, margin: '80px auto', padding: 24, textAlign: 'center', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ fontSize: 64, color: '#16a34a' }}>✓</div>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: '16px 0 8px' }}>Pagamento ricevuto</h1>
      <p style={{ color: '#64748b' }}>Grazie per aver scelto <strong>{entity.name}</strong></p>

      {reservation && (
        <div style={{ background: '#f9fafb', padding: 24, borderRadius: 12, marginTop: 24 }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', margin: 0 }}>Codice prenotazione</p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 16px' }}>{reservation.reservation_code}</p>
          <p style={{ margin: 0 }}>{reservation.check_in} → {reservation.check_out}</p>
          <p style={{ fontSize: 24, fontWeight: 700, marginTop: 12, color: '#16a34a' }}>
            {reservation.currency} {Number(reservation.total_amount).toFixed(2)}
          </p>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 13, color: '#64748b' }}>
        Riceverai una email di conferma con tutti i dettagli.
      </p>
    </div>
  )
}
