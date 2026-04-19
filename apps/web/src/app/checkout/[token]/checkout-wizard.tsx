'use client'

import { useState, useRef, useTransition } from 'react'
import { Button, Card, CardContent } from '@touracore/ui'
import { Star, Camera, AlertTriangle, PenTool, CheckCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { uploadCheckoutPhotoAction, completeCheckoutAction } from './actions'

interface Props {
  token: string
  booking: Record<string, unknown>
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function CheckoutWizard({ token, booking }: Props) {
  const guest = (booking.guest ?? {}) as { first_name?: string; last_name?: string }
  const roomType = (booking.room_type ?? {}) as { name?: string }
  const checkIn = booking.check_in as string | undefined
  const checkOut = booking.check_out as string | undefined

  const STEPS = [
    { key: 'feedback', label: 'Valutazione' },
    { key: 'damage', label: 'Stato camera' },
    { key: 'signature', label: 'Firma' },
  ]

  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const [damageReported, setDamageReported] = useState(false)
  const [damageDescription, setDamageDescription] = useState('')
  const [photoCount, setPhotoCount] = useState(0)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const signatureRef = useRef<HTMLCanvasElement | null>(null)
  const [signatureEmpty, setSignatureEmpty] = useState(true)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande (max 5 MB)')
      return
    }
    setError('')
    setUploadingPhoto(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await uploadCheckoutPhotoAction({ token, mimeType: file.type, base64 })
      if (!res.ok) setError(`Upload fallito: ${res.error}`)
      else setPhotoCount((n) => n + 1)
    } catch {
      setError('Errore durante upload')
    } finally {
      setUploadingPhoto(false)
    }
    e.target.value = ''
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = signatureRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return
    const canvas = signatureRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    if (signatureEmpty) setSignatureEmpty(false)
  }

  function clearSignature() {
    const canvas = signatureRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
  }

  function finalSubmit() {
    if (signatureEmpty || !signatureRef.current) {
      setError('La firma è obbligatoria.')
      return
    }
    const dataUrl = signatureRef.current.toDataURL('image/png')
    setError('')
    startTransition(async () => {
      const res = await completeCheckoutAction({
        token,
        rating,
        comment: comment || null,
        damageReported,
        damageDescription: damageReported ? damageDescription : null,
        signatureDataUrl: dataUrl,
      })
      if (!res.ok) setError(`Errore: ${res.error}`)
      else setCompleted(true)
    })
  }

  function nextStep() {
    setError('')
    const key = STEPS[step]?.key
    if (key === 'feedback' && rating === 0) {
      setError('Assegna una valutazione da 1 a 5 stelle.')
      return
    }
    if (key === 'damage' && damageReported && damageDescription.trim().length < 5) {
      setError('Descrivi cosa è stato danneggiato.')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  if (completed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="text-lg font-bold text-gray-900">Check-out completato!</h2>
          <p className="mt-2 text-sm text-gray-500">Grazie per il tuo soggiorno. A presto!</p>
        </CardContent>
      </Card>
    )
  }

  const currentKey = STEPS[step]?.key
  const lastIdx = STEPS.length - 1

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3">
          <p className="text-sm font-medium">{guest.first_name} {guest.last_name}</p>
          <p className="text-xs text-gray-500">
            {roomType.name ?? 'Camera'} · {checkIn ? new Date(checkIn).toLocaleDateString('it-IT') : '—'} →{' '}
            {checkOut ? new Date(checkOut).toLocaleDateString('it-IT') : '—'}
          </p>
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
            {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium text-gray-700">{STEPS[step]?.label}</p>

      <Card>
        <CardContent className="space-y-4 py-5">
          {currentKey === 'feedback' && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-gray-600">Com&apos;è stato il tuo soggiorno?</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1"
                    aria-label={`${n} stelle`}
                  >
                    <Star
                      className={`h-8 w-8 ${rating >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Commenti (opzionale)"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          )}

          {currentKey === 'damage' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  id="damage-check"
                  type="checkbox"
                  checked={damageReported}
                  onChange={(e) => setDamageReported(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <label htmlFor="damage-check" className="text-sm">
                  <span className="font-medium text-gray-900">Segnalare danni o problemi</span>
                  <p className="text-xs text-gray-500 mt-0.5">Seleziona solo se hai notato danni nella camera.</p>
                </label>
              </div>

              {damageReported && (
                <>
                  <textarea
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    rows={3}
                    placeholder="Descrivi i danni o problemi riscontrati…"
                    className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                  />
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border-2 border-dashed border-gray-300 p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {uploadingPhoto ? (
                        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                      ) : (
                        <Camera className="h-6 w-6 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {photoCount > 0 ? `${photoCount} foto caricate` : 'Aggiungi foto danni'}
                        </p>
                        <p className="text-xs text-gray-500">Tocca per scattare o caricare (max 5 MB)</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </>
              )}

              {!damageReported && (
                <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">
                  ✓ Nessun danno segnalato. Passa allo step successivo.
                </p>
              )}
            </div>
          )}

          {currentKey === 'signature' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Firma per confermare il check-out e accettare eventuali addebiti aggiuntivi in caso di danni.
              </p>
              <div className="rounded-lg border-2 border-gray-300 bg-white">
                <canvas
                  ref={signatureRef}
                  width={400}
                  height={150}
                  onPointerDown={startDraw}
                  onPointerMove={draw}
                  className="h-[150px] w-full touch-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <button type="button" onClick={clearSignature} className="text-xs text-slate-500 hover:text-slate-700">
                  Cancella firma
                </button>
                <PenTool className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded bg-red-50 p-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0 || isPending}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Indietro
        </Button>
        {step < lastIdx ? (
          <Button onClick={nextStep}>
            Avanti
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finalSubmit} disabled={isPending || signatureEmpty}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Completa check-out
          </Button>
        )}
      </div>
    </div>
  )
}
