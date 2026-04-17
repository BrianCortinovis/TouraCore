import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { CalendarDays, MapPin, Wifi, KeyRound, MessageSquare, ShoppingBag } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export default async function GuestPortalPage({ params }: Props) {
  const { token } = await params
  if (!token || token.length < 16) notFound()

  const admin = await createServiceRoleClient()
  const { data: tokenRow } = await admin
    .from('guest_portal_tokens')
    .select('id, reservation_id, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) notFound()
  if (new Date(tokenRow.expires_at as string) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 text-center">
          <p className="text-gray-500">Link scaduto</p>
        </div>
      </div>
    )
  }

  // Update used_count async
  void admin.from('guest_portal_tokens').update({
    used_count: (tokenRow as { used_count?: number }).used_count
      ? Number((tokenRow as { used_count?: number }).used_count) + 1
      : 1,
    last_used_at: new Date().toISOString(),
  }).eq('id', tokenRow.id)

  const { data: reservation } = await admin
    .from('reservations')
    .select('id, reservation_code, check_in, check_out, adults, children, status, entity_id, room_id, guests(first_name, last_name, email)')
    .eq('id', tokenRow.reservation_id)
    .single()

  if (!reservation) notFound()

  const guest = Array.isArray(reservation.guests) ? reservation.guests[0] : reservation.guests
  const guestObj = guest as { first_name?: string; last_name?: string; email?: string } | null

  const { data: entity } = await admin
    .from('entities')
    .select('id, name')
    .eq('id', reservation.entity_id)
    .single()

  const { data: accommodation } = await admin
    .from('accommodations')
    .select('address, city, phone, email, default_check_in_time, default_check_out_time, wifi_name, wifi_password')
    .eq('entity_id', reservation.entity_id)
    .maybeSingle()

  // Linked restaurant reservations
  const { data: restReservations } = await admin
    .from('restaurant_reservations')
    .select('id, slot_date, slot_time, party_size, status')
    .eq('linked_stay_reservation_id', reservation.id)
    .order('slot_date')

  // Smart locks for room
  const { data: locks } = await admin
    .from('smart_locks')
    .select('id, device_name')
    .eq('entity_id', reservation.entity_id)
    .eq('active', true)

  // Active access codes for this reservation
  const { data: codes } = await admin
    .from('lock_access_codes')
    .select('id, lock_id, pin_code, valid_from, valid_to, status')
    .eq('reservation_id', reservation.id)
    .eq('status', 'active')

  const lockMap = new Map((locks ?? []).map((l) => [l.id as string, l.device_name as string]))

  // Available upsell services (per entity)
  const { data: services } = await admin
    .from('upsell_orders')
    .select('id, service_code, service_name, total_amount, status, created_at')
    .eq('reservation_id', reservation.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900">Il tuo soggiorno</h1>
          <p className="mt-1 text-sm text-gray-500">{entity?.name}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-6">
        {/* Welcome */}
        <section className="rounded-2xl bg-white p-6 shadow">
          <p className="text-xs uppercase text-gray-500">Benvenuto</p>
          <h2 className="mt-1 text-3xl font-bold">
            {guestObj?.first_name ?? 'Ospite'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">Codice prenotazione: <span className="font-mono font-bold">{reservation.reservation_code}</span></p>
        </section>

        {/* Stay details */}
        <section className="rounded-2xl bg-white p-6 shadow">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
            <CalendarDays className="h-4 w-4"/> Dettagli soggiorno
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Check-in</dt>
              <dd className="font-medium">{reservation.check_in} {accommodation?.default_check_in_time && `· ${accommodation.default_check_in_time}`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Check-out</dt>
              <dd className="font-medium">{reservation.check_out} {accommodation?.default_check_out_time && `· ${accommodation.default_check_out_time}`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Ospiti</dt>
              <dd className="font-medium">{reservation.adults} adulti{(reservation.children as number) > 0 ? `, ${reservation.children} bambini` : ''}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Stato</dt>
              <dd>
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{reservation.status}</span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Address */}
        {accommodation?.address && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
              <MapPin className="h-4 w-4"/> Indirizzo
            </h3>
            <p className="mt-2 text-sm">{accommodation.address}, {accommodation.city}</p>
            {accommodation.phone && <p className="mt-1 text-xs text-gray-500">📞 {accommodation.phone}</p>}
            {accommodation.email && <p className="text-xs text-gray-500">✉️ {accommodation.email}</p>}
          </section>
        )}

        {/* WiFi */}
        {accommodation?.wifi_name && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
              <Wifi className="h-4 w-4"/> WiFi
            </h3>
            <div className="mt-3 space-y-1 font-mono text-sm">
              <p>SSID: <span className="font-bold">{accommodation.wifi_name}</span></p>
              {accommodation.wifi_password && <p>Password: <span className="font-bold">{accommodation.wifi_password}</span></p>}
            </div>
          </section>
        )}

        {/* PIN access codes */}
        {(codes ?? []).length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
              <KeyRound className="h-4 w-4"/> Accesso camera
            </h3>
            <div className="mt-3 space-y-2">
              {(codes ?? []).map((c) => (
                <div key={c.id as string} className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-700">{lockMap.get(c.lock_id as string) ?? 'Smart lock'}</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-blue-900">{c.pin_code}</p>
                  <p className="mt-1 text-[10px] text-blue-600">
                    Valido {new Date(c.valid_from as string).toLocaleString('it-IT')} → {new Date(c.valid_to as string).toLocaleString('it-IT')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Restaurant reservations */}
        {(restReservations ?? []).length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-sm font-bold uppercase text-gray-500">🍽 Prenotazioni ristorante</h3>
            <div className="mt-3 space-y-2">
              {(restReservations ?? []).map((r) => (
                <div key={r.id as string} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-medium">{r.slot_date} alle {(r.slot_time as string).slice(0, 5)}</p>
                  <p className="text-xs text-amber-700">{r.party_size} coperti · {r.status}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upsell services orders */}
        {(services ?? []).length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
              <ShoppingBag className="h-4 w-4"/> I tuoi ordini
            </h3>
            <ul className="mt-3 space-y-2">
              {(services ?? []).map((s) => (
                <li key={s.id as string} className="flex justify-between rounded-lg border border-gray-200 p-3 text-sm">
                  <span>{s.service_name}</span>
                  <span className="font-medium">€ {Number(s.total_amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Contact */}
        <section className="rounded-2xl bg-white p-6 shadow">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
            <MessageSquare className="h-4 w-4"/> Contattaci
          </h3>
          <p className="mt-2 text-sm text-gray-600">Per qualsiasi necessità contatta lo staff via email o telefono.</p>
        </section>

        <footer className="pt-4 text-center text-xs text-gray-400">
          Powered by TouraCore
        </footer>
      </main>
    </div>
  )
}

export const metadata = { robots: 'noindex, nofollow' }
