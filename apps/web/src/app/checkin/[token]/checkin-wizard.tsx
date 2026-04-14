'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Card, CardContent } from '@touracore/ui'
import { User, FileText, Clock, CheckCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { updateCheckinData, completeCheckin } from '@touracore/hospitality/src/actions/checkin'

interface CheckinWizardProps {
  token: string
  reservation: Record<string, unknown>
  guestData: Record<string, string>
}

const STEPS = [
  { key: 'personal', label: 'Dati personali', icon: User },
  { key: 'document', label: 'Documento', icon: FileText },
  { key: 'details', label: 'Dettagli arrivo', icon: Clock },
  { key: 'confirm', label: 'Conferma', icon: CheckCircle },
] as const

export function CheckinWizard({ token, reservation, guestData }: CheckinWizardProps) {
  const guest = (reservation.guest ?? {}) as Record<string, string | null>
  const roomType = (reservation.room_type ?? {}) as Record<string, string>

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

  const [arrivalTime, setArrivalTime] = useState(guestData.arrival_time ?? '')
  const [specialRequests, setSpecialRequests] = useState(guestData.special_requests ?? '')
  const [privacyConsent, setPrivacyConsent] = useState(false)

  function saveStep() {
    setError('')
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

        if (step === 3) {
          data.privacy_signed = privacyConsent
        }

        await updateCheckinData(token, data)

        if (step === 3 && privacyConsent) {
          await completeCheckin(token)
          setCompleted(true)
        } else {
          setStep((s) => Math.min(s + 1, 3))
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

  return (
    <div className="space-y-4">
      {/* Riepilogo prenotazione */}
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

      {/* Stepper */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i < step
                  ? 'bg-green-100 text-green-700'
                  : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 sm:w-10 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium text-gray-700">{STEPS[step]?.label}</p>

      {/* Form */}
      <Card>
        <CardContent className="space-y-4 py-5">
          {step === 0 && (
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

          {step === 1 && (
            <>
              <div>
                <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700">
                  Tipo documento
                </label>
                <select
                  id="doc_type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="id_card">Carta d'identità</option>
                  <option value="passport">Passaporto</option>
                  <option value="driving_license">Patente di guida</option>
                </select>
              </div>
              <Input label="Numero documento" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required />
              <Input label="Rilasciato da" value={documentIssuedBy} onChange={(e) => setDocumentIssuedBy(e.target.value)} />
              <Input label="Scadenza" type="date" value={documentExpiry} onChange={(e) => setDocumentExpiry(e.target.value)} />
            </>
          )}

          {step === 2 && (
            <>
              <Input
                label="Orario previsto di arrivo"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
              <div>
                <label htmlFor="requests" className="block text-sm font-medium text-gray-700">
                  Richieste speciali
                </label>
                <textarea
                  id="requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  placeholder="Allergie, esigenze particolari, orari..."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900">Riepilogo dati</p>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3">
                  <span className="text-gray-500">Nome</span>
                  <span>{firstName} {lastName}</span>
                  <span className="text-gray-500">Documento</span>
                  <span>{documentNumber || '—'}</span>
                  <span className="text-gray-500">Arrivo</span>
                  <span>{arrivalTime || 'Non specificato'}</span>
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
                  I dati saranno utilizzati esclusivamente per la registrazione presso la struttura e per gli adempimenti di legge.
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Navigazione */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0 || isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Indietro
        </Button>
        <Button
          onClick={saveStep}
          disabled={isPending || (step === 3 && !privacyConsent)}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === 3 ? 'Completa check-in' : 'Avanti'}
          {step < 3 && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
