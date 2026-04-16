'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  FileText,
  PawPrint,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@touracore/ui'
import { generatePolicyText } from '@touracore/hospitality/src/compliance/cancellation-policy'
import {
  createPublicBookingAction,
  getPublicBookingContextAction,
  searchAvailabilityAction,
  type AvailabilityItem,
  type PublicBookingContext,
  type PublicBookingUpsell,
} from './actions'
import { calculatePetSupplement } from './pet-pricing'

interface BookingConfirmation {
  reservationCode: string
  checkIn: string
  checkOut: string
  totalAmount: number
  currency: string
  ratePlanId: string
  upsellTotal: number
}

type Step = 'search' | 'results' | 'form' | 'confirmation'
type PolicyLocale = 'it' | 'en' | 'de'

function getTodayStr() {
  return new Date().toISOString().split('T')[0]!
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function mapLanguageToLocale(language?: string) {
  switch ((language ?? 'it').toLowerCase()) {
    case 'en':
      return 'en-GB'
    case 'de':
      return 'de-DE'
    default:
      return 'it-IT'
  }
}

function mapLanguageToPolicyLocale(language?: string): PolicyLocale {
  switch ((language ?? 'it').toLowerCase()) {
    case 'en':
      return 'en'
    case 'de':
      return 'de'
    default:
      return 'it'
  }
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function offerPriceLabel(offer: PublicBookingUpsell, locale: string, currency: string) {
  return formatMoney(offer.price, currency, locale)
}

export default function PublicBookingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const initialCheckIn = searchParams.get('check_in') || ''
  const initialCheckOut = searchParams.get('check_out') || ''
  const initialAdults = Number(searchParams.get('adults')) || Number(searchParams.get('guests')) || 2
  const initialChildren = Number(searchParams.get('children')) || 0
  const initialInfants = Number(searchParams.get('infants')) || 0
  const initialRatePlanId = searchParams.get('rate_plan_id') || ''
  const initialWithPets = searchParams.get('pets') === '1'

  const [context, setContext] = useState<PublicBookingContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('search')

  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [checkOut, setCheckOut] = useState(initialCheckOut)
  const [adults, setAdults] = useState(initialAdults)
  const [children, setChildren] = useState(initialChildren)
  const [infants, setInfants] = useState(initialInfants)
  const [ratePlanId, setRatePlanId] = useState(initialRatePlanId)
  const [travelWithPets, setTravelWithPets] = useState(initialWithPets)
  const [petCount, setPetCount] = useState(1)
  const [petDetails, setPetDetails] = useState('')
  const [selectedUpsells, setSelectedUpsells] = useState<Record<string, number>>({})

  const [results, setResults] = useState<AvailabilityItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<AvailabilityItem | null>(null)

  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [documentType, setDocumentType] = useState('id_card')
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentIssuedBy, setDocumentIssuedBy] = useState('')
  const [documentIssuedDate, setDocumentIssuedDate] = useState('')
  const [documentExpiryDate, setDocumentExpiryDate] = useState('')
  const [documentCountry, setDocumentCountry] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('')
  const [fiscalCode, setFiscalCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyVat, setCompanyVat] = useState('')
  const [companySdi, setCompanySdi] = useState('')
  const [companyPec, setCompanyPec] = useState('')
  const [childrenAges, setChildrenAges] = useState('')
  const [companionDetails, setCompanionDetails] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)

  const [booking, setBooking] = useState(false)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const [error, setError] = useState('')

  const loadContext = useCallback(async () => {
    setLoading(true)
    setError('')

    const ctx = await getPublicBookingContextAction(slug)
    setContext(ctx)

    const nextRatePlanId = initialRatePlanId || ctx.defaultRatePlanId || ctx.ratePlans[0]?.id || ''
    setRatePlanId(nextRatePlanId)
    setLoading(false)

    if (ctx.property && initialCheckIn && initialCheckOut) {
      await runSearch({
        checkIn: initialCheckIn,
        checkOut: initialCheckOut,
        adults: initialAdults,
        children: initialChildren,
        infants: initialInfants,
        ratePlanId: nextRatePlanId,
      })
    }
  }, [slug])

  useEffect(() => {
    loadContext()
  }, [loadContext])

  const property = context?.property ?? null
  const locale = mapLanguageToLocale(property?.default_language)
  const policyLocale = mapLanguageToPolicyLocale(property?.default_language)
  const currency = property?.default_currency || 'EUR'
  const selectedRatePlan =
    context?.ratePlans.find((plan) => plan.id === ratePlanId) ??
    context?.ratePlans[0] ??
    null

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 0

  const effectiveGuests = adults + children
  const effectivePetCount = travelWithPets ? petCount : 0

  const selectedUpsellItems = (context?.upsells ?? [])
    .filter((offer) => (selectedUpsells[offer.id] ?? 0) > 0)
    .map((offer) => ({
      offer,
      quantity: selectedUpsells[offer.id] ?? 0,
    }))

  const roomTotal = selectedRoom?.offer?.totalPrice ?? 0
  const petSupplement = property ? calculatePetSupplement(property.pet_policy, effectivePetCount, nights) : 0
  const upsellTotal = selectedUpsellItems.reduce((sum, item) => sum + item.offer.price * item.quantity, 0)
  const grandTotal = roomTotal + petSupplement + upsellTotal
  const policyText = selectedRatePlan ? generatePolicyText(selectedRatePlan.cancellation_policy, policyLocale) : ''

  async function runSearch(overrides?: {
    checkIn?: string
    checkOut?: string
    adults?: number
    children?: number
    infants?: number
    ratePlanId?: string
  }) {
    const targetCheckIn = overrides?.checkIn ?? checkIn
    const targetCheckOut = overrides?.checkOut ?? checkOut
    const targetAdults = overrides?.adults ?? adults
    const targetChildren = overrides?.children ?? children
    const targetRatePlanId = overrides?.ratePlanId ?? ratePlanId

    if (!property || !targetCheckIn || !targetCheckOut) return

    setSearching(true)
    setError('')
    setSelectedRoom(null)

    const data = await searchAvailabilityAction(
      property.id,
      targetCheckIn,
      targetCheckOut,
      targetAdults + targetChildren,
      targetRatePlanId || undefined,
    )

    setResults(data)
    setStep('results')
    setSearching(false)
  }

  async function handleSearch() {
    await runSearch()
  }

  function selectRoom(item: AvailabilityItem) {
    setSelectedRoom(item)
    setStep('form')
  }

  function updateUpsellSelection(offerId: string, quantity: number) {
    setSelectedUpsells((prev) => {
      const next = { ...prev }
      if (quantity <= 0) {
        delete next[offerId]
      } else {
        next[offerId] = quantity
      }
      return next
    })
  }

  function toggleUpsell(offerId: string, enabled: boolean) {
    if (!enabled) {
      updateUpsellSelection(offerId, 0)
      return
    }

    updateUpsellSelection(offerId, selectedUpsells[offerId] ?? 1)
  }

  async function handleBook() {
    if (!property || !selectedRoom || !selectedRatePlan) return
    if (!acceptTerms || !acceptPrivacy) {
      setError('Devi accettare condizioni di prenotazione e privacy per continuare.')
      return
    }

    setBooking(true)
    setError('')

    const res = await createPublicBookingAction({
      entityId: property.id,
      roomTypeId: selectedRoom.roomType.id,
      ratePlanId: selectedRatePlan.id,
      checkIn,
      checkOut,
      adults,
      children,
      infants,
      petCount: effectivePetCount,
      petDetails: effectivePetCount > 0 ? petDetails : undefined,
      guestName,
      guestEmail,
      guestPhone,
      nationality,
      documentType,
      documentNumber,
      documentIssuedBy,
      documentIssuedDate,
      documentExpiryDate,
      documentCountry,
      address,
      city,
      province,
      zip,
      country,
      fiscalCode,
      companyName,
      companyVat,
      companySdi,
      companyPec,
      preferences: companionDetails,
      childrenAges,
      privacyConsent: acceptPrivacy,
      marketingConsent: acceptMarketing,
      selectedUpsells: selectedUpsellItems.map((item) => ({
        offerId: item.offer.id,
        quantity: item.quantity,
      })),
      specialRequests,
    })

    if (res.success) {
      setConfirmation(res.data as BookingConfirmation)
      setStep('confirmation')
    } else {
      setError(res.error || 'Errore nella prenotazione')
    }

    setBooking(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc,_#eff6ff_55%,_#e2e8f0)]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Struttura non trovata.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eff6ff_45%,_#e2e8f0)]">
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Booking engine</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">{property.name}</h1>
            {property.short_description && (
              <p className="text-sm text-slate-500">{property.short_description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{currency}</Badge>
            <Badge variant="secondary">{locale}</Badge>
            <Badge variant="secondary">{context?.ratePlans.length ?? 0} tariffe</Badge>
            <Badge variant="secondary">{context?.upsells.length ?? 0} extra</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {step === 'confirmation' && confirmation ? (
          <Card className="overflow-hidden border-slate-200 shadow-xl">
            <CardHeader className="bg-emerald-50">
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <ShieldCheck className="h-5 w-5" />
                Prenotazione confermata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="rounded-2xl bg-emerald-50 p-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Codice prenotazione
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-900">
                  {confirmation.reservationCode}
                </p>
                <p className="mt-3 text-sm text-emerald-700">
                  Conserva il codice per gestire modifiche, check-in e messaggi automatici.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Check-in</p>
                  <p className="mt-1 font-medium text-slate-900">{formatDate(confirmation.checkIn, locale)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Check-out</p>
                  <p className="mt-1 font-medium text-slate-900">{formatDate(confirmation.checkOut, locale)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tariffa</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedRatePlan?.name ?? 'Tariffa pubblica'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Totale</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatMoney(confirmation.totalAmount, confirmation.currency, locale)}
                  </p>
                </div>
              </div>

              {selectedUpsellItems.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-900">Extra inclusi</p>
                  <div className="space-y-2 text-sm text-slate-600">
                    {selectedUpsellItems.map(({ offer, quantity }) => (
                      <div key={offer.id} className="flex items-center justify-between gap-4">
                        <span>{offer.name} × {quantity}</span>
                        <span>{formatMoney(offer.price * quantity, currency, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <section className="overflow-hidden border border-slate-200 bg-slate-950 text-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.6)]">
              <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/15 bg-white/10 text-white">Direct booking</Badge>
                    <Badge className="border-white/15 bg-white/10 text-white">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      rate plan + extra + guest data
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                      Prenotazione rapida, ma già completa di tariffa, extra e dati ospite avanzati.
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-slate-100/90 sm:text-base">
                      Il flusso usa il core Hospitality: niente workaround, niente dati persi, tutto
                      resta coerente con tenant, struttura, tariffa e canali.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                      <CalendarDays className="h-4 w-4" />
                      {property.name}
                    </span>
                    <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                      <BedDouble className="h-4 w-4" />
                      {context?.ratePlans.length ?? 0} tariffe pubbliche
                    </span>
                    <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                      <PawPrint className="h-4 w-4" />
                      {property.pet_policy.allowed ? 'Animali ammessi' : 'Animali non ammessi'}
                    </span>
                  </div>
                </div>

                <aside className="border border-white/10 bg-white/10 p-5 backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                    Configurazione pubblica
                  </div>
                  <div className="mt-3 space-y-3 text-sm text-slate-100/90">
                    <div className="flex items-center justify-between gap-4">
                      <span>Tariffa attiva</span>
                      <span className="font-medium">{selectedRatePlan?.name ?? 'Standard'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Valuta</span>
                      <span className="font-medium">{currency}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Lingua</span>
                      <span className="font-medium">{locale}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Extra vendibili</span>
                      <span className="font-medium">{context?.upsells.length ?? 0}</span>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-950">
                      <Search className="h-5 w-5 text-slate-500" />
                      Ricerca disponibilità
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Input
                        label="Check-in"
                        type="date"
                        value={checkIn}
                        min={getTodayStr()}
                        onChange={(e) => {
                          setCheckIn(e.target.value)
                          if (checkOut && e.target.value >= checkOut) {
                            const next = new Date(e.target.value)
                            next.setDate(next.getDate() + 1)
                            setCheckOut(next.toISOString().split('T')[0]!)
                          }
                        }}
                      />
                      <Input
                        label="Check-out"
                        type="date"
                        value={checkOut}
                        min={checkIn || getTodayStr()}
                        onChange={(e) => setCheckOut(e.target.value)}
                      />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Ospiti adulti</label>
                        <select
                          value={adults}
                          onChange={(e) => setAdults(Number(e.target.value))}
                          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Bambini</label>
                        <select
                          value={children}
                          onChange={(e) => setChildren(Number(e.target.value))}
                          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Infanti</label>
                        <select
                          value={infants}
                          onChange={(e) => setInfants(Number(e.target.value))}
                          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[0, 1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 xl:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Tariffa</label>
                        <select
                          value={ratePlanId}
                          onChange={async (e) => {
                            const next = e.target.value
                            setRatePlanId(next)
                            if (checkIn && checkOut) {
                              await runSearch({ ratePlanId: next })
                            }
                          }}
                          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {(context?.ratePlans ?? []).map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        {nights > 0 && (
                          <Badge variant="secondary">
                            {nights} {nights === 1 ? 'notte' : 'notti'}
                          </Badge>
                        )}
                        <span>{effectiveGuests} ospiti totali</span>
                        {children > 0 && <span>{children} bambini</span>}
                        {infants > 0 && <span>{infants} infanti</span>}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={travelWithPets}
                          onChange={(e) => setTravelWithPets(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <PawPrint className="h-4 w-4 text-slate-500" />
                        Viaggio con animali
                      </label>
                    </div>

                    {travelWithPets && !property.pet_policy.allowed && (
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        Questa struttura non accetta animali. Disattiva l’opzione o scegli un’altra soluzione.
                      </p>
                    )}

                    {selectedRatePlan && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Tariffa selezionata
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-slate-950">{selectedRatePlan.name}</h3>
                            {selectedRatePlan.description && (
                              <p className="mt-1 text-sm text-slate-600">{selectedRatePlan.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-slate-600">
                            <p className="font-medium text-slate-900">
                              {selectedRatePlan.rate_type === 'non_refundable'
                                ? 'Non rimborsabile'
                                : 'Vendita diretta'}
                            </p>
                            <p>{selectedRatePlan.meal_plan.replace('_', ' ')}</p>
                          </div>
                        </div>

                        <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <summary className="cursor-pointer text-sm font-medium text-slate-900">
                            Politica di cancellazione
                          </summary>
                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {policyText}
                          </p>
                        </details>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button onClick={handleSearch} disabled={searching || !checkIn || !checkOut || nights <= 0}>
                        {searching ? 'Ricerca...' : 'Cerca disponibilità'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {step === 'results' && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-950">Risultati disponibili</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {results.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nessuna camera disponibile per le date selezionate.
                        </p>
                      ) : (
                        results.map((item) => (
                          <div key={item.roomType.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-slate-950">{item.roomType.name}</h3>
                                  <Badge variant={item.availableRooms > 0 ? 'success' : 'destructive'}>
                                    {item.availableRooms > 0
                                      ? `${item.availableRooms} disponibili`
                                      : 'Non disponibile'}
                                  </Badge>
                                  {selectedRatePlan && <Badge variant="secondary">{selectedRatePlan.name}</Badge>}
                                </div>
                                {item.roomType.description && (
                                  <p className="text-sm leading-6 text-slate-600">{item.roomType.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span>Max {item.roomType.max_occupancy} ospiti</span>
                                  {item.roomType.size_sqm && <span>· {item.roomType.size_sqm} mq</span>}
                                  {item.roomType.bed_configuration && <span>· {item.roomType.bed_configuration}</span>}
                                </div>
                                {selectedRatePlan && (
                                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    {selectedRatePlan.description || 'Tariffa pubblica attiva con policy chiara e prezzo netto.'}
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                {item.offer && item.offer.allowed ? (
                                  <>
                                    {item.offer.appliedDiscount && (
                                      <p className="text-sm text-slate-400 line-through">
                                        {formatMoney(item.offer.baseTotalPrice, currency, locale)}
                                      </p>
                                    )}
                                    <p className="text-3xl font-semibold text-slate-950">
                                      {formatMoney(item.offer.totalPrice, currency, locale)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatMoney(item.offer.effectivePricePerNight, currency, locale)} / notte
                                    </p>
                                    {item.offer.appliedDiscount && (
                                      <Badge variant="warning" className="mt-2">
                                        {item.offer.appliedDiscount.label || 'Sconto soggiorno'}
                                      </Badge>
                                    )}
                                    <div className="mt-4">
                                      <Button onClick={() => selectRoom(item)} disabled={item.availableRooms < 1} size="sm">
                                        Prenota
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-sm text-slate-500">
                                    {item.offer?.error || 'Prezzo non disponibile'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-950">
                      <Sparkles className="h-5 w-5 text-slate-500" />
                      Extra e upsell
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {context?.upsells.length ? (
                      context.upsells.map((offer) => {
                        const enabled = (selectedUpsells[offer.id] ?? 0) > 0
                        const maxQuantity = offer.max_quantity ?? 5
                        const quantity = selectedUpsells[offer.id] ?? 1

                        return (
                          <div key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-950">{offer.name}</p>
                                  {offer.requires_request && <Badge variant="warning">Su richiesta</Badge>}
                                </div>
                                {offer.description && (
                                  <p className="text-sm leading-6 text-slate-600">{offer.description}</p>
                                )}
                                <p className="text-sm font-medium text-slate-900">
                                  {offerPriceLabel(offer, locale, currency)}
                                </p>
                              </div>
                              <label className="flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) => toggleUpsell(offer.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-500">Aggiungi</span>
                              </label>
                            </div>

                            {enabled && (
                              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_90px]">
                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                  {offer.bookable_with_slots
                                    ? 'Prenotabile a slot'
                                    : 'Prenotabile durante il booking'}
                                </div>
                                <select
                                  value={quantity}
                                  onChange={(e) => updateUpsellSelection(offer.id, Number(e.target.value))}
                                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {Array.from({ length: Math.max(1, maxQuantity) }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500">
                        Nessun extra pubblicabile configurato per questa struttura.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-950">
                      <Users className="h-5 w-5 text-slate-500" />
                      Riassunto prenotazione
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Camera</span>
                        <span className="font-medium text-slate-900">{selectedRoom?.roomType.name ?? 'Da scegliere'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tariffa</span>
                        <span className="font-medium text-slate-900">{selectedRatePlan?.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Prezzo camera</span>
                        <span className="font-medium text-slate-900">{formatMoney(roomTotal, currency, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Animali</span>
                        <span className="font-medium text-slate-900">{formatMoney(petSupplement, currency, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Extra</span>
                        <span className="font-medium text-slate-900">{formatMoney(upsellTotal, currency, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="font-semibold text-slate-900">Totale</span>
                        <span className="text-lg font-semibold text-slate-950">
                          {formatMoney(grandTotal, currency, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Informazioni
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li>• Dati ospite avanzati: documento, indirizzo, azienda e consensi.</li>
                        <li>• Extra sincronizzabili con il core e con i canali esterni.</li>
                        <li>• Isolamento tenant e struttura mantenuto nel backend.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {step === 'form' && selectedRoom && selectedRatePlan && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-950">Completa la prenotazione</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="rounded-2xl bg-blue-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-blue-950">{selectedRoom.roomType.name}</p>
                        <p className="mt-1 text-sm text-blue-700">
                          {formatDate(checkIn, locale)} → {formatDate(checkOut, locale)} · {nights} {nights === 1 ? 'notte' : 'notti'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-700">Tariffa camera</p>
                        <p className="text-2xl font-semibold text-blue-950">{formatMoney(roomTotal, currency, locale)}</p>
                      </div>
                    </div>
                    {petSupplement > 0 && (
                      <div className="mt-4 flex items-start justify-between border-t border-blue-200 pt-4">
                        <div>
                          <p className="flex items-center gap-2 font-semibold text-blue-950">
                            <PawPrint className="h-4 w-4" />
                            Supplemento animali
                          </p>
                          <p className="text-xs text-blue-700">
                            {effectivePetCount} {effectivePetCount === 1 ? 'animale' : 'animali'}
                            {property.pet_policy.fee_per_night > 0 &&
                              ` · ${formatMoney(property.pet_policy.fee_per_night, currency, locale)}/notte ciascuno`}
                            {property.pet_policy.fee_per_stay > 0 &&
                              ` · ${formatMoney(property.pet_policy.fee_per_stay, currency, locale)}/soggiorno ciascuno`}
                          </p>
                        </div>
                        <p className="font-semibold text-blue-950">{formatMoney(petSupplement, currency, locale)}</p>
                      </div>
                    )}
                    {selectedUpsellItems.length > 0 && (
                      <div className="mt-4 border-t border-blue-200 pt-4">
                        <p className="text-sm font-semibold text-blue-950">Extra selezionati</p>
                        <div className="mt-3 space-y-2 text-sm text-blue-800">
                          {selectedUpsellItems.map(({ offer, quantity }) => (
                            <div key={offer.id} className="flex items-center justify-between gap-4">
                              <span>{offer.name} × {quantity}</span>
                              <span>{formatMoney(offer.price * quantity, currency, locale)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-blue-200 pt-4">
                      <p className="text-sm font-semibold text-blue-950">Totale</p>
                      <p className="text-2xl font-bold text-blue-950">{formatMoney(grandTotal, currency, locale)}</p>
                    </div>
                  </div>

                  {property.pet_policy.allowed && (
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={travelWithPets}
                          onChange={(e) => setTravelWithPets(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <PawPrint className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">Porto con me degli animali</span>
                      </label>
                      {property.pet_policy.notes && (
                        <p className="mt-2 pl-6 text-xs text-slate-500">{property.pet_policy.notes}</p>
                      )}
                      {travelWithPets && (
                        <div className="mt-4 space-y-4 pl-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700">
                                Numero animali
                              </label>
                              <select
                                value={petCount}
                                onChange={(e) => setPetCount(Number(e.target.value))}
                                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {Array.from({ length: Math.max(1, property.pet_policy.max_pets || 5) }, (_, i) => i + 1).map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Input
                              label="Dettagli animali"
                              value={petDetails}
                              onChange={(e) => setPetDetails(e.target.value)}
                              placeholder="Es. Labrador 3 anni, 25kg, docile"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          <h3 className="font-semibold text-slate-950">Dati ospite</h3>
                        </div>
                        <div className="mt-4 space-y-4">
                          <Input
                            label="Nome e cognome"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            required
                          />
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input
                              label="Email"
                              type="email"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              required
                            />
                            <Input
                              label="Telefono"
                              type="tel"
                              value={guestPhone}
                              onChange={(e) => setGuestPhone(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input
                              label="Nazionalità"
                              value={nationality}
                              onChange={(e) => setNationality(e.target.value)}
                              placeholder="Italia"
                            />
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo documento</label>
                              <select
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="id_card">Carta d'identità</option>
                                <option value="passport">Passaporto</option>
                                <option value="driving_license">Patente</option>
                                <option value="residence_permit">Permesso di soggiorno</option>
                              </select>
                            </div>
                            <Input
                              label="Numero documento"
                              value={documentNumber}
                              onChange={(e) => setDocumentNumber(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input
                              label="Rilasciato da"
                              value={documentIssuedBy}
                              onChange={(e) => setDocumentIssuedBy(e.target.value)}
                            />
                            <Input
                              label="Paese documento"
                              value={documentCountry}
                              onChange={(e) => setDocumentCountry(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input
                              label="Data rilascio"
                              type="date"
                              value={documentIssuedDate}
                              onChange={(e) => setDocumentIssuedDate(e.target.value)}
                            />
                            <Input
                              label="Data scadenza"
                              type="date"
                              value={documentExpiryDate}
                              onChange={(e) => setDocumentExpiryDate(e.target.value)}
                            />
                            <Input
                              label="Codice fiscale"
                              value={fiscalCode}
                              onChange={(e) => setFiscalCode(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input
                              label="Indirizzo"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                            />
                            <Input
                              label="Città"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input
                              label="Provincia"
                              value={province}
                              onChange={(e) => setProvince(e.target.value)}
                            />
                            <Input
                              label="CAP"
                              value={zip}
                              onChange={(e) => setZip(e.target.value)}
                            />
                            <Input
                              label="Paese residenza"
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <h3 className="font-semibold text-slate-950">Dati aziendali e note</h3>
                        </div>
                        <div className="mt-4 space-y-4">
                          <Input
                            label="Ragione sociale"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                          />
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input
                              label="Partita IVA"
                              value={companyVat}
                              onChange={(e) => setCompanyVat(e.target.value)}
                            />
                            <Input
                              label="SDI"
                              value={companySdi}
                              onChange={(e) => setCompanySdi(e.target.value)}
                            />
                            <Input
                              label="PEC"
                              value={companyPec}
                              onChange={(e) => setCompanyPec(e.target.value)}
                            />
                          </div>
                          <Input
                            label="Età bambini"
                            value={childrenAges}
                            onChange={(e) => setChildrenAges(e.target.value)}
                            placeholder="Es. 4, 7"
                          />
                          <Input
                            label="Accompagnatori / ospiti aggiuntivi"
                            value={companionDetails}
                            onChange={(e) => setCompanionDetails(e.target.value)}
                            placeholder="Es. 1 adulto aggiuntivo con arrivo separato"
                          />
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Richieste speciali
                            </label>
                            <textarea
                              value={specialRequests}
                              onChange={(e) => setSpecialRequests(e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Allergie, arrivo tardivo, lettino, piano alto, transfer..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-500" />
                          <h3 className="font-semibold text-slate-950">Consensi</h3>
                        </div>
                        <div className="mt-4 space-y-4">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={acceptTerms}
                              onChange={(e) => setAcceptTerms(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600">
                              Accetto le condizioni di prenotazione e la politica di cancellazione.
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={acceptPrivacy}
                              onChange={(e) => setAcceptPrivacy(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600">
                              Accetto il trattamento dei dati personali per finalità di prenotazione.
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={acceptMarketing}
                              onChange={(e) => setAcceptMarketing(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600">
                              Acconsento a ricevere offerte e comunicazioni commerciali.
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Riepilogo finale
                        </p>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Ospiti</span>
                            <span className="font-medium text-slate-900">
                              {adults} adulti{children > 0 ? `, ${children} bambini` : ''}{infants > 0 ? `, ${infants} infanti` : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Animali</span>
                            <span className="font-medium text-slate-900">{effectivePetCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Extra selezionati</span>
                            <span className="font-medium text-slate-900">{selectedUpsellItems.length}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                            <span className="font-semibold text-slate-900">Totale</span>
                            <span className="text-lg font-semibold text-slate-950">
                              {formatMoney(grandTotal, currency, locale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <Button variant="ghost" onClick={() => setStep('results')}>
                      Indietro
                    </Button>
                    <Button
                      onClick={handleBook}
                      disabled={booking || !guestName || !guestEmail || !acceptTerms || !acceptPrivacy}
                    >
                      {booking ? 'Prenotazione in corso...' : `Conferma ${formatMoney(grandTotal, currency, locale)}`}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200/70 bg-white/85 py-4 backdrop-blur">
        <p className="text-center text-xs text-slate-400">Powered by TouraCore</p>
      </footer>
    </div>
  )
}
