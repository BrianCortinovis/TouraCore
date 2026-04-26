'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Card, CardContent } from '@touracore/ui'
import { User, FileText, Camera, Euro, Clock, CheckCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { updateCheckinData, completeCheckin } from '@touracore/hospitality/src/actions/checkin'
import {
  uploadDocumentScanAction,
  createTouristTaxPaymentIntentAction,
  setTaxPaymentChoiceAction,
} from './actions'

interface CheckinWizardProps {
  token: string
  entityId: string
  reservation: Record<string, unknown>
  guestData: Record<string, string>
  taxAmountCents: number
  taxNights: number
  taxPerPerson: number
  taxAlreadyPaid: boolean
  taxPaymentPolicy: 'online_only' | 'onsite_only' | 'guest_choice'
  taxInitialChoice: 'online' | 'onsite' | null
  hasFrontDoc: boolean
  hasBackDoc: boolean
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function CheckinWizard({
  token,
  reservation,
  guestData,
  taxAmountCents,
  taxNights,
  taxPerPerson,
  taxAlreadyPaid,
  taxPaymentPolicy,
  taxInitialChoice,
  hasFrontDoc,
  hasBackDoc,
}: CheckinWizardProps) {
  const guest = (reservation.guest ?? {}) as Record<string, string | null>
  const roomType = (reservation.room_type ?? {}) as Record<string, string>
  const needsTax = taxAmountCents > 0 && !taxAlreadyPaid
  const [taxChoice, setTaxChoice] = useState<'online' | 'onsite' | null>(taxInitialChoice)

  const STEPS = [
    { key: 'personal', label: 'Dati personali', icon: User },
    { key: 'document', label: 'Documento', icon: FileText },
    { key: 'scan', label: 'Foto documento', icon: Camera },
    ...(needsTax ? [{ key: 'tax', label: 'Tassa soggiorno', icon: Euro }] : []),
    { key: 'details', label: 'Arrivo', icon: Clock },
    { key: 'confirm', label: 'Conferma', icon: CheckCircle },
  ]

  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState(guestData.first_name ?? guest.first_name ?? '')
  const [lastName, setLastName] = useState(guestData.last_name ?? guest.last_name ?? '')
  const [email, setEmail] = useState(guestData.email ?? guest.email ?? '')
  const [phone, setPhone] = useState(guestData.phone ?? guest.phone ?? '')
  const [birthDate, setBirthDate] = useState(guestData.birth_date ?? '')
  const [birthPlace, setBirthPlace] = useState(guestData.birth_place ?? '')
  const [nationality, setNationality] = useState(guestData.nationality ?? 'IT')
  const [fiscalCode, setFiscalCode] = useState(guestData.fiscal_code ?? '')

  const [documentType, setDocumentType] = useState(guestData.document_type ?? 'id_card')
  const [documentNumber, setDocumentNumber] = useState(guestData.document_number ?? '')
  const [documentIssuedBy, setDocumentIssuedBy] = useState(guestData.document_issued_by ?? '')
  const [documentExpiry, setDocumentExpiry] = useState(guestData.document_expiry ?? '')

  const [frontUploaded, setFrontUploaded] = useState(hasFrontDoc)
  const [backUploaded, setBackUploaded] = useState(hasBackDoc)
  const [uploadingKind, setUploadingKind] = useState<'id_front' | 'id_back' | null>(null)

  const taxPaid = taxAlreadyPaid

  const [arrivalTime, setArrivalTime] = useState(guestData.arrival_time ?? '')
  const [specialRequests, setSpecialRequests] = useState(guestData.special_requests ?? '')
  const [privacyConsent, setPrivacyConsent] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, kind: 'id_front' | 'id_back') {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande (max 5 MB)')
      return
    }
    setError('')
    setUploadingKind(kind)
    try {
      const base64 = await fileToBase64(file)
      const res = await uploadDocumentScanAction({ token, kind, mimeType: file.type, base64 })
      if (!res.ok) {
        setError(`Upload fallito: ${res.error}`)
      } else {
        if (kind === 'id_front') setFrontUploaded(true)
        else setBackUploaded(true)
      }
    } catch {
      setError('Errore durante upload')
    } finally {
      setUploadingKind(null)
    }
  }

  async function handlePayTax() {
    setError('')
    startTransition(async () => {
      const res = await createTouristTaxPaymentIntentAction({ token })
      if (!res.ok || !res.clientSecret) {
        setError(`Errore pagamento: ${res.error}`)
        return
      }
      // Simulato: conferma immediata (TODO: wire Stripe Elements frontend)
      // Per MVP marchiamo come pagato dopo creazione intent — in produzione servono Stripe Elements
      // Disabilitato fino a integrazione Stripe Elements lato client
      setError('Pagamento online disponibile con Stripe Elements — per ora pagherai al check-in in struttura.')
    })
  }

  function saveStep() {
    setError('')
    const currentStepKey = STEPS[step]?.key

    if (currentStepKey === 'scan' && (!frontUploaded || !backUploaded)) {
      setError('Carica entrambe le foto del documento (fronte e retro).')
      return
    }

    if (currentStepKey === 'tax' && taxPaymentPolicy === 'guest_choice' && !taxChoice) {
      setError('Scegli come pagare la tassa di soggiorno.')
      return
    }

    if (currentStepKey === 'tax' && taxPaymentPolicy === 'online_only' && !taxPaid) {
      setError('Completa il pagamento online per continuare.')
      return
    }

    startTransition(async () => {
      try {
        const data: Record<string, unknown> = {
          guest_data: {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            birth_date: birthDate,
            birth_place: birthPlace,
            nationality,
            fiscal_code: fiscalCode,
            document_type: documentType,
            document_number: documentNumber,
            document_issued_by: documentIssuedBy,
            document_expiry: documentExpiry,
          },
          arrival_time: arrivalTime || null,
          special_requests: specialRequests || null,
        }

        const lastIdx = STEPS.length - 1
        if (step === lastIdx) data.privacy_signed = privacyConsent

        await updateCheckinData(token, data)

        if (step === lastIdx && privacyConsent) {
          await completeCheckin(token)
          setCompleted(true)
        } else {
          setStep((s) => Math.min(s + 1, lastIdx))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
      }
    })
  }

  if (completed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="text-lg font-bold text-gray-900">Check-in completato!</h2>
          <p className="mt-2 text-sm text-gray-500">
            I tuoi dati sono stati registrati. Ti aspettiamo!
          </p>
        </CardContent>
      </Card>
    )
  }

  const checkIn = reservation.check_in as string
  const checkOut = reservation.check_out as string
  const lastIdx = STEPS.length - 1
  const currentKey = STEPS[step]?.key

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-gray-900">{roomType.name ?? 'Camera'}</p>
              <p className="text-gray-500">
                {checkIn ? new Date(checkIn).toLocaleDateString('it-IT') : '—'} →{' '}
                {checkOut ? new Date(checkOut).toLocaleDateString('it-IT') : '—'}
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              {(reservation.adults as number) ?? 1} adulti
              {(reservation.children as number) ? `, ${reservation.children} bambini` : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium ${
                i < step ? 'bg-green-100 text-green-700' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-3 sm:w-6 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium text-gray-700">{STEPS[step]?.label}</p>

      <Card>
        <CardContent className="space-y-4 py-5">
          {currentKey === 'personal' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                <Input label="Cognome" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Telefono" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Data di nascita" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                <Input label="Luogo di nascita" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nazionalità" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                <Input label="Codice fiscale" value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value)} />
              </div>
            </>
          )}

          {currentKey === 'document' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo documento</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="id_card">Carta d&apos;identità</option>
                  <option value="passport">Passaporto</option>
                  <option value="driving_license">Patente di guida</option>
                </select>
              </div>
              <Input label="Numero documento" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required />
              <Input label="Rilasciato da" value={documentIssuedBy} onChange={(e) => setDocumentIssuedBy(e.target.value)} />
              <Input label="Scadenza" type="date" value={documentExpiry} onChange={(e) => setDocumentExpiry(e.target.value)} />
            </>
          )}

          {currentKey === 'scan' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Carica foto nitide fronte e retro del documento (o solo fronte per passaporto). Max 5 MB per foto.
              </p>
              <DocUpload
                label="Fronte del documento"
                done={frontUploaded}
                uploading={uploadingKind === 'id_front'}
                onChange={(e) => handleUpload(e, 'id_front')}
              />
              {documentType !== 'passport' && (
                <DocUpload
                  label="Retro del documento"
                  done={backUploaded}
                  uploading={uploadingKind === 'id_back'}
                  onChange={(e) => handleUpload(e, 'id_back')}
                />
              )}
            </div>
          )}

          {currentKey === 'tax' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Tassa di soggiorno</p>
                <p className="mt-1 text-xs text-amber-800">
                  {taxNights} notti · €{(taxPerPerson).toFixed(2)} a persona/notte
                </p>
                <p className="mt-2 text-xl font-bold text-amber-900">€{(taxAmountCents / 100).toFixed(2)}</p>
              </div>

              {taxPaid && (
                <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">
                  ✓ Tassa soggiorno già pagata online.
                </p>
              )}

              {!taxPaid && taxPaymentPolicy === 'online_only' && (
                <>
                  <p className="rounded bg-slate-50 p-3 text-xs text-slate-600">
                    La struttura richiede il pagamento online della tassa di soggiorno prima dell&apos;arrivo.
                  </p>
                  <Button onClick={handlePayTax} disabled={isPending} className="w-full">
                    {isPending ? 'Elaborazione…' : 'Paga online ora'}
                  </Button>
                </>
              )}

              {!taxPaid && taxPaymentPolicy === 'onsite_only' && (
                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p>Pagherai la tassa al momento del check-in in struttura.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Metodi accettati: contanti, POS, carta.
                  </p>
                </div>
              )}

              {!taxPaid && taxPaymentPolicy === 'guest_choice' && (
                <>
                  <p className="text-sm font-medium text-gray-700">Come preferisci pagare?</p>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await setTaxPaymentChoiceAction({ token, choice: 'online' })
                        setTaxChoice('online')
                      }}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        taxChoice === 'online' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">Paga online ora</p>
                      <p className="mt-0.5 text-xs text-gray-500">Carta di credito/debito sicura</p>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await setTaxPaymentChoiceAction({ token, choice: 'onsite' })
                        setTaxChoice('onsite')
                      }}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        taxChoice === 'onsite' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">Paga in struttura</p>
                      <p className="mt-0.5 text-xs text-gray-500">Contanti, POS o carta al check-in</p>
                    </button>
                  </div>
                  {taxChoice === 'online' && (
                    <Button onClick={handlePayTax} disabled={isPending} className="w-full">
                      {isPending ? 'Elaborazione…' : 'Procedi al pagamento'}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {currentKey === 'details' && (
            <>
              <Input label="Orario previsto di arrivo" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-gray-700">Richieste speciali</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  placeholder="Allergie, esigenze particolari, orari..."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {currentKey === 'confirm' && (
            <>
              <div className="space-y-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900">Riepilogo</p>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-500">Nome</span>
                  <span>{firstName} {lastName}</span>
                  <span className="text-gray-500">Documento</span>
                  <span>{documentNumber || '—'}</span>
                  <span className="text-gray-500">Foto caricate</span>
                  <span>{frontUploaded && backUploaded ? 'Fronte + retro' : frontUploaded ? 'Solo fronte' : 'Non caricate'}</span>
                  <span className="text-gray-500">Arrivo</span>
                  <span>{arrivalTime || 'Non specificato'}</span>
                  {taxAmountCents > 0 && (
                    <>
                      <span className="text-gray-500">Tassa soggiorno</span>
                      <span>
                        {taxPaid
                          ? 'Pagata online'
                          : taxChoice === 'online'
                            ? 'Pagamento online in corso'
                            : 'Da pagare in struttura'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Acconsento al trattamento dei miei dati personali ai sensi del GDPR e della normativa italiana vigente.
                  I dati e le foto del documento saranno utilizzati per la registrazione presso la struttura e per gli
                  adempimenti di legge (Alloggiati Web Questura).
                </span>
              </label>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0 || isPending}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Indietro
        </Button>
        <Button onClick={saveStep} disabled={isPending || (step === lastIdx && !privacyConsent)}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === lastIdx ? 'Completa check-in' : 'Avanti'}
          {step < lastIdx && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

function DocUpload({
  label,
  done,
  uploading,
  onChange,
}: {
  label: string
  done: boolean
  uploading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between rounded-lg border-2 border-dashed p-4 ${
      done ? 'border-emerald-400 bg-emerald-50' : uploading ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:bg-gray-50'
    }`}>
      <div className="flex items-center gap-3">
        {done ? (
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        ) : (
          <Camera className="h-6 w-6 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">
            {done ? 'Caricato' : uploading ? 'Caricamento…' : 'Tocca per scattare o caricare'}
          </p>
        </div>
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={onChange}
        disabled={uploading}
        className="hidden"
      />
    </label>
  )
}
