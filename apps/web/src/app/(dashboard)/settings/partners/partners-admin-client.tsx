'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Handshake, X } from 'lucide-react'
import type { PartnerRow } from '@touracore/partners'
import { createPartnerAction, updatePartnerStatusAction } from './actions'

interface Props {
  partners: PartnerRow[]
  tenantSlug: string
  totalPending: number
  pendingCount: number
  activeCount: number
}

const KIND_LABEL: Record<string, string> = {
  hotel: 'Hotel',
  tour_operator: 'Tour Operator',
  travel_agent: 'Travel Agent',
  influencer: 'Influencer',
  ota: 'OTA',
  affiliate: 'Affiliate',
  corporate: 'Corporate',
  other: 'Altro',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-gray-200 text-gray-700',
  terminated: 'bg-red-100 text-red-800',
}

export function PartnersAdminClient({
  partners,
  tenantSlug,
  totalPending,
  pendingCount,
  activeCount,
}: Props) {
  const router = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestisci partner (hotel, influencer, OTA, tour operator) — referral URL, embed, API
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuovo partner
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Partner attivi" value={activeCount.toString()} />
        <StatCard label="Commissioni pending" value={`€${totalPending.toFixed(2)}`} hint={`${pendingCount} commissions`} />
        <StatCard label="Totale partner" value={partners.length.toString()} />
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nome</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Commission</th>
              <th className="px-4 py-3 text-left font-semibold">Stato</th>
              <th className="px-4 py-3 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  <Handshake className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                  Nessun partner ancora. Crea il primo partner per distribuire il tuo inventory.
                </td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={tenantSlug ? `/${tenantSlug}/settings/partners/${p.id}` : `/settings/partners/${p.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.company_name && (
                      <div className="text-[11px] text-gray-500">{p.company_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{KIND_LABEL[p.kind] ?? p.kind}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.contact_email}</td>
                  <td className="px-4 py-3 text-gray-700">{p.commission_pct_default}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={tenantSlug ? `/${tenantSlug}/settings/partners/${p.id}` : `/settings/partners/${p.id}`}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Dettagli →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {wizardOpen && (
        <NewPartnerWizard
          onClose={(created) => {
            setWizardOpen(false)
            if (created) router.refresh()
          }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

function NewPartnerWizard({ onClose }: { onClose: (created: boolean) => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    kind: 'hotel' as const,
    contactEmail: '',
    contactPerson: '',
    companyName: '',
    commissionPctDefault: 10,
    notes: '',
  })

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const r = await createPartnerAction(form)
      if (!r.success) {
        setError(r.error ?? 'errore')
        return
      }
      onClose(true)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-10 w-full max-w-xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold">Nuovo partner</h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-3 p-6 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field
              label="Slug URL *"
              value={form.slug}
              onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              hint="usato in /partner/[slug]/dashboard"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-gray-700">Tipo</span>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as never })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Commission % default"
              type="number"
              value={String(form.commissionPctDefault)}
              onChange={(v) => setForm({ ...form, commissionPctDefault: Number(v) })}
            />
          </div>
          <Field label="Email contatto *" type="email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Persona" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
            <Field label="Azienda" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
          </div>
          <label>
            <span className="text-gray-700">Note (interne)</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">{error}</div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3">
          <button
            onClick={() => onClose(false)}
            disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={pending || !form.name || !form.slug || !form.contactEmail}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Creazione…' : 'Crea partner'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
      />
      {hint && <span className="mt-1 block text-[10px] text-gray-500">{hint}</span>}
    </label>
  )
}
