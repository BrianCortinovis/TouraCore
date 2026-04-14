'use client'

import { useState, useTransition } from 'react'
import { Home, Bike, Loader2 } from 'lucide-react'
import { Button } from '@touracore/ui'
import { saveModulesAction } from './actions'

interface ModulesClientProps {
  tenantSlug: string
  hospitalityEnabled: boolean
  experiencesEnabled: boolean
}

export function ModulesClient({
  tenantSlug,
  hospitalityEnabled: initialHospitality,
  experiencesEnabled: initialExperiences,
}: ModulesClientProps) {
  const [hospitality, setHospitality] = useState(initialHospitality)
  const [experiences, setExperiences] = useState(initialExperiences)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const hasChanges =
    hospitality !== initialHospitality || experiences !== initialExperiences

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const result = await saveModulesAction({
        tenantSlug,
        hospitality,
        experiences,
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Moduli aggiornati' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore nel salvataggio' })
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Moduli attivi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Attiva o disattiva le aree operative del tuo account
        </p>
      </div>

      <div className="space-y-4">
        <ModuleToggle
          icon={<Home className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          title="Ospitalità"
          description="Gestisci strutture ricettive (case vacanze, hotel, B&B, agriturismi)."
          enabled={hospitality}
          onChange={setHospitality}
        />

        <ModuleToggle
          icon={<Bike className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          title="Attività"
          description="Noleggio bici, tour guidati, esperienze e attività outdoor."
          enabled={experiences}
          onChange={setExperiences}
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <Button onClick={handleSave} disabled={!hasChanges || isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salva modifiche
      </Button>
    </div>
  )
}

function ModuleToggle({
  icon,
  iconBg,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => onChange(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  )
}
