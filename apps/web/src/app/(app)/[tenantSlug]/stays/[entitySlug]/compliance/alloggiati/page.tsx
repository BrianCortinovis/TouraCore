'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Badge, Card, CardContent, Input } from '@touracore/ui'
import {
  Shield, FileText, Download, CheckCircle, AlertCircle,
  Send, RefreshCw, Users,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  loadPendingBookingsAction,
  loadRegistrationsAction,
  generateAlloggiatiAction,
  markSentAction,
  downloadAlloggiatiFileAction,
} from './actions'

interface PendingBooking {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
  guests: {
    first_name: string
    last_name: string
    document_type: string | null
    document_number: string | null
    date_of_birth: string | null
    birth_country: string | null
    citizenship: string | null
    birth_place: string | null
  } | null
}

interface Registration {
  id: string
  first_name: string
  last_name: string
  document_type: string
  document_number: string
  alloggiati_status: string
  registration_date: string
  sent_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  generated: 'default',
  sent: 'success',
  confirmed: 'success',
  error: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  generated: 'Generata',
  sent: 'Inviata',
  confirmed: 'Confermata',
  error: 'Errore',
}

export default function AlloggiatiPage() {
  const [pending, setPending] = useState<PendingBooking[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pendResult, regResult] = await Promise.all([
        loadPendingBookingsAction(),
        loadRegistrationsAction(selectedDate),
      ])
      if (pendResult.success && pendResult.data) {
        setPending((pendResult.data.bookings ?? []) as PendingBooking[])
      }
      if (regResult.success && regResult.data) {
        setRegistrations((regResult.data.registrations ?? []) as Registration[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { void loadData() }, [loadData])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pending.map(b => b.id)))
    }
  }

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return
    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const result = await generateAlloggiatiAction(Array.from(selectedIds))
      if (result.success && result.data) {
        const gen = result.data.generated as number
        const skipped = (result.data.skipped ?? []) as Array<{ booking_id: string; reason: string }>
        setSuccess(`${gen} schedine generate.${skipped.length > 0 ? ` ${skipped.length} saltate.` : ''}`)
        setSelectedIds(new Set())
        void loadData()
      } else {
        setError(result.error ?? 'Errore generazione')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore generazione')
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkSent = async (id: string) => {
    const result = await markSentAction(id)
    if (result.success) {
      void loadData()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  const handleDownload = async () => {
    setError('')
    const result = await downloadAlloggiatiFileAction(selectedDate)
    if (result.success && result.data) {
      const content = result.data.content as string
      const filename = result.data.filename as string
      const blob = new Blob([content], { type: 'text/plain;charset=iso-8859-1' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } else {
      setError(result.error ?? 'Errore download')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Alloggiati Web
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registrazione ospiti per la Questura — Art. 109 TULPS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Prenotazioni senza registrazione */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Registrazioni mancanti
              <Badge variant="warning">{pending.length}</Badge>
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === pending.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={selectedIds.size === 0 || generating}
              >
                <FileText className="h-4 w-4 mr-1" />
                {generating ? 'Generazione...' : `Genera schedine (${selectedIds.size})`}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg divide-y bg-white">
            {pending.map((booking) => {
              const guest = booking.guests
              const missingFields: string[] = []
              if (!guest?.date_of_birth) missingFields.push('data nascita')
              if (!guest?.birth_country) missingFields.push('stato nascita')
              if (!guest?.citizenship) missingFields.push('cittadinanza')
              if (!guest?.document_type) missingFields.push('tipo documento')
              if (!guest?.document_number) missingFields.push('n. documento')
              if (!guest?.birth_place) missingFields.push('luogo nascita')
              const isComplete = missingFields.length === 0

              return (
                <div key={booking.id} className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(booking.id)}
                    onChange={() => toggleSelect(booking.id)}
                    disabled={!isComplete}
                    className="rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{booking.guest_name}</span>
                      <Badge variant={isComplete ? 'default' : 'destructive'}>
                        {isComplete ? 'Completa' : 'Incompleta'}
                      </Badge>
                    </div>
                    {!isComplete && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Mancano: {missingFields.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {booking.check_in} → {booking.check_out}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Registrazioni generate */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Schedine generate
            <Badge variant="secondary">{registrations.length}</Badge>
          </h2>
          {registrations.some(r => r.alloggiati_status === 'generated') && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Scarica TXT
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Caricamento...</div>
        ) : registrations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              Nessuna schedina per questa data
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg divide-y bg-white">
            {registrations.map((reg) => (
              <div key={reg.id} className="p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {reg.last_name} {reg.first_name}
                    </span>
                    <Badge variant={STATUS_COLORS[reg.alloggiati_status] as 'warning' | 'success' | 'destructive' | 'default' | 'secondary'}>
                      {STATUS_LABELS[reg.alloggiati_status] ?? reg.alloggiati_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {reg.document_type} {reg.document_number}
                    {reg.sent_at && (
                      <> — Inviata il {format(new Date(reg.sent_at), 'dd/MM/yyyy HH:mm')}</>
                    )}
                  </p>
                </div>
                {reg.alloggiati_status === 'generated' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkSent(reg.id)}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Segna inviata
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
