'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Plus, Link2, Key, X, Check } from 'lucide-react'
import type {
  PartnerRow,
  PartnerLinkRow,
  PartnerCommissionRow,
  PartnerStats,
} from '@touracore/partners/server'
import {
  updatePartnerStatusAction,
  createPartnerLinkAction,
  createApiKeyAction,
} from '../actions'

interface ApiKeyRow {
  id: string
  key_id: string
  name: string
  scope: string[]
  environment: 'live' | 'sandbox'
  secret_last4: string
  active: boolean
  last_used_at: string | null
  created_at: string
}

interface Props {
  partner: PartnerRow
  links: PartnerLinkRow[]
  commissions: PartnerCommissionRow[]
  stats: PartnerStats
  entities: Array<{ id: string; slug: string; name: string; kind: string }>
  apiKeys: ApiKeyRow[]
  tenantSlug: string
}

export function PartnerDetailClient({
  partner,
  links,
  commissions,
  stats,
  entities,
  apiKeys,
  tenantSlug,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'links' | 'keys' | 'commissions'>('overview')
  const [newKey, setNewKey] = useState<{ keyId: string; secret: string; last4: string } | null>(null)
  const [newLinkCode, setNewLinkCode] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <nav className="text-sm">
        <Link
          href={tenantSlug ? `/${tenantSlug}/settings/partners` : '/settings/partners'}
          className="text-blue-600 hover:underline"
        >
          ← Torna a Partners
        </Link>
      </nav>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {partner.kind.replace('_', ' ')} · {partner.contact_email} · Commission {partner.commission_pct_default}%
          </p>
        </div>
        <StatusPicker
          current={partner.status}
          onChange={async (s) => {
            await updatePartnerStatusAction({ id: partner.id, status: s })
            router.refresh()
          }}
        />
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Clicks" value={stats.totalClicks.toString()} />
        <Stat label="Conversions" value={stats.totalConversions.toString()} hint={`${stats.conversionRate}% CR`} />
        <Stat label="Bookings total" value={`€${stats.totalBookingAmount.toFixed(2)}`} />
        <Stat label="Commission earned" value={`€${(stats.totalCommissionPending + stats.totalCommissionPaid).toFixed(2)}`} hint={`€${stats.totalCommissionPending.toFixed(2)} pending`} />
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {(['overview', 'links', 'keys', 'commissions'] as const).map((k) => {
            const active = tab === k
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${
                  active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {k === 'keys' ? 'API Keys' : k}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="space-y-3">
          <InfoBox label="Email" value={partner.contact_email} />
          {partner.contact_person && <InfoBox label="Persona" value={partner.contact_person} />}
          {partner.company_name && <InfoBox label="Azienda" value={partner.company_name} />}
          <InfoBox label="Paese" value={partner.country ?? 'IT'} />
          <InfoBox label="Payout method" value={partner.payout_method ?? 'non configurato'} />
          <InfoBox label="URL dashboard self-service" value={`/partner/${partner.slug}/dashboard`} />
          {partner.notes_internal && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Note interne</p>
              <p className="mt-1">{partner.notes_internal}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'links' && (
        <PartnerLinksTab
          partnerId={partner.id}
          tenantSlug={tenantSlug}
          links={links}
          entities={entities}
          newCode={newLinkCode}
          onCreated={(code) => {
            setNewLinkCode(code)
            router.refresh()
          }}
        />
      )}

      {tab === 'keys' && (
        <PartnerKeysTab
          partnerId={partner.id}
          keys={apiKeys}
          newKey={newKey}
          onCreated={(k) => {
            setNewKey(k)
            router.refresh()
          }}
          onDismissNew={() => setNewKey(null)}
        />
      )}

      {tab === 'commissions' && <CommissionsTab commissions={commissions} />}
    </div>
  )
}

function StatusPicker({
  current,
  onChange,
}: {
  current: string
  onChange: (s: 'pending' | 'active' | 'suspended' | 'terminated') => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => startTransition(() => onChange(e.target.value as never))}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
    >
      <option value="pending">Pending</option>
      <option value="active">Active</option>
      <option value="suspended">Suspended</option>
      <option value="terminated">Terminated</option>
    </select>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-gray-500">{hint}</p>}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 w-32">{label}</span>
      <span className="font-mono text-gray-800">{value}</span>
    </div>
  )
}

function PartnerLinksTab({
  partnerId,
  tenantSlug,
  links,
  entities,
  newCode,
  onCreated,
}: {
  partnerId: string
  tenantSlug: string
  links: PartnerLinkRow[]
  entities: Array<{ id: string; slug: string; name: string; kind: string }>
  newCode: string | null
  onCreated: (code: string) => void
}) {
  const [showWizard, setShowWizard] = useState(false)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    label: '',
    channel: 'url' as 'url' | 'embed' | 'api' | 'social' | 'email',
    targetEntityId: '',
    commissionPctOverride: undefined as number | undefined,
    utmSource: '',
    utmCampaign: '',
  })

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://touracore.vercel.app'

  const submit = () => {
    startTransition(async () => {
      const r = await createPartnerLinkAction({
        partnerId,
        label: form.label || undefined,
        channel: form.channel,
        targetEntityId: form.targetEntityId || undefined,
        commissionPctOverride: form.commissionPctOverride,
        utmSource: form.utmSource || undefined,
        utmCampaign: form.utmCampaign || undefined,
      })
      if (r.success && r.code) {
        onCreated(r.code)
        setShowWizard(false)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Codici referral per URL / embed. Ogni codice tracks clicks + conversions + applica commission.
        </p>
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          <Plus className="h-3 w-3" />
          Nuovo link
        </button>
      </div>

      {newCode && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-semibold text-green-900">Codice creato: {newCode}</p>
          <p className="mt-1 text-xs text-green-700">
            URL: <code>{baseOrigin}/book/multi/{tenantSlug}?ref={newCode}</code>
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Codice</th>
              <th className="px-3 py-2 text-left">Canale</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-right">Clicks</th>
              <th className="px-3 py-2 text-right">Conv.</th>
              <th className="px-3 py-2 text-left">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  Nessun link ancora. Crea il primo codice referral.
                </td>
              </tr>
            ) : (
              links.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{l.code}</td>
                  <td className="px-3 py-2 text-xs">{l.channel ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{l.label ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{l.click_count}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">{l.conversion_count}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${l.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {l.active ? 'attivo' : 'disabilitato'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex justify-between">
              <h3 className="font-bold">Nuovo referral link</h3>
              <button onClick={() => setShowWizard(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <label>
                <span>Label (interno)</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  placeholder="es. Campagna estate Instagram"
                />
              </label>
              <label>
                <span>Canale</span>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value as never })}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="url">URL (link condiviso)</option>
                  <option value="embed">Embed (iframe su sito partner)</option>
                  <option value="api">API (integrazione tech)</option>
                  <option value="social">Social media</option>
                  <option value="email">Email campaign</option>
                </select>
              </label>
              <label>
                <span>Attività target (opzionale)</span>
                <select
                  value={form.targetEntityId}
                  onChange={(e) => setForm({ ...form, targetEntityId: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="">Tutte</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.kind})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Commission % override (opzionale)</span>
                <input
                  type="number"
                  value={form.commissionPctOverride ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, commissionPctOverride: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>
              <button
                onClick={submit}
                disabled={pending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? 'Creazione…' : 'Crea link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerKeysTab({
  partnerId,
  keys,
  newKey,
  onCreated,
  onDismissNew,
}: {
  partnerId: string
  keys: ApiKeyRow[]
  newKey: { keyId: string; secret: string; last4: string } | null
  onCreated: (k: { keyId: string; secret: string; last4: string }) => void
  onDismissNew: () => void
}) {
  const [showWizard, setShowWizard] = useState(false)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: '',
    environment: 'live' as 'live' | 'sandbox',
    scope: ['listings:read', 'availability:read', 'bookings:write'],
  })

  const ALL_SCOPES = [
    'listings:read',
    'availability:read',
    'bookings:read',
    'bookings:write',
    'bookings:cancel',
  ]

  const submit = () => {
    startTransition(async () => {
      const r = await createApiKeyAction({ ...form, partnerId })
      if (r.success && r.keyId && r.secret && r.secretLast4) {
        onCreated({ keyId: r.keyId, secret: r.secret, last4: r.secretLast4 })
        setShowWizard(false)
      }
    })
  }

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          API key per integrazioni B2B (tour operator con propri sviluppatori). Firma HMAC per ogni request.
        </p>
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          <Plus className="h-3 w-3" />
          Nuova API key
        </button>
      </div>

      {newKey && (
        <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold text-amber-900">
              <Key className="inline h-4 w-4" /> Nuova chiave creata — salva ADESSO
            </p>
            <button onClick={onDismissNew} className="text-amber-700 hover:text-amber-900">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Il secret non sarà più visibile dopo la chiusura. Copialo e salvalo nel tuo password manager.
          </p>
          <div className="mt-3 space-y-2">
            <KeyDisplay label="X-API-Key" value={newKey.keyId} onCopy={copy} />
            <KeyDisplay label="X-API-Secret" value={newKey.secret} onCopy={copy} />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Key ID</th>
              <th className="px-3 py-2 text-left">Env</th>
              <th className="px-3 py-2 text-left">Scope</th>
              <th className="px-3 py-2 text-left">Last used</th>
              <th className="px-3 py-2 text-left">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  Nessuna API key ancora.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id}>
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-600">
                    {k.key_id.slice(0, 24)}…****{k.secret_last4}
                  </td>
                  <td className="px-3 py-2 text-xs">{k.environment}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-500">{k.scope.join(', ')}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] ${k.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {k.active ? 'attiva' : 'revocata'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex justify-between">
              <h3 className="font-bold">Nuova API key</h3>
              <button onClick={() => setShowWizard(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <label>
                <span>Nome</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="es. Production integration"
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>
              <label>
                <span>Environment</span>
                <select
                  value={form.environment}
                  onChange={(e) => setForm({ ...form, environment: e.target.value as never })}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="live">Live</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </label>
              <div>
                <span>Scope</span>
                <div className="mt-1 space-y-1">
                  {ALL_SCOPES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={form.scope.includes(s)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            scope: e.target.checked ? [...form.scope, s] : form.scope.filter((x) => x !== s),
                          })
                        }
                      />
                      <span className="font-mono">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={submit}
                disabled={pending || !form.name}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? 'Creazione…' : 'Genera key + secret'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KeyDisplay({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase text-amber-700 w-24">{label}</span>
      <code className="flex-1 rounded bg-white p-2 font-mono text-[11px] break-all border">{value}</code>
      <button onClick={() => onCopy(value)} className="rounded bg-amber-100 p-2 hover:bg-amber-200">
        <Copy className="h-3 w-3" />
      </button>
    </div>
  )
}

function CommissionsTab({ commissions }: { commissions: PartnerCommissionRow[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-left">Vertical</th>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-right">Booking</th>
            <th className="px-3 py-2 text-right">% / €</th>
            <th className="px-3 py-2 text-left">Stato</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {commissions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                Nessuna commission ancora.
              </td>
            </tr>
          ) : (
            commissions.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                <td className="px-3 py-2 text-xs">{c.vertical}</td>
                <td className="px-3 py-2 text-xs">{c.source_type}</td>
                <td className="px-3 py-2 text-right text-xs">€{Number(c.booking_amount).toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-xs font-mono">
                  {c.commission_pct}% · <strong>€{Number(c.commission_amount).toFixed(2)}</strong>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] ${
                      c.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : c.status === 'earned'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
