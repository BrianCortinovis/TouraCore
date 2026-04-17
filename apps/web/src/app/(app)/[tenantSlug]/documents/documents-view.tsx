'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, Download, Send, CheckCircle, FileText, Receipt, Building, UtensilsCrossed } from 'lucide-react'
import { createDocument, downloadDocumentXml, markDocumentSubmitted, markDocumentPaid } from './actions'

interface Document {
  id: string; documentType: string; vertical: string
  documentNumber: string; documentDate: string
  customerName: string | null; customerVatNumber: string | null
  amountTotal: number; paymentStatus: string; paidAmount: number
  sdiStatus: string | null; sdiSubmittedAt: string | null
  rtStatus: string | null; lotteryCode: string | null
  entityId: string; entityName: string | null; entityKind: string | null
  createdAt: string
}

interface Entity { id: string; name: string; slug: string; kind: string }

interface Stats {
  total: number; revenue: number; unpaid: number; sdiDraft: number
  byVertical: Array<[string, number]>
}

interface Props {
  tenantSlug: string
  currentFilters: { type: string | null; vertical: string | null; status: string | null }
  stats: Stats
  entities: Entity[]
  documents: Document[]
}

const TYPE_LABELS: Record<string, string> = {
  hospitality_invoice: 'Fattura ricettiva',
  b2b_invoice: 'Fattura B2B',
  fiscal_receipt: 'Scontrino RT',
  ade_corrispettivi: 'Corrispettivi ADE',
  credit_note: 'Nota credito',
  quote: 'Preventivo',
  receipt: 'Ricevuta',
}

const TYPE_COLORS: Record<string, string> = {
  hospitality_invoice: 'bg-blue-100 text-blue-800',
  b2b_invoice: 'bg-purple-100 text-purple-800',
  fiscal_receipt: 'bg-green-100 text-green-800',
  ade_corrispettivi: 'bg-amber-100 text-amber-800',
  credit_note: 'bg-red-100 text-red-800',
  quote: 'bg-gray-100 text-gray-700',
  receipt: 'bg-teal-100 text-teal-800',
}

const VERTICAL_ICONS: Record<string, typeof Building> = {
  hospitality: Building,
  restaurant: UtensilsCrossed,
}

export function DocumentsView(props: Props) {
  const { tenantSlug, currentFilters, stats, entities, documents } = props
  const [showCreate, setShowCreate] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleDownload(docId: string) {
    startTransition(async () => {
      try {
        const { filename, xml } = await downloadDocumentXml(docId)
        const blob = new Blob([xml], { type: 'application/xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Errore download')
      }
    })
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Documenti totali</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Fatturato</p>
          <p className="text-2xl font-bold text-green-600">€ {stats.revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Non incassato</p>
          <p className="text-2xl font-bold text-amber-600">€ {stats.unpaid.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">SDI draft</p>
          <p className="text-2xl font-bold">{stats.sdiDraft}</p>
        </div>
      </div>

      {/* By vertical */}
      {stats.byVertical.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase text-gray-500">Per vertical</p>
          <div className="flex flex-wrap gap-3">
            {stats.byVertical.map(([v, amount]) => {
              const Icon = VERTICAL_ICONS[v] ?? Building
              return (
                <div key={v} className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1.5">
                  <Icon className="h-4 w-4 text-blue-600"/>
                  <span className="text-xs">{v}</span>
                  <span className="font-bold">€ {amount.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <select value={currentFilters.type ?? ''} onChange={(e) => setFilter('type', e.target.value || null)}
          className="rounded border border-gray-300 px-2 py-1 text-xs">
          <option value="">Tutti i tipi</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={currentFilters.vertical ?? ''} onChange={(e) => setFilter('vertical', e.target.value || null)}
          className="rounded border border-gray-300 px-2 py-1 text-xs">
          <option value="">Tutti vertical</option>
          <option value="hospitality">Ricettivo</option>
          <option value="restaurant">Ristorazione</option>
          <option value="wellness">Wellness</option>
          <option value="experiences">Attività</option>
        </select>
        <select value={currentFilters.status ?? ''} onChange={(e) => setFilter('status', e.target.value || null)}
          className="rounded border border-gray-300 px-2 py-1 text-xs">
          <option value="">Tutti SDI</option>
          <option value="draft">Draft</option>
          <option value="submitted">Inviata</option>
          <option value="accepted">Accettata</option>
          <option value="rejected">Rifiutata</option>
        </select>
        <div className="flex-1"/>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
          <Plus className="h-4 w-4"/> Nuovo documento
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">N°</th>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Entity</th>
              <th className="px-4 py-2 text-left">Cliente</th>
              <th className="px-4 py-2 text-right">Totale</th>
              <th className="px-4 py-2 text-left">Pagamento</th>
              <th className="px-4 py-2 text-left">SDI/RT</th>
              <th className="px-4 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessun documento</td></tr>
            ) : documents.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{d.documentNumber}</td>
                <td className="px-4 py-2 text-xs">{d.documentDate}</td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[d.documentType] ?? 'bg-gray-100'}`}>
                    {TYPE_LABELS[d.documentType] ?? d.documentType}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{d.entityName ?? '—'}</td>
                <td className="px-4 py-2">
                  <p className="truncate">{d.customerName ?? '—'}</p>
                  {d.customerVatNumber && <p className="text-[10px] text-gray-500">P.IVA {d.customerVatNumber}</p>}
                </td>
                <td className="px-4 py-2 text-right font-medium">€ {d.amountTotal.toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded border px-2 py-0.5 text-[10px] ${
                    d.paymentStatus === 'paid' ? 'border-green-300 bg-green-50 text-green-800' :
                    d.paymentStatus === 'partial' ? 'border-amber-300 bg-amber-50 text-amber-800' :
                    'border-gray-300 bg-gray-50 text-gray-700'
                  }`}>
                    {d.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {d.sdiStatus && (
                    <span className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700">
                      SDI: {d.sdiStatus}
                    </span>
                  )}
                  {d.rtStatus && (
                    <span className="rounded border border-green-300 bg-green-50 px-1.5 py-0.5 text-[9px] text-green-700">
                      RT: {d.rtStatus}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {d.sdiStatus && (
                      <>
                        <button onClick={() => handleDownload(d.id)} disabled={pending}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:border-blue-400">
                          <Download className="h-3 w-3"/>
                        </button>
                        {d.sdiStatus === 'draft' && (
                          <button onClick={() => {
                            if (confirm('Marca inviata SDI?')) startTransition(async () => { await markDocumentSubmitted(d.id, tenantSlug) })
                          }} disabled={pending}
                            className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            <Send className="h-3 w-3"/>
                          </button>
                        )}
                      </>
                    )}
                    {d.paymentStatus !== 'paid' && (
                      <button onClick={() => {
                        if (confirm(`Marca pagato € ${d.amountTotal.toFixed(2)}?`)) {
                          startTransition(async () => { await markDocumentPaid(d.id, tenantSlug) })
                        }
                      }} disabled={pending}
                        className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        <CheckCircle className="h-3 w-3"/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateDialog tenantSlug={tenantSlug} entities={entities} onClose={() => setShowCreate(false)}/>}
    </>
  )
}

function CreateDialog(props: { tenantSlug: string; entities: Entity[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    entityId: props.entities[0]?.id ?? '',
    documentType: 'hospitality_invoice' as 'hospitality_invoice' | 'b2b_invoice',
    documentNumber: '',
    documentDate: new Date().toISOString().slice(0, 10),
    customerName: '',
    customerVatNumber: '',
    customerSdiCode: '',
    amountSubtotal: 0,
    vatPct: 10,
    description: '',
    generateSdiXml: true,
  })

  const selectedEntity = props.entities.find((e) => e.id === form.entityId)
  const vertical = selectedEntity?.kind === 'restaurant' ? 'restaurant' : 'hospitality'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createDocument({
          tenantSlug: props.tenantSlug,
          entityId: form.entityId,
          vertical,
          documentType: form.documentType,
          documentNumber: form.documentNumber,
          documentDate: form.documentDate,
          customerName: form.customerName,
          customerVatNumber: form.customerVatNumber || undefined,
          customerSdiCode: form.customerSdiCode || undefined,
          customerCountry: 'IT',
          amountSubtotal: form.amountSubtotal,
          vatPct: form.vatPct,
          description: form.description || undefined,
          generateSdiXml: form.generateSdiXml,
          metadata: {} as Record<string, unknown>,
        })
        props.onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  const vatAmount = +(form.amountSubtotal * (form.vatPct / 100)).toFixed(2)
  const total = +(form.amountSubtotal + vatAmount).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3 rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">Nuovo documento</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <select required value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5">
            {props.entities.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.kind})</option>)}
          </select>
          <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value as 'b2b_invoice' })}
            className="rounded border border-gray-300 px-2 py-1.5">
            <option value="hospitality_invoice" disabled={vertical !== 'hospitality'}>Fattura ricettiva</option>
            <option value="b2b_invoice">Fattura B2B</option>
          </select>
          <input required placeholder="N° (2026-001)" value={form.documentNumber}
            onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"/>
          <input required type="date" value={form.documentDate}
            onChange={(e) => setForm({ ...form, documentDate: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"/>
          <input required placeholder="Cliente / Ragione sociale" value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5"/>
          <input placeholder="P.IVA" value={form.customerVatNumber}
            onChange={(e) => setForm({ ...form, customerVatNumber: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"/>
          <input placeholder="Cod SDI 7 char" maxLength={7} value={form.customerSdiCode}
            onChange={(e) => setForm({ ...form, customerSdiCode: e.target.value.toUpperCase() })}
            className="rounded border border-gray-300 px-2 py-1.5"/>
          <input required type="number" step="0.01" placeholder="Imponibile €" value={form.amountSubtotal || ''}
            onChange={(e) => setForm({ ...form, amountSubtotal: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5"/>
          <select value={form.vatPct} onChange={(e) => setForm({ ...form, vatPct: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1.5">
            <option value={4}>IVA 4%</option>
            <option value={10}>IVA 10%</option>
            <option value={22}>IVA 22%</option>
          </select>
          <input placeholder="Descrizione" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5"/>
          <label className="col-span-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.generateSdiXml}
              onChange={(e) => setForm({ ...form, generateSdiXml: e.target.checked })}/>
            Genera XML SDI FatturaPA 1.2.1
          </label>
        </div>

        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex justify-between"><span>Imponibile</span><span>€ {form.amountSubtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-600"><span>IVA {form.vatPct}%</span><span>€ {vatAmount.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-gray-300 pt-2 font-bold"><span>Totale</span><span>€ {total.toFixed(2)}</span></div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Crea documento'}</button>
        </div>
      </form>
    </div>
  )
}
