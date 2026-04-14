'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@touracore/ui'
import { getBusinessDetailsAction, updateBusinessDetailsAction } from './actions'
import { AlertTriangle } from 'lucide-react'

interface BusinessDetails {
  legal_name: string
  vat_number: string
  fiscal_code: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_postal_code: string
  billing_country: string
  legal_details: Record<string, string>
}

const EMPTY_DETAILS: BusinessDetails = {
  legal_name: '',
  vat_number: '',
  fiscal_code: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_state: '',
  billing_postal_code: '',
  billing_country: 'IT',
  legal_details: {},
}

export default function AccountBusinessPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [details, setDetails] = useState<BusinessDetails>(EMPTY_DETAILS)
  const [tenantCountry, setTenantCountry] = useState('IT')
  const [tenantLegalType, setTenantLegalType] = useState('private')

  useEffect(() => {
    async function load() {
      const result = await getBusinessDetailsAction()
      if (result.success && result.data) {
        const d = result.data as Record<string, unknown>
        setDetails({
          legal_name: (d.legal_name as string) ?? '',
          vat_number: (d.vat_number as string) ?? '',
          fiscal_code: (d.fiscal_code as string) ?? '',
          billing_address_line1: (d.billing_address_line1 as string) ?? '',
          billing_address_line2: (d.billing_address_line2 as string) ?? '',
          billing_city: (d.billing_city as string) ?? '',
          billing_state: (d.billing_state as string) ?? '',
          billing_postal_code: (d.billing_postal_code as string) ?? '',
          billing_country: (d.billing_country as string) ?? 'IT',
          legal_details: (d.legal_details as Record<string, string>) ?? {},
        })
        setTenantCountry((d.country as string) ?? 'IT')
        setTenantLegalType((d.legal_type as string) ?? 'private')
      }
      setIsFetching(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const result = await updateBusinessDetailsAction({
      legal_name: details.legal_name,
      vat_number: details.vat_number,
      fiscal_code: details.fiscal_code,
      billing_address_line1: details.billing_address_line1,
      billing_address_line2: details.billing_address_line2,
      billing_city: details.billing_city,
      billing_state: details.billing_state,
      billing_postal_code: details.billing_postal_code,
      billing_country: details.billing_country,
      legal_details: details.legal_details,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Dati salvati con successo.' })
      router.refresh()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
    }
    setIsLoading(false)
  }

  function updateField(field: keyof BusinessDetails, value: string) {
    setDetails((prev) => ({ ...prev, [field]: value }))
  }

  function updateLegalDetail(key: string, value: string) {
    setDetails((prev) => ({
      ...prev,
      legal_details: { ...prev.legal_details, [key]: value },
    }))
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const countryLabels: Record<string, string> = {
    IT: 'Italia',
    CH: 'Svizzera',
    FR: 'Francia',
    AT: 'Austria',
    DE: 'Germania',
  }
  const legalTypeLabels: Record<string, string> = {
    private: 'Privato',
    business: 'Azienda',
  }

  const isItaly = tenantCountry === 'IT'
  const isBusiness = tenantLegalType === 'business'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dati della tua attività</h1>
        <p className="mt-1 text-sm text-gray-500">Informazioni legali e fiscali</p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p><strong>Paese:</strong> {countryLabels[tenantCountry] ?? tenantCountry} · <strong>Tipo:</strong> {legalTypeLabels[tenantLegalType] ?? tenantLegalType}</p>
            <p className="mt-1 text-xs text-blue-600">Per cambiare il paese o il tipo di account, contatta il supporto.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dati comuni */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isBusiness ? 'Ragione sociale' : 'Dati personali'}
          </h2>

          {isBusiness && (
            <Input
              label="Ragione sociale"
              id="legal_name"
              value={details.legal_name}
              onChange={(e) => updateField('legal_name', e.target.value)}
              placeholder="Es. Hotel Belvedere S.r.l."
            />
          )}

          {isItaly && isBusiness && (
            <>
              <Input
                label="Partita IVA"
                id="vat_number"
                value={details.vat_number}
                onChange={(e) => updateField('vat_number', e.target.value)}
                placeholder="12345678901"
                maxLength={11}
              />
              <Input
                label="Codice Fiscale"
                id="fiscal_code"
                value={details.fiscal_code}
                onChange={(e) => updateField('fiscal_code', e.target.value)}
                placeholder="RSSMRA85M01H501Z o 12345678901"
                maxLength={16}
              />
              <Input
                label="Codice SDI (fatturazione elettronica)"
                id="sdi_code"
                value={details.legal_details.sdi_code ?? ''}
                onChange={(e) => updateLegalDetail('sdi_code', e.target.value)}
                placeholder="0000000"
                maxLength={7}
              />
              <Input
                label="PEC"
                id="pec"
                value={details.legal_details.pec ?? ''}
                onChange={(e) => updateLegalDetail('pec', e.target.value)}
                placeholder="azienda@pec.it"
                type="email"
              />
              <Input
                label="Numero REA"
                id="rea_number"
                value={details.legal_details.rea_number ?? ''}
                onChange={(e) => updateLegalDetail('rea_number', e.target.value)}
                placeholder="MI-1234567"
              />
            </>
          )}

          {isItaly && !isBusiness && (
            <Input
              label="Codice Fiscale"
              id="fiscal_code"
              value={details.fiscal_code}
              onChange={(e) => updateField('fiscal_code', e.target.value)}
              placeholder="RSSMRA85M01H501Z"
              maxLength={16}
            />
          )}

          {!isItaly && (
            <>
              <Input
                label="Nome legale"
                id="legal_name"
                value={details.legal_name}
                onChange={(e) => updateField('legal_name', e.target.value)}
                placeholder="Nome dell'attività"
              />
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                La configurazione fiscale completa per {countryLabels[tenantCountry] ?? tenantCountry} sarà disponibile a breve.
              </div>
            </>
          )}
        </div>

        {/* Indirizzo sede legale */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Sede legale</h2>
          <Input
            label="Indirizzo"
            id="billing_address_line1"
            value={details.billing_address_line1}
            onChange={(e) => updateField('billing_address_line1', e.target.value)}
            placeholder="Via Roma, 1"
          />
          <Input
            label="Interno / Scala (opzionale)"
            id="billing_address_line2"
            value={details.billing_address_line2}
            onChange={(e) => updateField('billing_address_line2', e.target.value)}
            placeholder="Int. 3, Scala B"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Città"
              id="billing_city"
              value={details.billing_city}
              onChange={(e) => updateField('billing_city', e.target.value)}
              placeholder="Milano"
            />
            <Input
              label="Provincia"
              id="billing_state"
              value={details.billing_state}
              onChange={(e) => updateField('billing_state', e.target.value)}
              placeholder="MI"
              maxLength={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CAP"
              id="billing_postal_code"
              value={details.billing_postal_code}
              onChange={(e) => updateField('billing_postal_code', e.target.value)}
              placeholder="20100"
              maxLength={5}
            />
            <Input
              label="Nazione"
              id="billing_country"
              value={details.billing_country}
              onChange={(e) => updateField('billing_country', e.target.value)}
              placeholder="IT"
              disabled
            />
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" isLoading={isLoading}>
            Salva dati attività
          </Button>
        </div>
      </form>
    </div>
  )
}
