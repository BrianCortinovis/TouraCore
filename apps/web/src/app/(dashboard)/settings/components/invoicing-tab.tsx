'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@touracore/ui'
import { saveTenantSettingsBatchAction } from '../actions'

interface InvoicingTabProps {
  settings: Record<string, unknown>
}

const VAT_OPTIONS = [
  { value: '22', label: '22% (ordinaria)' },
  { value: '10', label: '10% (ridotta alloggi)' },
  { value: '4', label: '4% (super ridotta)' },
  { value: '0', label: 'Esente IVA' },
]

export function InvoicingTab({ settings }: InvoicingTabProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [invoiceEmail, setInvoiceEmail] = useState((settings['invoice.email'] as string) ?? '')
  const [numberingPrefix, setNumberingPrefix] = useState((settings['invoice.numbering_prefix'] as string) ?? 'FT')
  const [numberingStart, setNumberingStart] = useState((settings['invoice.numbering_start'] as string) ?? '1')
  const [defaultVat, setDefaultVat] = useState((settings['invoice.default_vat_rate'] as string) ?? '10')
  const [touristTax, setTouristTax] = useState((settings['invoice.tourist_tax'] as string) ?? '')
  const [notes, setNotes] = useState((settings['invoice.notes'] as string) ?? '')

  const paymentMethodsRaw = settings['invoice.payment_methods']
  const initialMethods = Array.isArray(paymentMethodsRaw) ? (paymentMethodsRaw as string[]) : []
  const [paymentMethods, setPaymentMethods] = useState<string[]>(initialMethods)

  const PAYMENT_OPTIONS = [
    { key: 'bonifico', label: 'Bonifico bancario' },
    { key: 'carta', label: 'Carta di credito/debito' },
    { key: 'paypal', label: 'PayPal' },
    { key: 'contanti', label: 'Contanti' },
    { key: 'satispay', label: 'Satispay' },
    { key: 'pos', label: 'POS' },
  ]

  function togglePaymentMethod(key: string) {
    setPaymentMethods((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await saveTenantSettingsBatchAction({
        'invoice.email': invoiceEmail,
        'invoice.numbering_prefix': numberingPrefix,
        'invoice.numbering_start': numberingStart,
        'invoice.default_vat_rate': defaultVat,
        'invoice.tourist_tax': touristTax,
        'invoice.payment_methods': paymentMethods,
        'invoice.notes': notes,
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Impostazioni fatturazione salvate.' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Fatturazione elettronica</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="invoice-email"
            label="Email per ricevere copie fatture"
            type="email"
            value={invoiceEmail}
            onChange={(e) => setInvoiceEmail(e.target.value)}
            placeholder="fatture@hotelbellavista.it"
          />
          <Input
            id="numbering-prefix"
            label="Prefisso numerazione fatture"
            value={numberingPrefix}
            onChange={(e) => setNumberingPrefix(e.target.value)}
            placeholder="FT"
          />
          <Input
            id="numbering-start"
            label="Numero iniziale fatture"
            type="number"
            value={numberingStart}
            onChange={(e) => setNumberingStart(e.target.value)}
            placeholder="1"
          />
          <Select
            id="default-vat"
            label="Aliquota IVA predefinita"
            value={defaultVat}
            onChange={(e) => setDefaultVat(e.target.value)}
            options={VAT_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Tasse e imposte</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="tourist-tax"
            label="Tassa di soggiorno predefinita (€ per persona/notte)"
            type="number"
            step="0.01"
            value={touristTax}
            onChange={(e) => setTouristTax(e.target.value)}
            placeholder="2.00"
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Metodi di pagamento accettati</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PAYMENT_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentMethods.includes(opt.key)}
                onChange={() => togglePaymentMethod(opt.key)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Note in fattura</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Note da mostrare in calce alle fatture..."
        />
      </section>

      {message && (
        <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isPending} isLoading={isPending}>
          {isPending ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>
    </form>
  )
}
