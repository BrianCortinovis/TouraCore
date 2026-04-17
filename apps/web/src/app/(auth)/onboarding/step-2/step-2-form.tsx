'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@touracore/ui'
import { COUNTRY_DEFINITIONS } from '@touracore/legal'
import type { CountryCode, LegalType } from '@touracore/legal'
import { createTenantWithLegalAction, type Step2Input } from '../actions'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const COUNTRIES = Object.values(COUNTRY_DEFINITIONS)

export default function Step2Form() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [country, setCountry] = useState<CountryCode>('IT')
  const [legalType, setLegalType] = useState<LegalType>('private')

  // Campi comuni
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)

  // Campi IT privato
  const [fiscalCode, setFiscalCode] = useState('')

  // Campi IT business
  const [legalName, setLegalName] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [sdiCode, setSdiCode] = useState('')
  const [pec, setPec] = useState('')

  // Indirizzo sede legale
  const [addressLine1, setAddressLine1] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    if (!slugManual) {
      setSlug(slugify(value))
    }
  }, [slugManual])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Il nome della tua attività è obbligatorio.')
      return
    }

    setIsLoading(true)
    setError('')

    const input: Step2Input = {
      name: name.trim(),
      slug: slug || slugify(name),
      country,
      legal_type: legalType,
      legal_name: legalType === 'business' ? legalName : null,
      legal_details: {},
      billing_address_line1: addressLine1 || null,
      billing_city: billingCity || null,
      billing_state: billingState || null,
      billing_postal_code: billingPostalCode || null,
    }

    if (country === 'IT') {
      if (legalType === 'private') {
        input.legal_details = { fiscal_code: fiscalCode }
      } else {
        input.legal_details = {
          vat_number: vatNumber,
          fiscal_code: fiscalCode,
          sdi_code: sdiCode,
          pec,
        }
      }
    }

    const result = await createTenantWithLegalAction(input)
    if (result.success) {
      router.push('/onboarding/step-modules')
    } else {
      setError(result.error ?? 'Errore durante la configurazione.')
      setIsLoading(false)
    }
  }

  const isItaly = country === 'IT'

  return (
    <div className="flex min-h-screen">
      {/* Pannello branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white">TouraCore</h1>
          <p className="mt-3 text-lg text-blue-100">Chi sei?</p>
          <div className="mt-8 space-y-3 text-left text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
              Configurazione iniziale
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Dati della tua attività
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400/50" />
              La tua prima struttura
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex w-full items-start justify-center overflow-y-auto p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">T</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-medium uppercase text-gray-400">Passo 2 di 3</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Configura la tua attività</h2>
            <p className="mt-2 text-sm text-gray-500">
              Potrai modificare tutto in seguito dalle impostazioni.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Paese */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">In quale paese operi?</label>
              <div className="grid grid-cols-5 gap-2">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
                      country === c.code
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo account */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Tipo di account</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLegalType('private')}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    legalType === 'private'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900">Privato</span>
                  <p className="mt-1 text-xs text-gray-500">Gestisci come persona fisica</p>
                </button>
                <button
                  type="button"
                  onClick={() => setLegalType('business')}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    legalType === 'business'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900">Azienda</span>
                  <p className="mt-1 text-xs text-gray-500">Società, ditta individuale, ecc.</p>
                </button>
              </div>
            </div>

            {/* Nome attività */}
            <Input
              label="Nome della tua attività"
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Es. Casa Vacanze Belvedere"
              required
            />

            <Input
              label="Indirizzo pagina pubblica"
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setSlugManual(true)
              }}
              placeholder="casa-belvedere"
            />

            {/* Campi condizionali Italia */}
            {isItaly && legalType === 'private' && (
              <Input
                label="Codice Fiscale"
                id="fiscal_code"
                value={fiscalCode}
                onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
                placeholder="RSSMRA85M01H501Z"
                maxLength={16}
              />
            )}

            {isItaly && legalType === 'business' && (
              <>
                <Input
                  label="Ragione sociale"
                  id="legal_name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Hotel Belvedere S.r.l."
                />
                <Input
                  label="Partita IVA"
                  id="vat_number"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="12345678901"
                  maxLength={11}
                />
                <Input
                  label="Codice Fiscale azienda"
                  id="fiscal_code_biz"
                  value={fiscalCode}
                  onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
                  placeholder="12345678901 o RSSMRA85M01H501Z"
                  maxLength={16}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Codice SDI"
                    id="sdi_code"
                    value={sdiCode}
                    onChange={(e) => setSdiCode(e.target.value.toUpperCase())}
                    placeholder="0000000"
                    maxLength={7}
                  />
                  <Input
                    label="PEC"
                    id="pec"
                    value={pec}
                    onChange={(e) => setPec(e.target.value)}
                    placeholder="azienda@pec.it"
                  />
                </div>
              </>
            )}

            {!isItaly && (
              <>
                <Input
                  label="Nome legale"
                  id="legal_name_intl"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Nome dell'attività"
                />
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  La fiscalità per {COUNTRY_DEFINITIONS[country].name} sarà pienamente supportata a breve. Per ora inserisci solo il nome legale.
                </div>
              </>
            )}

            {/* Indirizzo */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Indirizzo</h3>
              <Input
                label="Via e numero"
                id="address_line1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Via Roma, 1"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Città"
                  id="billing_city"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="Milano"
                />
                <Input
                  label="Provincia"
                  id="billing_state"
                  value={billingState}
                  onChange={(e) => setBillingState(e.target.value)}
                  placeholder="MI"
                  maxLength={2}
                />
              </div>
              <Input
                label="CAP"
                id="billing_postal_code"
                value={billingPostalCode}
                onChange={(e) => setBillingPostalCode(e.target.value)}
                placeholder="20100"
                maxLength={10}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Continua
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
