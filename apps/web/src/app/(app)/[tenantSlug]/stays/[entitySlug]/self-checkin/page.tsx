'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardContent, Badge, Input, cn } from '@touracore/ui'
import {
  Smartphone, QrCode, Copy, CheckCircle, RefreshCw,
  Globe, Clock, Settings, ToggleLeft, ToggleRight, X,
} from 'lucide-react'

export default function SelfCheckinPage() {
  const [enabled, setEnabled] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const parts = path.split('/')
      const tenantSlug = parts[2] ?? ''
      const entitySlug = parts[4] ?? ''
      setBaseUrl(`${window.location.origin}/checkin/${tenantSlug}/${entitySlug}`)
    }
  }, [])

  const copyLink = useCallback(() => {
    if (!baseUrl) return
    navigator.clipboard.writeText(baseUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [baseUrl])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Smartphone className="h-6 w-6" />
            Self Check-in
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Permetti agli ospiti di fare il check-in online prima dell'arrivo
          </p>
        </div>
      </div>

      {/* Activation card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurazione
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Abilita il self check-in per consentire agli ospiti di registrarsi online
              </p>
            </div>
            <button onClick={() => setEnabled(!enabled)}>
              {enabled
                ? <ToggleRight className="h-8 w-8 text-green-600" />
                : <ToggleLeft className="h-8 w-8 text-gray-400" />
              }
            </button>
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <>
          {/* QR Code + Link */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="py-6 text-center">
                <h3 className="mb-4 text-sm font-medium text-gray-700">Codice QR</h3>
                <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="text-center">
                    <QrCode className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                    <p className="text-xs text-gray-400">
                      QR Code generato automaticamente
                    </p>
                    <p className="mt-1 text-xs text-gray-500 font-medium">
                      Stampa e posiziona nella reception
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-400 max-w-[280px] mx-auto">
                  Gli ospiti scannerizzano il QR con il telefono per accedere al form di check-in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Link diretto</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border bg-gray-50 px-3 py-2 text-sm font-mono text-gray-600">
                    {baseUrl || 'Caricamento...'}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Condividi questo link via email nella comunicazione pre-arrivo
                </p>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Cosa vede l'ospite</h4>
                  <div className="space-y-2">
                    {[
                      { icon: Globe, text: 'Form multilingua (IT/EN/DE/FR)' },
                      { icon: Smartphone, text: 'Dati anagrafici, documento, firma' },
                      { icon: Clock, text: 'Orario previsto di arrivo' },
                      { icon: CheckCircle, text: 'Consenso privacy e condizioni' },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-2 text-sm text-gray-600">
                        <item.icon className="h-4 w-4 text-gray-400" />
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="py-5 text-center">
                <Clock className="mx-auto mb-2 h-6 w-6 text-blue-500" />
                <p className="text-sm font-medium text-gray-900">Risparmio tempo</p>
                <p className="mt-1 text-xs text-gray-500">
                  Check-in in 2 minuti invece di 15 alla reception
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-500" />
                <p className="text-sm font-medium text-gray-900">Compliance automatica</p>
                <p className="mt-1 text-xs text-gray-500">
                  Dati per Alloggiati Web e ISTAT raccolti digitalmente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <Smartphone className="mx-auto mb-2 h-6 w-6 text-purple-500" />
                <p className="text-sm font-medium text-gray-900">Mobile-first</p>
                <p className="mt-1 text-xs text-gray-500">
                  Ottimizzato per smartphone, nessuna app da scaricare
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!enabled && (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Self check-in disabilitato</p>
            <p className="mt-1 text-xs text-gray-400">Attiva la funzionalità per generare il QR code e il link per gli ospiti</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
