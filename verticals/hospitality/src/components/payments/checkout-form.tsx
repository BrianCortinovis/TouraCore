'use client'

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@touracore/ui'
import { useState } from 'react'
import {
  CreditCard,
  Lock,
  CheckCircle2,
  XCircle,
  Shield,
  ArrowLeft,
} from 'lucide-react'

// ============================================================================
// Tipi
// ============================================================================

interface CheckoutFormProps {
  /** Importo in centesimi (es. 15000 = 150.00 EUR) */
  amount: number
  /** Valuta (default: EUR) */
  currency?: string
  /** Descrizione del pagamento */
  description?: string
  /** Nome dell'ospite */
  guestName?: string
  /** Numero della prenotazione */
  reservationNumber?: string
  /** Callback al completamento del pagamento */
  onPaymentComplete?: (paymentIntentId: string) => void
  /** Callback alla cancellazione */
  onCancel?: () => void
  /** Client secret di Stripe (quando disponibile) */
  clientSecret?: string
}

type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'error'

// ============================================================================
// Componente
// ============================================================================

export function CheckoutForm({
  amount,
  currency = 'eur',
  description,
  guestName,
  reservationNumber,
  onCancel,
  clientSecret,
}: CheckoutFormProps) {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Campi carta (placeholder - in produzione Stripe Elements gestisce questo)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState(guestName || '')

  function formatAmount(cents: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  function formatCardNumber(value: string): string {
    const cleaned = value.replace(/\D/g, '').slice(0, 16)
    return cleaned.replace(/(\d{4})/g, '$1 ').trim()
  }

  function formatExpiry(value: string): string {
    const cleaned = value.replace(/\D/g, '').slice(0, 4)
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2)
    }
    return cleaned
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validazione base
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      setErrorMessage('Compila tutti i campi della carta')
      setStatus('error')
      return
    }

    setStatus('processing')
    setErrorMessage('')

    try {
      if (!clientSecret) {
        throw new Error('Pagamento con carta non configurato. Configura Stripe prima di usare questo form.')
      }

      throw new Error('Il form carta richiede Stripe Elements lato client ed e disabilitato finche non viene integrato correttamente.')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Si e verificato un errore. Riprova.'
      )
    }
  }

  // ============================================================================
  // Stato: Pagamento completato
  // ============================================================================

  if (status === 'succeeded') {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Pagamento completato</h3>
          <p className="mt-2 text-sm text-gray-500">
            Il pagamento di <strong>{formatAmount(amount)}</strong> e stato processato con successo.
          </p>
          {reservationNumber && (
            <p className="mt-1 text-sm text-gray-500">
              Prenotazione: <strong>{reservationNumber}</strong>
            </p>
          )}
          <div className="mt-6 w-full rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">
              Riceverai una conferma via email con i dettagli del pagamento.
            </p>
          </div>
          {onCancel && (
            <Button variant="outline" className="mt-4" onClick={onCancel}>
              Chiudi
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // Form di pagamento
  // ============================================================================

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Pagamento
            </CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon-sm" onClick={onCancel} title="Annulla">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Riepilogo importo */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              {guestName && <p className="text-sm font-medium text-gray-900">{guestName}</p>}
              {reservationNumber && (
                <p className="text-xs text-gray-500">Prenotazione {reservationNumber}</p>
              )}
              {!guestName && !reservationNumber && description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatAmount(amount)}</p>
              <p className="text-xs text-gray-500">{currency.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Form carta */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome intestatario */}
          <div className="space-y-1">
            <label htmlFor="card-name" className="block text-sm font-medium text-gray-700">
              Intestatario carta
            </label>
            <input
              id="card-name"
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Mario Rossi"
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status === 'processing'}
            />
          </div>

          {/* Numero carta */}
          <div className="space-y-1">
            <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">
              Numero carta
            </label>
            <div className="relative">
              <input
                id="card-number"
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-12 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === 'processing'}
              />
              <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {/* Placeholder: in produzione qui va Stripe CardElement */}
            <p className="text-[10px] text-gray-400">
              Demo: usa 4242 4242 4242 4242 per simulare un pagamento
            </p>
          </div>

          {/* Scadenza e CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700">
                Scadenza
              </label>
              <input
                id="card-expiry"
                type="text"
                inputMode="numeric"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === 'processing'}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="card-cvc" className="block text-sm font-medium text-gray-700">
                CVC
              </label>
              <input
                id="card-cvc"
                type="text"
                inputMode="numeric"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === 'processing'}
              />
            </div>
          </div>

          {/* Errore */}
          {status === 'error' && errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Pulsante pagamento */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={status === 'processing'}
            disabled={status === 'processing'}
          >
            {status === 'processing' ? (
              'Elaborazione in corso...'
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Paga {formatAmount(amount)}
              </>
            )}
          </Button>

          {/* Badge sicurezza */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Pagamento sicuro tramite Stripe</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">VISA</div>
            <div className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">MASTERCARD</div>
            <div className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">AMEX</div>
            <div className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">BANCOMAT</div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
