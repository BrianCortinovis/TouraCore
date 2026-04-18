import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import {
  listPartnerLinks,
  listPartnerCommissions,
  getPartnerStats,
} from '@touracore/partners/server'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

export default async function PartnerDashboard({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  // Lookup by slug + check user_id = current auth user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/partner/${slug}/dashboard`)

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!partner) {
    // Partner link non associato: mostra placeholder welcome
    return (
      <div style={{ minHeight: '100vh', padding: 40, fontFamily: 'Inter, sans-serif', background: '#f9fafb' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: 32, background: '#fff', borderRadius: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Benvenuto in TouraCore Partners</h1>
          <p style={{ marginTop: 12, color: '#4b5563' }}>
            Il tuo account utente non è ancora collegato al profilo partner “{slug}”. Contatta il tenant per associare
            la tua email al tuo profilo partner.
          </p>
        </div>
      </div>
    )
  }

  const p = partner as { id: string; name: string; slug: string; tenant_id: string; commission_pct_default: number; status: string }

  const [links, commissions, stats] = await Promise.all([
    listPartnerLinks({ partnerId: p.id, tenantId: p.tenant_id }),
    listPartnerCommissions({ tenantId: p.tenant_id, partnerId: p.id, limit: 20 }),
    getPartnerStats({ partnerId: p.id, tenantId: p.tenant_id }),
  ])

  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug, name')
    .eq('id', p.tenant_id)
    .maybeSingle()
  const tSlug = (tenant as { slug?: string } | null)?.slug ?? ''

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Partner Dashboard
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{p.name}</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Commission {p.commission_pct_default}% · Stato: {p.status}
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1024, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          <Stat label="Clicks" value={stats.totalClicks.toString()} />
          <Stat label="Conversions" value={stats.totalConversions.toString()} hint={`${stats.conversionRate}% CR`} />
          <Stat label="Revenue generato" value={`€${stats.totalBookingAmount.toFixed(2)}`} />
          <Stat label="Commission maturata" value={`€${(stats.totalCommissionPending + stats.totalCommissionPaid).toFixed(2)}`} hint={`€${stats.totalCommissionPending.toFixed(2)} in attesa`} />
        </div>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>I tuoi link referral</h2>
          {links.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              Nessun link ancora. Contatta il tenant per far creare il tuo primo codice.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {links.map((l) => {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://touracore.vercel.app'
                const url = `${baseUrl}/book/multi/${tSlug}?ref=${l.code}`
                return (
                  <div key={l.id} style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{l.code}</p>
                        {l.label && <p style={{ fontSize: 11, color: '#6b7280' }}>{l.label}</p>}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {l.click_count} clicks · {l.conversion_count} conversions
                      </div>
                    </div>
                    <code style={{ display: 'block', marginTop: 6, padding: 6, background: '#f9fafb', fontSize: 11, borderRadius: 4, overflow: 'auto' }}>
                      {url}
                    </code>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Ultime commissioni</h2>
          <div style={{ overflow: 'hidden', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left' }}>Data</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Vertical</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Booking</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      Nessuna commissione ancora
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => (
                    <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8 }}>{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                      <td style={{ padding: 8 }}>{c.vertical}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>€{Number(c.booking_amount).toFixed(2)}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                        €{Number(c.commission_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: 8 }}>{c.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
          Hai una domanda? Contatta il tenant. TouraCore Partner Portal.
        </footer>
      </main>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', color: '#6b7280', letterSpacing: 1 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</p>
      {hint && <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{hint}</p>}
    </div>
  )
}
