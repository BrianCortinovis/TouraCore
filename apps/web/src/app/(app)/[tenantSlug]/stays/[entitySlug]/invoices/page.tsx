'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Badge, Card, CardContent, Input } from '@touracore/ui'
import {
  FileText, Plus, RefreshCw, CheckCircle, AlertCircle,
  CreditCard, X,
} from 'lucide-react'
import {
  loadInvoicesAction,
  createInvoiceAction,
  markInvoicePaidAction,
} from './actions'

interface InvoiceRow {
  id: string
  invoice_number: string
  invoice_date: string
  invoice_type: string
  customer_name: string
  subtotal: number
  total_vat: number
  total: number
  payment_status: string
  payment_method: string | null
  sdi_status: string
  due_date: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Da pagare', variant: 'warning' },
  paid: { label: 'Pagata', variant: 'default' },
  partial: { label: 'Parziale', variant: 'secondary' },
  overdue: { label: 'Scaduta', variant: 'destructive' },
  refunded: { label: 'Rimborsata', variant: 'secondary' },
}

const TYPE_MAP: Record<string, string> = {
  invoice: 'Fattura',
  credit_note: 'Nota credito',
  receipt: 'Ricevuta',
  proforma: 'Proforma',
  corrispettivo: 'Corrispettivo',
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Contanti' },
  { value: 'credit_card', label: 'Carta' },
  { value: 'bank_transfer', label: 'Bonifico' },
  { value: 'pos', label: 'POS' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [totals, setTotals] = useState({ total: 0, paid: 0, unpaid: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [formType, setFormType] = useState('invoice')
  const [formCustomer, setFormCustomer] = useState('')
  const [formVat, setFormVat] = useState('')
  const [formFiscal, setFormFiscal] = useState('')
  const [formSdi] = useState('0000000')
  const [formItems, setFormItems] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: 22 },
  ])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await loadInvoicesAction()
    if (result.success && result.data) {
      setInvoices(result.data.invoices as InvoiceRow[])
      setTotals(result.data.totals as { total: number; paid: number; unpaid: number })
    }
    setLoading(false)
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const addItem = () => {
    setFormItems([...formItems, { description: '', quantity: 1, unit_price: 0, vat_rate: 22 }])
  }

  const removeItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setFormItems(formItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  const formTotal = formItems.reduce((s, item) => {
    const net = item.unit_price * item.quantity
    const vat = net * (item.vat_rate / 100)
    return s + net + vat
  }, 0)

  const handleCreate = async () => {
    if (!formCustomer.trim()) { setError('Nome cliente obbligatorio'); return }
    if (formItems.length === 0) { setError('Almeno una riga'); return }
    setCreating(true)
    setError('')
    setSuccess('')

    const result = await createInvoiceAction({
      invoice_type: formType,
      customer_name: formCustomer,
      customer_vat: formVat || undefined,
      customer_fiscal_code: formFiscal || undefined,
      customer_sdi_code: formSdi || undefined,
      items: formItems.filter(i => i.description.trim()),
    })

    if (result.success) {
      setSuccess('Fattura creata')
      setShowCreate(false)
      setFormCustomer('')
      setFormVat('')
      setFormFiscal('')
      setFormItems([{ description: '', quantity: 1, unit_price: 0, vat_rate: 22 }])
      void loadData()
    } else {
      setError(result.error ?? 'Errore')
    }
    setCreating(false)
  }

  const handleMarkPaid = async (id: string, method: string) => {
    const result = await markInvoicePaidAction(id, method)
    if (result.success) {
      void loadData()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Fatturazione
          </h1>
          <p className="text-sm text-gray-500 mt-1">Fatture, ricevute e corrispettivi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova fattura
          </Button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-4 w-4" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{fmt(totals.total)}</p>
            <p className="text-xs text-gray-500 mt-1">Totale fatturato</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-700">{fmt(totals.paid)}</p>
            <p className="text-xs text-gray-500 mt-1">Incassato</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{fmt(totals.unpaid)}</p>
            <p className="text-xs text-gray-500 mt-1">Da incassare</p>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuova fattura</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={formType} onChange={e => setFormType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <Input value={formCustomer} onChange={e => setFormCustomer(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">P.IVA</label>
                <Input value={formVat} onChange={e => setFormVat(e.target.value)} placeholder="Opzionale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cod. Fiscale</label>
                <Input value={formFiscal} onChange={e => setFormFiscal(e.target.value)} placeholder="Opzionale" />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Righe</p>
              {formItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Descrizione"
                    value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                  />
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unit_price}
                    onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                  />
                  <select
                    className="w-20 rounded-md border border-gray-300 px-2 py-2 text-sm"
                    value={item.vat_rate}
                    onChange={e => updateItem(i, 'vat_rate', Number(e.target.value))}
                  >
                    <option value={22}>22%</option>
                    <option value={10}>10%</option>
                    <option value={4}>4%</option>
                    <option value={0}>0%</option>
                  </select>
                  {formItems.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" />Aggiungi riga
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-lg font-bold">Totale: {fmt(formTotal)}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creazione...' : 'Crea fattura'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            Nessuna fattura
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {invoices.map((inv) => {
            const status = STATUS_MAP[inv.payment_status] ?? { label: inv.payment_status, variant: 'secondary' }
            return (
              <div key={inv.id} className="p-3 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{inv.invoice_number}</span>
                    <Badge variant={status.variant as 'warning' | 'default' | 'destructive' | 'secondary'}>
                      {status.label}
                    </Badge>
                    <span className="text-xs text-gray-500">{TYPE_MAP[inv.invoice_type] ?? inv.invoice_type}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {inv.customer_name} — {inv.invoice_date} — {fmt(Number(inv.total))}
                  </p>
                </div>
                {inv.payment_status === 'pending' && (
                  <div className="flex items-center gap-1 ml-2">
                    {PAYMENT_METHODS.map((pm) => (
                      <Button
                        key={pm.value}
                        variant="outline"
                        size="sm"
                        className="text-xs px-2"
                        onClick={() => handleMarkPaid(inv.id, pm.value)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        {pm.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
