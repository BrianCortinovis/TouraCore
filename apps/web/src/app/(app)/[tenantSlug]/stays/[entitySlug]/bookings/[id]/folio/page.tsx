import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@touracore/db/server'
import { ArrowLeft, UtensilsCrossed, Receipt } from 'lucide-react'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string; id: string }>
}

export default async function ReservationFolioPage({ params }: Props) {
  const { tenantSlug, entitySlug, id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, reservation_code, check_in, check_out, total_amount, paid_amount, currency, guests(first_name, last_name, email)')
    .eq('id', id)
    .maybeSingle()
  if (!reservation) notFound()

  const guest = Array.isArray(reservation.guests) ? reservation.guests[0] : reservation.guests
  const guestObj = guest as { first_name?: string; last_name?: string; email?: string } | null

  const { data: folioCharges } = await supabase
    .from('folio_charges')
    .select('id, source, source_id, description, amount, vat_amount, currency, created_at, meal_plan_credit_used')
    .eq('reservation_id', id)
    .order('created_at', { ascending: false })

  const { data: restaurantReservations } = await supabase
    .from('restaurant_reservations')
    .select('id, slot_date, slot_time, party_size, status, restaurants(id, entities(name))')
    .eq('linked_stay_reservation_id', id)
    .order('slot_date', { ascending: false })

  const { data: refunds } = await supabase
    .from('payment_refunds')
    .select('id, amount, currency, reason, status, created_at')
    .eq('reservation_id', id)
    .order('created_at', { ascending: false })

  const totalCharges = (folioCharges ?? []).reduce((s, c) => s + Number(c.amount), 0)
  const totalRefunds = (refunds ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const balance = Number(reservation.total_amount) + totalCharges - Number(reservation.paid_amount) - totalRefunds

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href={`/${tenantSlug}/stays/${entitySlug}/bookings`}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-3 w-3"/> Tutte le prenotazioni
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Folio — {reservation.reservation_code}</h1>
          <p className="text-sm text-gray-500">
            {guestObj ? `${guestObj.first_name ?? ''} ${guestObj.last_name ?? ''}`.trim() : 'Ospite'} · {reservation.check_in} → {reservation.check_out}
          </p>
        </div>
      </header>

      {/* Folio summary */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Totale prenotazione</p>
          <p className="text-xl font-bold">€ {Number(reservation.total_amount).toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Folio extra (ristorante/spa/etc)</p>
          <p className="text-xl font-bold text-amber-600">+ € {totalCharges.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Pagato</p>
          <p className="text-xl font-bold text-green-600">- € {Number(reservation.paid_amount).toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Saldo</p>
          <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>€ {balance.toFixed(2)}</p>
        </div>
      </section>

      {/* Restaurant reservations linked */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UtensilsCrossed className="h-4 w-4 text-blue-600"/>
            Prenotazioni ristorante
          </h2>
          <span className="text-xs text-gray-400">{(restaurantReservations ?? []).length}</span>
        </div>
        {(restaurantReservations ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">Nessuna prenotazione ristorante linked</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Ora</th>
                <th className="px-4 py-2 text-left">Coperti</th>
                <th className="px-4 py-2 text-left">Ristorante</th>
                <th className="px-4 py-2 text-left">Stato</th>
              </tr>
            </thead>
            <tbody>
              {(restaurantReservations ?? []).map((r) => {
                const rest = Array.isArray(r.restaurants) ? r.restaurants[0] : r.restaurants
                const restObj = rest as { id?: string; entities?: { name?: string } | { name?: string }[] } | null
                const restEntity = Array.isArray(restObj?.entities) ? restObj?.entities[0] : restObj?.entities
                return (
                  <tr key={r.id as string} className="border-t border-gray-100">
                    <td className="px-4 py-2">{r.slot_date}</td>
                    <td className="px-4 py-2">{(r.slot_time as string)?.slice(0, 5)}</td>
                    <td className="px-4 py-2">{r.party_size}</td>
                    <td className="px-4 py-2 text-xs">{(restEntity as { name?: string } | undefined)?.name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px]">{r.status as string}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Folio charges */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-amber-600"/>
            Charge to room
          </h2>
        </div>
        {(folioCharges ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">Nessun charge to room</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Quando</th>
                <th className="px-4 py-2 text-left">Sorgente</th>
                <th className="px-4 py-2 text-left">Descrizione</th>
                <th className="px-4 py-2 text-right">Importo</th>
                <th className="px-4 py-2 text-right">IVA</th>
                <th className="px-4 py-2 text-right">Meal plan</th>
              </tr>
            </thead>
            <tbody>
              {(folioCharges ?? []).map((c) => (
                <tr key={c.id as string} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(c.created_at as string).toLocaleString('it-IT')}</td>
                  <td className="px-4 py-2 text-xs">
                    <span className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{c.source as string}</span>
                  </td>
                  <td className="px-4 py-2 text-xs">{c.description as string}</td>
                  <td className="px-4 py-2 text-right font-medium">€ {Number(c.amount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">€ {Number(c.vat_amount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">€ {Number(c.meal_plan_credit_used).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Refunds */}
      {(refunds ?? []).length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-3">
            <h2 className="text-sm font-semibold">Rimborsi</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Quando</th>
                <th className="px-4 py-2 text-left">Motivo</th>
                <th className="px-4 py-2 text-right">Importo</th>
                <th className="px-4 py-2 text-left">Stato</th>
              </tr>
            </thead>
            <tbody>
              {(refunds ?? []).map((r) => (
                <tr key={r.id as string} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(r.created_at as string).toLocaleString('it-IT')}</td>
                  <td className="px-4 py-2 text-xs">{(r.reason as string) ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-red-600">- € {Number(r.amount).toFixed(2)}</td>
                  <td className="px-4 py-2"><span className="text-[10px]">{r.status as string}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
