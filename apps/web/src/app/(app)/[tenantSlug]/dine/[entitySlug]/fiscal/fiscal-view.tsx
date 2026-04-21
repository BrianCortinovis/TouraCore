'use client'

import { useState, useTransition } from 'react'
import { FileText, ShieldCheck, Plus, RefreshCw } from 'lucide-react'
import { triggerADESubmission, createB2BInvoice, savRetentionPolicy, voidRTReceiptAction } from './actions'

interface Receipt {
  id: string
  receiptNumber: string | null
  fiscalDate: string
  amountTotal: number
  vatTotal: number
  lotteryCode: string | null
  adeStatus: string
  rtStatus: string
}

interface ADESubmission {
  id: string
  submissionDate: string
  receiptsCount: number
  totalAmount: number
  totalVat: number
  status: string
  attempts: number
  submittedAt: string | null
  acceptedAt: string | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  amountTotal: number
  sdiStatus: string
}

interface Retention {
  id: string
  category: string
  retentionDays: number
  legalBasis: string
  active: boolean
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  receipts: Receipt[]
  adeSubmissions: ADESubmission[]
  invoices: Invoice[]
  retentionPolicies: Retention[]
}

const RETENTION_DEFAULTS = [
  { category: 'fiscal', days: 3650, basis: 'Art. 22 DPR 600/1973 (10 anni)' },
  { category: 'reservation', days: 1825, basis: 'Esigenze gestionali (5 anni)' },
  { category: 'guest_pii', days: 730, basis: 'GDPR + interesse legittimo (2 anni)' },
  { category: 'marketing', days: 730, basis: 'GDPR consenso (2 anni rinnovabile)' },
  { category: 'employment', days: 3650, basis: 'CCNL + DPR 600 (10 anni)' },
  { category: 'haccp', days: 1095, basis: 'Reg. CE 852/2004 (3 anni)' },
]

export function FiscalView(props: Props) {
  const { tenantSlug, entitySlug, restaurantId, receipts, adeSubmissions, invoices, retentionPolicies } = props
  const [showInvoice, setShowInvoice] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmitADE() {
    startTransition(async () => {
      await triggerADESubmission({ restaurantId, tenantSlug, entitySlug })
    })
  }

  function handleSeedDefaults() {
    startTransition(async () => {
      for (const def of RETENTION_DEFAULTS) {
        await savRetentionPolicy({
          restaurantId,
          tenantSlug,
          entitySlug,
          category: def.category as 'fiscal' | 'reservation' | 'guest_pii' | 'marketing' | 'employment' | 'haccp',
          retentionDays: def.days,
          legalBasis: def.basis,
        })
      }
    })
  }

  return (
    <>
      {/* ADE submissions */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-blue-600" />
            Invio corrispettivi ADE
          </h2>
          <button
            onClick={handleSubmitADE}
            disabled={pending}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" /> Invia oggi
          </button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Data</th>
              <th className="px-3 py-1.5 text-right">Scontrini</th>
              <th className="px-3 py-1.5 text-right">Totale €</th>
              <th className="px-3 py-1.5 text-right">IVA €</th>
              <th className="px-3 py-1.5 text-left">Stato</th>
              <th className="px-3 py-1.5 text-right">Tentativi</th>
            </tr>
          </thead>
          <tbody>
            {adeSubmissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-400">
                  Nessuna submission
                </td>
              </tr>
            ) : (
              adeSubmissions.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">{s.submissionDate}</td>
                  <td className="px-3 py-1.5 text-right">{s.receiptsCount}</td>
                  <td className="px-3 py-1.5 text-right">€ {s.totalAmount.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right">€ {s.totalVat.toFixed(2)}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        s.status === 'accepted'
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : s.status === 'rejected'
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">{s.attempts}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Receipts */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Scontrini fiscali (60gg)</h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Data</th>
                <th className="px-3 py-1.5 text-left">N°</th>
                <th className="px-3 py-1.5 text-right">€</th>
                <th className="px-3 py-1.5 text-left">Lotteria</th>
                <th className="px-3 py-1.5 text-left">RT</th>
                <th className="px-3 py-1.5 text-left">Stato ADE</th>
                <th className="px-3 py-1.5 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                    Nessuno scontrino
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{r.fiscalDate}</td>
                    <td className="px-3 py-1.5">{r.receiptNumber ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right">€ {r.amountTotal.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-[10px] text-gray-500">{r.lotteryCode ?? '—'}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] ${r.rtStatus === 'voided' ? 'bg-red-50 text-red-700 border border-red-200' : r.rtStatus === 'printed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'border border-gray-300 bg-gray-50'}`}>
                        {r.rtStatus}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[9px]">
                        {r.adeStatus}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {r.rtStatus === 'printed' && (
                        <button
                          onClick={() => {
                            if (!confirm(`Annullare scontrino ${r.receiptNumber}?`)) return
                            startTransition(async () => {
                              const res = await voidRTReceiptAction({
                                restaurantId,
                                tenantSlug,
                                entitySlug,
                                receiptId: r.id,
                              })
                              if (!res.ok) alert(`Errore: ${res.error}`)
                            })
                          }}
                          className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-100"
                          disabled={pending}
                        >
                          Annulla
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* B2B invoices */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Fatture B2B (SDI)</h2>
          <button
            onClick={() => setShowInvoice(true)}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3 w-3" /> Nuova fattura
          </button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Numero</th>
              <th className="px-3 py-1.5 text-left">Data</th>
              <th className="px-3 py-1.5 text-left">Cliente</th>
              <th className="px-3 py-1.5 text-right">Totale</th>
              <th className="px-3 py-1.5 text-left">Stato SDI</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                  Nessuna fattura
                </td>
              </tr>
            ) : (
              invoices.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 font-medium">{i.invoiceNumber}</td>
                  <td className="px-3 py-1.5">{i.invoiceDate}</td>
                  <td className="px-3 py-1.5">{i.customerName}</td>
                  <td className="px-3 py-1.5 text-right">€ {i.amountTotal.toFixed(2)}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        i.sdiStatus === 'accepted'
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : i.sdiStatus === 'rejected'
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-gray-300 bg-gray-50 text-gray-700'
                      }`}
                    >
                      {i.sdiStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* GDPR retention */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            GDPR — Retention policy
          </h2>
          {retentionPolicies.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={pending}
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Carica default IT
            </button>
          )}
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Categoria</th>
              <th className="px-3 py-1.5 text-right">Retention</th>
              <th className="px-3 py-1.5 text-left">Base legale</th>
              <th className="px-3 py-1.5 text-left">Stato</th>
            </tr>
          </thead>
          <tbody>
            {retentionPolicies.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-medium">{p.category}</td>
                <td className="px-3 py-1.5 text-right">
                  {p.retentionDays} gg ({Math.round(p.retentionDays / 365)}y)
                </td>
                <td className="px-3 py-1.5 text-gray-600">{p.legalBasis}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] ${
                      p.active ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}
                  >
                    {p.active ? 'attivo' : 'disattivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showInvoice && (
        <NewInvoiceDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  )
}

function NewInvoiceDialog({
  restaurantId,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    customerName: '',
    customerVatNumber: '',
    customerSdiCode: '',
    amountSubtotal: 0,
    vatPct: 10,
    description: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createB2BInvoice({
        restaurantId,
        tenantSlug,
        entitySlug,
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        customerName: form.customerName,
        customerVatNumber: form.customerVatNumber || undefined,
        customerSdiCode: form.customerSdiCode || undefined,
        amountSubtotal: form.amountSubtotal,
        vatPct: form.vatPct,
        description: form.description || undefined,
      })
      onClose()
    })
  }

  const vatAmount = +(form.amountSubtotal * (form.vatPct / 100)).toFixed(2)
  const total = +(form.amountSubtotal + vatAmount).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuova fattura B2B</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <input
            required
            placeholder="Numero (es. 2026-001)"
            value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            required
            type="date"
            value={form.invoiceDate}
            onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            required
            placeholder="Cliente / Ragione sociale"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            placeholder="P.IVA"
            value={form.customerVatNumber}
            onChange={(e) => setForm({ ...form, customerVatNumber: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            placeholder="Codice SDI / PEC"
            value={form.customerSdiCode}
            onChange={(e) => setForm({ ...form, customerSdiCode: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="Imponibile €"
            value={form.amountSubtotal || ''}
            onChange={(e) => setForm({ ...form, amountSubtotal: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <select
            value={form.vatPct}
            onChange={(e) => setForm({ ...form, vatPct: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5"
          >
            <option value={4}>IVA 4%</option>
            <option value={10}>IVA 10%</option>
            <option value={22}>IVA 22%</option>
          </select>
          <input
            placeholder="Descrizione (es. Banchetto evento)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5"
          />
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Imponibile</span>
            <span>€ {form.amountSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>IVA {form.vatPct}%</span>
            <span>€ {vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-300 pt-2 font-bold">
            <span>Totale</span>
            <span>€ {total.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Creo…' : 'Crea + invia SDI'}
          </button>
        </div>
      </form>
    </div>
  )
}
