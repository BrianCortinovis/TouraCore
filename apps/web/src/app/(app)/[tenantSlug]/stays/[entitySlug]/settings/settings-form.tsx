'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Badge } from '@touracore/ui'
import {
  PROPERTY_TYPE_OPTIONS,
  getPropertyTypeConfig,
  getFormVisibility,
  getEffectiveFiscalConfig,
  getEffectiveCompliance,
  getEffectiveInvoicing,
  canToggleImprenditoriale,
  isAlwaysImprenditoriale,
  AMENITY_CATEGORIES,
  getAmenityLabel,
  type PropertyType,
  type FiscalRegime,
  type SciaStatus,
} from '@touracore/hospitality-config'
import { updateEntitySettingsAction } from './actions'
import { getStructureTerms } from '../../../../../structure-terms'

type SettingsTab = 'struttura' | 'posizione' | 'fiscale' | 'compliance' | 'policy' | 'contatti'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'struttura', label: 'Struttura' },
  { key: 'posizione', label: 'Posizione' },
  { key: 'fiscale', label: 'Fiscale' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'policy', label: 'Policy' },
  { key: 'contatti', label: 'Contatti e Pagamenti' },
]

interface EntitySettingsFormProps {
  tenantSlug: string
  tenantCountry?: string
  entity: {
    id: string
    slug: string
    name: string
    kind: string
    management_mode: string
    is_active: boolean
    country_override: string | null
  }
  accommodation: {
    property_type: string | null
    is_imprenditoriale: boolean
    legal_name: string | null
    vat_number: string | null
    fiscal_code: string | null
    short_description: string | null
    description: string | null
    address: string | null
    city: string | null
    province: string | null
    region: string | null
    zip: string | null
    latitude: number | null
    longitude: number | null
    email: string | null
    phone: string | null
    pec: string | null
    website: string | null
    default_check_in_time: string | null
    default_check_out_time: string | null
    amenities: string[] | null
    star_rating: number | null
    fiscal_regime: FiscalRegime | null
    has_vat: boolean
    default_vat_rate: number
    cedolare_secca_enabled: boolean
    cedolare_secca_rate: number
    ritenuta_ota_enabled: boolean
    ritenuta_ota_rate: number
    cin_code: string | null
    cin_expiry: string | null
    scia_number: string | null
    scia_status: SciaStatus | null
    scia_expiry: string | null
    alloggiati_username: string | null
    alloggiati_password_encrypted: string | null
    istat_structure_code: string | null
    sdi_code: string
    invoice_prefix: string | null
    invoice_next_number: number
    pet_policy: { allowed: boolean; max_pets?: number; fee_per_night?: number; notes?: string } | null
    cancellation_policy: { type: string; days_before: number; penalty_percent: number } | null
    payment_methods: string[] | null
    smoking_allowed: boolean
    children_allowed: boolean
    parties_allowed: boolean
    quiet_hours_start: string | null
    quiet_hours_end: string | null
    house_rules_notes: string | null
  } | null
}

const FISCAL_REGIME_LABELS: Record<FiscalRegime, string> = {
  ordinario: 'Ordinario',
  forfettario: 'Forfettario',
  cedolare_secca: 'Cedolare Secca',
  agriturismo_special: 'Agriturismo Speciale',
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Contanti' },
  { value: 'credit_card', label: 'Carta di credito' },
  { value: 'debit_card', label: 'Carta di debito' },
  { value: 'bank_transfer', label: 'Bonifico' },
  { value: 'pos', label: 'POS' },
  { value: 'online', label: 'Online' },
]

const CANCELLATION_TYPES = [
  { value: 'flexible', label: 'Flessibile' },
  { value: 'moderate', label: 'Moderata' },
  { value: 'strict', label: 'Rigida' },
  { value: 'non_refundable', label: 'Non rimborsabile' },
]

export function EntitySettingsForm({ tenantSlug, tenantCountry, entity, accommodation }: EntitySettingsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('struttura')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Tab 1: Struttura
  const [name, setName] = useState(entity.name)
  const [slug, setSlug] = useState(entity.slug)
  const [isActive, setIsActive] = useState(entity.is_active)
  const [propertyType, setPropertyType] = useState<PropertyType>(
    (accommodation?.property_type as PropertyType) ?? 'hotel'
  )
  const [isImprenditoriale, setIsImprenditoriale] = useState(accommodation?.is_imprenditoriale ?? false)
  const [shortDesc, setShortDesc] = useState(accommodation?.short_description ?? '')
  const [description, setDescription] = useState(accommodation?.description ?? '')
  const [starRating, setStarRating] = useState(accommodation?.star_rating?.toString() ?? '')
  const [amenities, setAmenities] = useState<string[]>(accommodation?.amenities ?? [])

  // Tab 2: Posizione
  const [address, setAddress] = useState(accommodation?.address ?? '')
  const [city, setCity] = useState(accommodation?.city ?? '')
  const [province, setProvince] = useState(accommodation?.province ?? '')
  const [region, setRegion] = useState(accommodation?.region ?? '')
  const [zip, setZip] = useState(accommodation?.zip ?? '')
  const [latitude, setLatitude] = useState(accommodation?.latitude?.toString() ?? '')
  const [longitude, setLongitude] = useState(accommodation?.longitude?.toString() ?? '')

  // Tab 3: Fiscale — identità legale
  const [legalName, setLegalName] = useState(accommodation?.legal_name ?? '')
  const [vatNumber, setVatNumber] = useState(accommodation?.vat_number ?? '')
  const [fiscalCode, setFiscalCode] = useState(accommodation?.fiscal_code ?? '')
  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegime | ''>(accommodation?.fiscal_regime ?? '')
  const [hasVat, setHasVat] = useState(accommodation?.has_vat ?? true)
  const [vatRate, setVatRate] = useState(accommodation?.default_vat_rate?.toString() ?? '10.00')
  const [cedolareEnabled, setCedolareEnabled] = useState(accommodation?.cedolare_secca_enabled ?? false)
  const [cedolareRate, setCedolareRate] = useState(accommodation?.cedolare_secca_rate?.toString() ?? '21.00')
  const [ritenutaOtaEnabled, setRitenutaOtaEnabled] = useState(accommodation?.ritenuta_ota_enabled ?? false)
  const [ritenutaOtaRate, setRitenutaOtaRate] = useState(accommodation?.ritenuta_ota_rate?.toString() ?? '21.00')
  const [sdiCode, setSdiCode] = useState(accommodation?.sdi_code ?? '0000000')
  const [invoicePrefix, setInvoicePrefix] = useState(accommodation?.invoice_prefix ?? '')
  const [invoiceNextNumber, setInvoiceNextNumber] = useState(accommodation?.invoice_next_number?.toString() ?? '1')

  // Tab 4: Compliance
  const [cinCode, setCinCode] = useState(accommodation?.cin_code ?? '')
  const [cinExpiry, setCinExpiry] = useState(accommodation?.cin_expiry ?? '')
  const [sciaNumber, setSciaNumber] = useState(accommodation?.scia_number ?? '')
  const [sciaStatus, setSciaStatus] = useState<SciaStatus | ''>(accommodation?.scia_status ?? '')
  const [sciaExpiry, setSciaExpiry] = useState(accommodation?.scia_expiry ?? '')
  const [alloggiatiUsername, setAlloggiatiUsername] = useState(accommodation?.alloggiati_username ?? '')
  const [alloggiatiPassword, setAlloggiatiPassword] = useState('')
  const [hasExistingPassword] = useState(!!accommodation?.alloggiati_password_encrypted)
  const [istatCode, setIstatCode] = useState(accommodation?.istat_structure_code ?? '')

  // Tab 5: Policy
  const [checkIn, setCheckIn] = useState(accommodation?.default_check_in_time ?? '14:00')
  const [checkOut, setCheckOut] = useState(accommodation?.default_check_out_time ?? '10:00')
  const [petsAllowed, setPetsAllowed] = useState(accommodation?.pet_policy?.allowed ?? false)
  const [petMaxPets, setPetMaxPets] = useState(accommodation?.pet_policy?.max_pets?.toString() ?? '')
  const [petFeePerNight, setPetFeePerNight] = useState(accommodation?.pet_policy?.fee_per_night?.toString() ?? '')
  const [petNotes, setPetNotes] = useState(accommodation?.pet_policy?.notes ?? '')
  const [cancellationType, setCancellationType] = useState(accommodation?.cancellation_policy?.type ?? 'flexible')
  const [cancellationDays, setCancellationDays] = useState(accommodation?.cancellation_policy?.days_before?.toString() ?? '1')
  const [cancellationPenalty, setCancellationPenalty] = useState(accommodation?.cancellation_policy?.penalty_percent?.toString() ?? '0')

  // Tab 5: Regole della casa
  const [smokingAllowed, setSmokingAllowed] = useState(accommodation?.smoking_allowed ?? false)
  const [childrenAllowed, setChildrenAllowed] = useState(accommodation?.children_allowed ?? true)
  const [partiesAllowed, setPartiesAllowed] = useState(accommodation?.parties_allowed ?? false)
  const [quietHoursStart, setQuietHoursStart] = useState(accommodation?.quiet_hours_start ?? '')
  const [quietHoursEnd, setQuietHoursEnd] = useState(accommodation?.quiet_hours_end ?? '')
  const [houseRulesNotes, setHouseRulesNotes] = useState(accommodation?.house_rules_notes ?? '')

  // Tab 6: Contatti e Pagamenti
  const [email, setEmail] = useState(accommodation?.email ?? '')
  const [phone, setPhone] = useState(accommodation?.phone ?? '')
  const [pec, setPec] = useState(accommodation?.pec ?? '')
  const [website, setWebsite] = useState(accommodation?.website ?? '')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(accommodation?.payment_methods ?? ['cash', 'credit_card'])

  const visibility = getFormVisibility(propertyType)
  const typeConfig = getPropertyTypeConfig(propertyType)
  const terms = getStructureTerms(propertyType)
  const country = entity.country_override ?? tenantCountry ?? 'IT'

  const effectiveImprenditoriale = isAlwaysImprenditoriale(propertyType) ? true : isImprenditoriale
  const fiscalConfig = useMemo(
    () => getEffectiveFiscalConfig(propertyType, effectiveImprenditoriale),
    [propertyType, effectiveImprenditoriale]
  )
  const complianceConfig = useMemo(
    () => getEffectiveCompliance(propertyType, effectiveImprenditoriale),
    [propertyType, effectiveImprenditoriale]
  )
  const invoicingConfig = useMemo(
    () => getEffectiveInvoicing(propertyType, effectiveImprenditoriale),
    [propertyType, effectiveImprenditoriale]
  )

  function toggleAmenity(amenity: string) {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  function togglePaymentMethod(method: string) {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Il nome è obbligatorio.' })
      return
    }
    setSaving(true)
    setMessage(null)

    const result = await updateEntitySettingsAction(
      entity.id,
      {
        name: name.trim(),
        slug: slug || undefined,
        is_active: isActive,
        country_override: entity.country_override ?? undefined,
      },
      {
        property_type: propertyType,
        is_imprenditoriale: effectiveImprenditoriale,
        legal_name: legalName || undefined,
        vat_number: vatNumber || undefined,
        fiscal_code: fiscalCode || undefined,
        short_description: shortDesc || undefined,
        description: description || undefined,
        address: address || undefined,
        city: city || undefined,
        province: province || undefined,
        region: region || undefined,
        zip: zip || undefined,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        email: email || undefined,
        phone: phone || undefined,
        pec: pec || undefined,
        website: website || undefined,
        default_check_in_time: checkIn || undefined,
        default_check_out_time: checkOut || undefined,
        amenities,
        star_rating: starRating ? parseInt(starRating) : null,
        fiscal_regime: fiscalRegime || undefined,
        has_vat: hasVat,
        default_vat_rate: vatRate ? parseFloat(vatRate) : undefined,
        cedolare_secca_enabled: cedolareEnabled,
        cedolare_secca_rate: cedolareRate ? parseFloat(cedolareRate) : undefined,
        ritenuta_ota_enabled: ritenutaOtaEnabled,
        ritenuta_ota_rate: ritenutaOtaRate ? parseFloat(ritenutaOtaRate) : undefined,
        sdi_code: sdiCode || undefined,
        invoice_prefix: invoicePrefix || undefined,
        invoice_next_number: invoiceNextNumber ? parseInt(invoiceNextNumber) : undefined,
        cin_code: cinCode || undefined,
        cin_expiry: cinExpiry || undefined,
        scia_number: sciaNumber || undefined,
        scia_status: (sciaStatus as SciaStatus) || undefined,
        scia_expiry: sciaExpiry || undefined,
        alloggiati_username: alloggiatiUsername || undefined,
        alloggiati_password: alloggiatiPassword || undefined,
        istat_structure_code: istatCode || undefined,
        pet_policy: {
          allowed: petsAllowed,
          max_pets: petMaxPets ? parseInt(petMaxPets) : undefined,
          fee_per_night: petFeePerNight ? parseFloat(petFeePerNight) : undefined,
          notes: petNotes || undefined,
        },
        cancellation_policy: {
          type: cancellationType,
          days_before: parseInt(cancellationDays),
          penalty_percent: parseInt(cancellationPenalty),
        },
        payment_methods: paymentMethods,
        smoking_allowed: smokingAllowed,
        children_allowed: childrenAllowed,
        parties_allowed: partiesAllowed,
        quiet_hours_start: quietHoursStart || undefined,
        quiet_hours_end: quietHoursEnd || undefined,
        house_rules_notes: houseRulesNotes || undefined,
      }
    )

    if (result.success) {
      setMessage({ type: 'success', text: 'Impostazioni salvate.' })
      if (alloggiatiPassword) setAlloggiatiPassword('')
      router.refresh()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Impostazioni struttura</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configura i dettagli di {name || 'questa struttura'}
          </p>
        </div>
        {entity.management_mode === 'agency_managed' && (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
            Gestita da agenzia
          </Badge>
        )}
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${
          message.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab: Struttura */}
        {activeTab === 'struttura' && (
          <div className="space-y-4">
            <Input label="Nome della struttura" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Slug URL" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di struttura</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">{typeConfig.description}</p>
            </div>

            {/* Toggle imprenditoriale — solo per b_and_b e apartment */}
            {canToggleImprenditoriale(propertyType) && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isImprenditoriale}
                    onChange={(e) => setIsImprenditoriale(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Attività imprenditoriale</span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {propertyType === 'b_and_b'
                        ? 'B&B con partita IVA — obblighi IVA, fattura elettronica, SCIA'
                        : 'Casa vacanze con partita IVA — obblighi IVA, fattura elettronica, nessun limite unità'}
                    </p>
                  </div>
                </label>
              </div>
            )}

            {visibility.showStarRating && (
              <Input
                label="Stelle"
                type="number"
                min="1"
                max="5"
                value={starRating}
                onChange={(e) => setStarRating(e.target.value)}
                placeholder="1-5"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione breve</label>
              <textarea
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione completa</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Struttura attiva</span>
            </label>

            {/* Amenities */}
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Servizi offerti</h3>
              {AMENITY_CATEGORIES.map((category) => (
                <div key={category.key}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{category.label}</h4>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                    {category.amenities.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={amenities.includes(amenity)}
                          onChange={() => toggleAmenity(amenity)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{getAmenityLabel(amenity)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Funzionalità info */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Funzionalità per {typeConfig.label}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className={typeConfig.unitLabel ? 'text-gray-700' : 'text-gray-400'}>
                  Unità: {typeConfig.unitLabelPlural}
                </span>
                <span className={visibility.showRoomTypes ? 'text-green-700' : 'text-gray-400'}>
                  {visibility.showRoomTypes ? '\u2713' : '\u2014'} {terms.roomTypesLabel}
                </span>
                <span className={visibility.showRooms ? 'text-green-700' : 'text-gray-400'}>
                  {visibility.showRooms ? '\u2713' : '\u2014'} Gestione camere
                </span>
                <span className={visibility.showRatePlans ? 'text-green-700' : 'text-gray-400'}>
                  {visibility.showRatePlans ? '\u2713' : '\u2014'} Piani tariffari
                </span>
                <span className={visibility.showMealPlans ? 'text-green-700' : 'text-gray-400'}>
                  {visibility.showMealPlans ? '\u2713' : '\u2014'} Piani pasto
                </span>
                {typeConfig.features.selfCheckin && (
                  <span className="text-green-700">{'\u2713'} Self check-in</span>
                )}
                {typeConfig.features.restaurant && (
                  <span className="text-green-700">{'\u2713'} Ristorante</span>
                )}
                {typeConfig.features.weeklyMonthlyPricing && (
                  <span className="text-green-700">{'\u2713'} Tariffe settimanali/mensili</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Posizione */}
        {activeTab === 'posizione' && (
          <div className="space-y-4">
            <Input label="Indirizzo" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="CAP" value={zip} onChange={(e) => setZip(e.target.value)} />
              <Input label="Città" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} />
              <Input label="Regione" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitudine" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              <Input label="Longitudine" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </div>
          </div>
        )}

        {/* Tab: Fiscale */}
        {activeTab === 'fiscale' && (
          <div className="space-y-4">
            {/* Identità legale */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Identità legale</h3>
              <Input label="Ragione sociale" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Nome legale della struttura" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Partita IVA" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="IT00000000000" />
                <Input label="Codice fiscale" value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value)} />
              </div>
            </div>

            {/* Banner info fiscale dinamico */}
            {country === 'IT' && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-blue-900">
                  Regime fiscale per {typeConfig.label}
                  {canToggleImprenditoriale(propertyType) && (
                    <span className="font-normal text-blue-700">
                      {' \u2014 '}{effectiveImprenditoriale ? 'imprenditoriale' : 'non imprenditoriale'}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
                  <span>ATECO suggerito: <strong>{fiscalConfig.atecoSuggestion}</strong></span>
                  <span>IVA: <strong>{fiscalConfig.hasVat ? `${fiscalConfig.defaultVatRate}%` : 'Non soggetto'}</strong></span>
                  <span>Cedolare secca: <strong>{fiscalConfig.allowCedolareSecca ? `Si (${fiscalConfig.defaultCedolareRate}%)` : 'No'}</strong></span>
                  <span>Ritenuta OTA: <strong>{fiscalConfig.ritenutaOTA > 0 ? `${fiscalConfig.ritenutaOTA}%` : 'Non applicabile'}</strong></span>
                  <span>Corrispettivi: <strong>{fiscalConfig.requiresCorrispettivi ? 'Obbligatori' : 'No'}</strong></span>
                  <span>Fattura elettronica: <strong>{fiscalConfig.requiresFatturaElettronica ? 'Obbligatoria' : 'No'}</strong></span>
                </div>
              </div>
            )}

            {country !== 'IT' && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                La configurazione fiscale dettagliata è disponibile per strutture italiane.
                Per altri paesi, configura manualmente i parametri fiscali.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regime fiscale</label>
              <select
                value={fiscalRegime}
                onChange={(e) => setFiscalRegime(e.target.value as FiscalRegime)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona...</option>
                {fiscalConfig.allowedFiscalRegimes.map((regime) => (
                  <option key={regime} value={regime}>
                    {FISCAL_REGIME_LABELS[regime]}
                    {regime === fiscalConfig.defaultFiscalRegime ? ' (consigliato)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasVat}
                onChange={(e) => setHasVat(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Soggetto IVA</span>
            </label>

            {hasVat && (
              <Input
                label="Aliquota IVA %"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
              />
            )}

            {fiscalConfig.allowCedolareSecca && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cedolareEnabled}
                    onChange={(e) => setCedolareEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Cedolare secca</span>
                </label>
                {cedolareEnabled && (
                  <Input
                    label="Aliquota cedolare secca %"
                    type="number"
                    step="0.01"
                    value={cedolareRate}
                    onChange={(e) => setCedolareRate(e.target.value)}
                  />
                )}
              </>
            )}

            {fiscalConfig.ritenutaOTA > 0 && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ritenutaOtaEnabled}
                    onChange={(e) => setRitenutaOtaEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Ritenuta OTA ({fiscalConfig.ritenutaOTA}%)</span>
                </label>
                {ritenutaOtaEnabled && (
                  <Input
                    label="Aliquota ritenuta OTA %"
                    type="number"
                    step="0.01"
                    value={ritenutaOtaRate}
                    onChange={(e) => setRitenutaOtaRate(e.target.value)}
                  />
                )}
              </>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Fatturazione</h3>
              <p className="text-xs text-gray-500">
                Documenti disponibili: {invoicingConfig.availableDocumentTypes.join(', ')}
                {' \u2014 '}Default: {invoicingConfig.defaultDocumentType}
              </p>
              <Input
                label="Codice SDI"
                value={sdiCode}
                onChange={(e) => setSdiCode(e.target.value)}
                placeholder="0000000"
                maxLength={7}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Prefisso fattura"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="FAT-"
                />
                <Input
                  label="Prossimo numero"
                  type="number"
                  min="1"
                  value={invoiceNextNumber}
                  onChange={(e) => setInvoiceNextNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Compliance */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            {country !== 'IT' && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                I requisiti compliance dettagliati sono disponibili per strutture italiane.
              </div>
            )}

            {/* Info compliance dinamico */}
            {country === 'IT' && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Requisiti per {typeConfig.label}
                  {canToggleImprenditoriale(propertyType) && (
                    <span className="font-normal text-gray-500">
                      {' \u2014 '}{effectiveImprenditoriale ? 'imprenditoriale' : 'non imprenditoriale'}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className={complianceConfig.requiresCIN ? 'text-green-700' : 'text-gray-400'}>
                    {complianceConfig.requiresCIN ? '\u2713' : '\u2014'} CIN obbligatorio
                  </span>
                  <span className={complianceConfig.requiresSCIA ? 'text-green-700' : 'text-gray-400'}>
                    {complianceConfig.requiresSCIA ? '\u2713' : '\u2014'} SCIA obbligatoria
                  </span>
                  <span className={complianceConfig.requiresAlloggiati ? 'text-green-700' : 'text-gray-400'}>
                    {complianceConfig.requiresAlloggiati ? '\u2713' : '\u2014'} Alloggiati Web
                  </span>
                  <span className={complianceConfig.requiresISTAT ? 'text-green-700' : 'text-gray-400'}>
                    {complianceConfig.requiresISTAT ? '\u2713' : '\u2014'} ISTAT
                  </span>
                  <span className={complianceConfig.requiresInsurance ? 'text-green-700' : 'text-gray-400'}>
                    {complianceConfig.requiresInsurance ? '\u2713' : '\u2014'} Assicurazione
                  </span>
                  <span className={complianceConfig.requiresAML ? 'text-green-700' : 'text-gray-400'}>
                    {complianceConfig.requiresAML ? '\u2713' : '\u2014'} Antiriciclaggio
                  </span>
                  {complianceConfig.maxUnits !== null && (
                    <span className="text-amber-700 col-span-2">
                      Max {complianceConfig.maxUnits} {typeConfig.unitLabelPlural}
                      {!effectiveImprenditoriale ? ' (senza P.IVA)' : ''}
                    </span>
                  )}
                  {complianceConfig.minUnits !== null && (
                    <span className="text-amber-700 col-span-2">
                      Min {complianceConfig.minUnits} {typeConfig.unitLabelPlural}
                    </span>
                  )}
                </div>
              </div>
            )}

            {complianceConfig.requiresCIN && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">CIN — Codice Identificativo Nazionale</h3>
                <Input
                  label="Codice CIN"
                  value={cinCode}
                  onChange={(e) => setCinCode(e.target.value)}
                  placeholder="IT000000000000000000"
                />
                <Input
                  label="Scadenza CIN"
                  type="date"
                  value={cinExpiry}
                  onChange={(e) => setCinExpiry(e.target.value)}
                />
              </div>
            )}

            {complianceConfig.requiresSCIA && (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">SCIA</h3>
                <Input
                  label="Numero SCIA"
                  value={sciaNumber}
                  onChange={(e) => setSciaNumber(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stato SCIA</label>
                  <select
                    value={sciaStatus}
                    onChange={(e) => setSciaStatus(e.target.value as SciaStatus)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="pending">In attesa</option>
                    <option value="approved">Approvata</option>
                    <option value="expired">Scaduta</option>
                  </select>
                </div>
                <Input
                  label="Scadenza SCIA"
                  type="date"
                  value={sciaExpiry}
                  onChange={(e) => setSciaExpiry(e.target.value)}
                />
              </div>
            )}

            {complianceConfig.requiresAlloggiati && (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Alloggiati Web (Questura)</h3>
                <Input
                  label="Username"
                  value={alloggiatiUsername}
                  onChange={(e) => setAlloggiatiUsername(e.target.value)}
                />
                <div>
                  <Input
                    label="Password"
                    type="password"
                    value={alloggiatiPassword}
                    onChange={(e) => setAlloggiatiPassword(e.target.value)}
                    placeholder={hasExistingPassword ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022  (lascia vuoto per non modificare)' : ''}
                  />
                  {hasExistingPassword && !alloggiatiPassword && (
                    <p className="mt-1 text-xs text-gray-400">Password salvata. Inserisci una nuova per sovrascriverla.</p>
                  )}
                </div>
              </div>
            )}

            {complianceConfig.requiresISTAT && (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">ISTAT</h3>
                <Input
                  label="Codice struttura ISTAT"
                  value={istatCode}
                  onChange={(e) => setIstatCode(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab: Policy */}
        {activeTab === 'policy' && (
          <div className="space-y-4">
            {visibility.showCheckInOut && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Orari</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Orario check-in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                  <Input label="Orario check-out" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Cancellazione</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di policy</label>
                <select
                  value={cancellationType}
                  onChange={(e) => setCancellationType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CANCELLATION_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Giorni prima del check-in"
                  type="number"
                  min="0"
                  value={cancellationDays}
                  onChange={(e) => setCancellationDays(e.target.value)}
                />
                <Input
                  label="Penale %"
                  type="number"
                  min="0"
                  max="100"
                  value={cancellationPenalty}
                  onChange={(e) => setCancellationPenalty(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Animali</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={petsAllowed}
                  onChange={(e) => setPetsAllowed(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Animali ammessi</span>
              </label>
              {petsAllowed && (
                <div className="ml-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Max animali"
                      type="number"
                      min="1"
                      value={petMaxPets}
                      onChange={(e) => setPetMaxPets(e.target.value)}
                    />
                    <Input
                      label="Costo per notte (\u20AC)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={petFeePerNight}
                      onChange={(e) => setPetFeePerNight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note animali</label>
                    <textarea
                      value={petNotes}
                      onChange={(e) => setPetNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Regole della casa</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={smokingAllowed}
                    onChange={(e) => setSmokingAllowed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Fumo consentito</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={childrenAllowed}
                    onChange={(e) => setChildrenAllowed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Bambini ammessi</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={partiesAllowed}
                    onChange={(e) => setPartiesAllowed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Feste ed eventi consentiti</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Silenzio dalle"
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  placeholder="22:00"
                />
                <Input
                  label="Silenzio fino alle"
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  placeholder="08:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note aggiuntive</label>
                <textarea
                  value={houseRulesNotes}
                  onChange={(e) => setHouseRulesNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Regole particolari della struttura..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Contatti e Pagamenti */}
        {activeTab === 'contatti' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Contatti</h3>
            <Input label="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="PEC" type="email" value={pec} onChange={(e) => setPec(e.target.value)} />
            <Input label="Sito web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Metodi di pagamento accettati</h3>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={paymentMethods.includes(opt.value)}
                      onChange={() => togglePaymentMethod(opt.value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sticky save */}
        <div className="sticky bottom-0 -mx-6 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={saving}>
              Salva impostazioni
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${tenantSlug}/stays/${entity.slug}`)}
            >
              Annulla
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
