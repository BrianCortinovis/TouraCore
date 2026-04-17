import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function GuestPortalPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createServiceRoleClient()

  const { data: tokenRow } = await supabase
    .from('guest_portal_tokens')
    .select('reservation_id, expires_at, revoked_at, guest_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) notFound()
  if (tokenRow.revoked_at) notFound()
  if (new Date(tokenRow.expires_at) < new Date()) notFound()

  await supabase
    .from('guest_portal_tokens')
    .update({
      last_used_at: new Date().toISOString(),
      use_count: ((tokenRow as unknown as { use_count?: number }).use_count ?? 0) + 1,
    })
    .eq('token', token)

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, reservation_code, check_in, check_out, guest_name, adults, children, entity_id, status')
    .eq('id', tokenRow.reservation_id)
    .single()

  if (!reservation) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('name, city, province, address, latitude, longitude')
    .eq('id', reservation.entity_id)
    .single()

  const { data: guidebook } = await supabase
    .from('guidebooks')
    .select('id, title, intro, guidebook_items(id, category, name, description, address, url)')
    .eq('entity_id', reservation.entity_id)
    .eq('is_published', true)
    .maybeSingle()

  const { data: upsells } = await supabase
    .from('upsell_offers')
    .select('id, name, description, price, category')
    .eq('entity_id', reservation.entity_id)
    .eq('is_active', true)
    .eq('online_bookable', true)
    .limit(10)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 px-6 py-6 text-white">
        <h1 className="text-2xl font-bold">Benvenuto a {entity?.name}</h1>
        <p className="mt-1 text-blue-100">{reservation.guest_name}</p>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Il tuo soggiorno</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Codice</div>
              <div className="font-mono">{reservation.reservation_code}</div>
            </div>
            <div>
              <div className="text-gray-500">Stato</div>
              <div className="font-medium capitalize">{reservation.status}</div>
            </div>
            <div>
              <div className="text-gray-500">Check-in</div>
              <div className="font-medium">{new Date(reservation.check_in).toLocaleDateString('it-IT')}</div>
            </div>
            <div>
              <div className="text-gray-500">Check-out</div>
              <div className="font-medium">{new Date(reservation.check_out).toLocaleDateString('it-IT')}</div>
            </div>
            <div>
              <div className="text-gray-500">Ospiti</div>
              <div className="font-medium">{reservation.adults} adulti{reservation.children > 0 && ` + ${reservation.children} bambini`}</div>
            </div>
            <div>
              <div className="text-gray-500">Struttura</div>
              <div className="font-medium">{entity?.city}{entity?.province ? `, ${entity.province}` : ''}</div>
            </div>
          </div>
          {entity?.address && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              <strong>Indirizzo:</strong> {entity.address}
            </div>
          )}
        </section>

        {upsells && upsells.length > 0 && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Servizi extra</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {upsells.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-sm">€{Number(u.price).toFixed(2)}</span>
                  </div>
                  {u.description && <p className="mt-1 text-xs text-gray-500">{u.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {guidebook && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">{guidebook.title}</h2>
            {guidebook.intro && <p className="mb-4 text-sm text-gray-600">{guidebook.intro}</p>}
            <div className="space-y-2">
              {(guidebook.guidebook_items ?? []).map((item) => (
                <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs uppercase text-gray-500">{item.category}</div>
                  <div className="font-medium">{item.name}</div>
                  {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
                  {item.address && <div className="mt-1 text-xs text-gray-500">{item.address}</div>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener" className="mt-1 inline-block text-xs text-blue-600">
                      Vedi maggiori info
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Hai bisogno di aiuto?</h2>
          <p className="text-sm text-gray-600">
            Contatta direttamente l'host tramite l'inbox della struttura. I messaggi arrivano in tempo reale.
          </p>
        </section>
      </div>
    </main>
  )
}
