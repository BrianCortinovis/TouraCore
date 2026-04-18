'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Gift, Ticket, Tag, CreditCard, Copy, Check, X, Pause, Play } from 'lucide-react'
import type {
  CreditInstrumentRow,
  CreditKind,
  GiftCardDesignRow,
} from '@touracore/vouchers'
import { issueCreditAction, setCreditStatusAction } from './actions'

type Tab = 'gift_card' | 'voucher' | 'promo_code' | 'store_credit'

interface Stats {
  byKind: Record<CreditKind, { count: number; liabilityOutstanding: number; lifetimeIssued: number; redeemed: number }>
  totalLiability: number
  totalRedeemed: number
  expiringWithin30d: number
  totalActive: number
}

interface Props {
  tenantSlug: string
  tenantName: string
  activeTab: Tab
  credits: CreditInstrumentRow[]
  totalCredits: number
  stats: Stats
  designs: GiftCardDesignRow[]
  entities: Array<{ id: string; slug: string; name: string; kind: string }>
  filters: { q: string; status: string }
}

const TAB_META: Record<Tab, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  gift_card: { label: 'Gift Card', icon: Gift, desc: 'Saldo multi-uso acquistabile o regalato' },
  voucher: { label: 'Voucher', icon: Ticket, desc: 'Buoni sconto a importo fisso single-use' },
  promo_code: { label: 'Promo Code', icon: Tag, desc: 'Codici campagna multi-uso (percentuale o fisso)' },
  store_credit: { label: 'Store Credit', icon: CreditCard, desc: 'Credito emesso come rimborso/compensazione' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: 'Attivo', color: 'bg-green-100 text-green-800' },
  redeemed: { label: 'Esaurito', color: 'bg-gray-200 text-gray-700' },
  expired: { label: 'Scaduto', color: 'bg-amber-100 text-amber-900' },
  cancelled: { label: 'Annullato', color: 'bg-red-100 text-red-800' },
  suspended: { label: 'Sospeso', color: 'bg-yellow-100 text-yellow-800' },
  pending: { label: 'In attesa', color: 'bg-blue-50 text-blue-800' },
}

export function CreditsStudio({
  tenantSlug,
  tenantName,
  activeTab,
  credits,
  totalCredits,
  stats,
  designs,
  entities,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [justIssued, setJustIssued] = useState<{ code: string; last4: string; id: string } | null>(null)

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    params.delete('q')
    params.delete('status')
    router.push(`/settings/credits?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credits Studio</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gift card, voucher, promo code e store credit — {tenantName}
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Emetti nuovo
        </button>
      </header>

      {/* Stats cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          label="Attivi totali"
          value={stats.totalActive.toString()}
          hint={`${stats.expiringWithin30d} in scadenza 30gg`}
        />
        <StatCard
          label="Liability outstanding"
          value={`€${stats.totalLiability.toFixed(2)}`}
          hint="Saldo gift card + voucher non riscattato (debito)"
        />
        <StatCard
          label="Revenue recognized"
          value={`€${stats.totalRedeemed.toFixed(2)}`}
          hint="Totale riscattato (ricavo contabile)"
        />
        <StatCard
          label="Ratio utilizzo"
          value={`${stats.totalRedeemed + stats.totalLiability > 0 ? Math.round((stats.totalRedeemed / (stats.totalRedeemed + stats.totalLiability)) * 100) : 0}%`}
          hint="Redeemed / (Liability + Redeemed)"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {(Object.keys(TAB_META) as Tab[]).map((k) => {
            const meta = TAB_META[k]
            const Icon = meta.icon
            const active = activeTab === k
            const kindStats = stats.byKind[k]
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {meta.label}
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {kindStats.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Filter bar */}
      <form
        className="flex flex-wrap items-center gap-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget as HTMLFormElement
          const fd = new FormData(form)
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', activeTab)
          const q = String(fd.get('q') ?? '').trim()
          if (q) params.set('q', q)
          else params.delete('q')
          const status = String(fd.get('status') ?? '')
          if (status) params.set('status', status)
          else params.delete('status')
          router.push(`/settings/credits?${params.toString()}`)
        }}
      >
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Cerca last4, email, nome…"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tutti gli stati</option>
          <option value="active">Attivi</option>
          <option value="redeemed">Esauriti</option>
          <option value="expired">Scaduti</option>
          <option value="suspended">Sospesi</option>
          <option value="cancelled">Annullati</option>
          <option value="pending">In attesa</option>
        </select>
        <button type="submit" className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
          Filtra
        </button>
        <span className="ml-auto text-xs text-gray-500">{totalCredits} risultati</span>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Codice</th>
              <th className="px-4 py-3 text-left font-semibold">Importo</th>
              <th className="px-4 py-3 text-left font-semibold">Saldo</th>
              <th className="px-4 py-3 text-left font-semibold">Destinatario</th>
              <th className="px-4 py-3 text-left font-semibold">Scope</th>
              <th className="px-4 py-3 text-left font-semibold">Scadenza</th>
              <th className="px-4 py-3 text-left font-semibold">Stato</th>
              <th className="px-4 py-3 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {credits.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nessun {TAB_META[activeTab].label.toLowerCase()} ancora emesso.
                </td>
              </tr>
            ) : (
              credits.map((c) => (
                <CreditRow key={c.id} credit={c} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {wizardOpen && (
        <IssueWizard
          kind={activeTab}
          designs={designs}
          entities={entities}
          onClose={(r) => {
            setWizardOpen(false)
            if (r) {
              setJustIssued(r)
              router.refresh()
            }
          }}
        />
      )}

      {justIssued && (
        <CodeRevealModal
          code={justIssued.code}
          last4={justIssued.last4}
          onClose={() => setJustIssued(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{hint}</p>
    </div>
  )
}

function CreditRow({ credit }: { credit: CreditInstrumentRow }) {
  const [pending, startTransition] = useTransition()
  const statusMeta = STATUS_META[credit.status] ?? { label: credit.status, color: 'bg-gray-100 text-gray-700' }

  const toggle = (status: 'active' | 'suspended' | 'cancelled') => {
    startTransition(async () => {
      await setCreditStatusAction({ id: credit.id, status })
    })
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-xs text-gray-800">
        ****-****-****-{credit.code_last4}
      </td>
      <td className="px-4 py-3 text-gray-900">
        €{Number(credit.initial_amount).toFixed(2)}
        {credit.kind === 'promo_code' && credit.discount_type ? (
          <span className="ml-1 text-[11px] text-gray-500">
            ({credit.discount_type === 'percent' ? `${credit.discount_value}%` : `€${credit.discount_value}`})
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-gray-700">
        {credit.kind === 'promo_code' ? '—' : `€${Number(credit.current_balance).toFixed(2)}`}
      </td>
      <td className="px-4 py-3 text-gray-700">
        {credit.recipient_name ? (
          <div>
            <div className="font-medium">{credit.recipient_name}</div>
            <div className="text-[11px] text-gray-500">{credit.recipient_email}</div>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        {credit.vertical_scope.length === 0 ? (
          <span className="text-gray-500">Tutti</span>
        ) : (
          credit.vertical_scope.join(', ')
        )}
        {credit.entity_scope.length > 0 && (
          <div className="text-[10px] text-gray-400">{credit.entity_scope.length} entity</div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        {credit.expires_at ? new Date(credit.expires_at).toLocaleDateString('it-IT') : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.color}`}>
          {statusMeta.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {credit.status === 'active' && (
          <button
            disabled={pending}
            onClick={() => toggle('suspended')}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            title="Sospendi"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        )}
        {credit.status === 'suspended' && (
          <button
            disabled={pending}
            onClick={() => toggle('active')}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            title="Riattiva"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {credit.status !== 'cancelled' && credit.status !== 'redeemed' && (
          <button
            disabled={pending}
            onClick={() => toggle('cancelled')}
            className="ml-1 rounded-md p-1.5 text-red-600 hover:bg-red-50"
            title="Annulla"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <Link
          href={`/settings/credits/${credit.id}`}
          className="ml-1 inline-block rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
        >
          Dettagli
        </Link>
      </td>
    </tr>
  )
}

function IssueWizard({
  kind,
  designs,
  entities,
  onClose,
}: {
  kind: Tab
  designs: GiftCardDesignRow[]
  entities: Array<{ id: string; slug: string; name: string; kind: string }>
  onClose: (result: { code: string; last4: string; id: string } | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    initialAmount: kind === 'promo_code' ? 100 : 50,
    currency: 'EUR',
    expiresDays: 365,
    maxUses: kind === 'voucher' ? 1 : kind === 'promo_code' ? 100 : undefined,
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: kind === 'promo_code' ? 10 : undefined,
    recipientEmail: '',
    recipientName: '',
    senderName: '',
    personalMessage: '',
    designId: designs.find((d) => d.is_system && d.theme_preset === 'neutral')?.id,
    verticalScope: [] as string[],
    entityScope: [] as string[],
    notes: '',
  })

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const expiresAt = form.expiresDays
        ? new Date(Date.now() + form.expiresDays * 86400_000).toISOString()
        : undefined
      const r = await issueCreditAction({
        kind,
        initialAmount: form.initialAmount,
        currency: form.currency,
        expiresAt,
        maxUses: form.maxUses,
        discountType: kind === 'promo_code' ? form.discountType : undefined,
        discountValue: kind === 'promo_code' ? form.discountValue : undefined,
        verticalScope: form.verticalScope as never,
        entityScope: form.entityScope,
        recipientEmail: form.recipientEmail || undefined,
        recipientName: form.recipientName || undefined,
        senderName: form.senderName || undefined,
        personalMessage: form.personalMessage || undefined,
        designId: form.designId,
        notes: form.notes || undefined,
      })
      if (!r.success || !r.code || !r.id || !r.codeLast4) {
        setError(r.error ?? 'Errore sconosciuto')
        return
      }
      onClose({ code: r.code, last4: r.codeLast4, id: r.id })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-10 w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            Emetti {TAB_META[kind].label}
          </h2>
          <button onClick={() => onClose(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-6 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-gray-700">Importo {kind === 'promo_code' ? 'di riferimento' : '(€)'}</span>
              <input
                type="number"
                value={form.initialAmount}
                onChange={(e) => setForm({ ...form, initialAmount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label>
              <span className="text-gray-700">Valuta</span>
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 uppercase"
              />
            </label>
          </div>

          {kind === 'promo_code' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-gray-700">Tipo sconto</span>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="percent">Percentuale %</option>
                  <option value="fixed">Importo fisso €</option>
                </select>
              </label>
              <label>
                <span className="text-gray-700">Valore sconto</span>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-gray-700">Scadenza (giorni)</span>
              <input
                type="number"
                value={form.expiresDays}
                onChange={(e) => setForm({ ...form, expiresDays: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label>
              <span className="text-gray-700">Max utilizzi</span>
              <input
                type="number"
                value={form.maxUses ?? ''}
                onChange={(e) =>
                  setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : undefined })
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <div>
            <p className="text-gray-700">Verticali ammessi (vuoto = tutti)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['hospitality', 'restaurant', 'bike_rental', 'experiences', 'wellness'].map((v) => {
                const sel = form.verticalScope.includes(v)
                return (
                  <button
                    type="button"
                    key={v}
                    onClick={() =>
                      setForm({
                        ...form,
                        verticalScope: sel
                          ? form.verticalScope.filter((x) => x !== v)
                          : [...form.verticalScope, v],
                      })
                    }
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {v.replace('_', ' ')}
                  </button>
                )
              })}
            </div>
          </div>

          {kind === 'gift_card' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-gray-700">Email destinatario</span>
                  <input
                    type="email"
                    value={form.recipientEmail}
                    onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <label>
                  <span className="text-gray-700">Nome destinatario</span>
                  <input
                    value={form.recipientName}
                    onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
              <label>
                <span className="text-gray-700">Messaggio personale</span>
                <textarea
                  rows={2}
                  value={form.personalMessage}
                  onChange={(e) => setForm({ ...form, personalMessage: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <div>
                <p className="text-gray-700">Design</p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {designs.map((d) => {
                    const sel = form.designId === d.id
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => setForm({ ...form, designId: d.id })}
                        className={`rounded-md border p-2 text-left text-[11px] ${
                          sel ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                        }`}
                        style={{
                          background: d.background_value ?? d.primary_color ?? '#fff',
                          color: d.primary_color && d.primary_color !== '#ffffff' ? 'white' : '#111',
                        }}
                      >
                        <span className="text-base">{d.accent_emoji ?? '🎁'}</span>
                        <span className="mt-1 block font-medium">{d.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <label>
            <span className="text-gray-700">Note interne (non visibili al destinatario)</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3">
          <button
            onClick={() => onClose(null)}
            disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={pending || form.initialAmount <= 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Emissione…' : 'Emetti'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function CodeRevealModal({
  code,
  last4,
  onClose,
}: {
  code: string
  last4: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-green-700">
          <Check className="h-5 w-5" />
          <h3 className="text-lg font-bold">Codice emesso</h3>
        </div>
        <p className="text-sm text-gray-600">
          <strong>Salvalo adesso.</strong> Il codice completo non verrà più mostrato. In seguito vedrai solo last4 (
          <code className="font-mono">****{last4}</code>).
        </p>
        <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-lg font-bold text-gray-900 tracking-wider">
          {code}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copiato!' : 'Copia codice'}
          </button>
          <button
            onClick={onClose}
            className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ho salvato
          </button>
        </div>
      </div>
    </div>
  )
}
