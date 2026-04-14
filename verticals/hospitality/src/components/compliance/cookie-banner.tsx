'use client'

import { useState, useEffect } from 'react'
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_CONSENT_KEY = 'gest_cookie_consent'

export function CookieBanner({ orgSlug }: { orgSlug: string }) {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) {
      setVisible(true)
    }
  }, [])

  const saveConsent = async (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs))
    setVisible(false)
    try {
      await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: prefs,
          org_slug: orgSlug,
        }),
      })
    } catch {
      // Consent saved locally even if API fails
    }
  }

  const acceptAll = () => saveConsent({ necessary: true, analytics: true, marketing: true })
  const rejectAll = () => saveConsent({ necessary: true, analytics: false, marketing: false })
  const saveCustom = () => saveConsent(preferences)

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Gestione consenso cookie"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">
              Questo sito utilizza i cookie
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Utilizziamo cookie tecnici necessari per il funzionamento del sito e, con il tuo
              consenso, cookie di analisi e marketing. Puoi accettare tutti i cookie, rifiutare
              quelli non necessari, oppure personalizzare le tue preferenze.{' '}
              <a
                href={`/book/${orgSlug}/cookies`}
                className="text-blue-600 underline hover:text-blue-800"
              >
                Cookie Policy
              </a>
            </p>

            {/* Expandable details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
              aria-expanded={showDetails}
            >
              Personalizza preferenze
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {/* Necessary - always on */}
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                    aria-describedby="necessary-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Cookie tecnici necessari
                    </span>
                    <p id="necessary-desc" className="text-xs text-gray-500">
                      Indispensabili per il funzionamento del sito. Non possono essere disattivati.
                      Includono autenticazione e sicurezza.
                    </p>
                  </div>
                </label>

                {/* Analytics */}
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, analytics: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    aria-describedby="analytics-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Cookie analitici</span>
                    <p id="analytics-desc" className="text-xs text-gray-500">
                      Ci aiutano a capire come utilizzi il sito per migliorare l&apos;esperienza di
                      navigazione. I dati sono aggregati e anonimi.
                    </p>
                  </div>
                </label>

                {/* Marketing */}
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, marketing: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    aria-describedby="marketing-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Cookie di marketing
                    </span>
                    <p id="marketing-desc" className="text-xs text-gray-500">
                      Utilizzati per mostrare contenuti e offerte personalizzate. Possono essere
                      condivisi con servizi di terze parti (es. Stripe per pagamenti sicuri).
                    </p>
                  </div>
                </label>

                <button
                  onClick={saveCustom}
                  className="mt-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Salva preferenze
                </button>
              </div>
            )}

            {/* Main action buttons */}
            {!showDetails && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={acceptAll}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Accetta tutti
                </button>
                <button
                  onClick={rejectAll}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Rifiuta non necessari
                </button>
              </div>
            )}
          </div>
          <button
            onClick={rejectAll}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
            aria-label="Chiudi banner cookie"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
