'use client'

import { useState, useTransition } from 'react'
import { Gift, CheckCircle2 } from 'lucide-react'
import { Button } from '@touracore/ui'
import { grantFreeOverrideAction, revokeOverrideAction } from './actions'

interface CatalogEntry {
  code: string
  label: string
  base_price_eur: number
  pausable: boolean
}

interface OverrideRow {
  id: string
  module_code: string
  override_type: string
  valid_until: string | null
  reason: string
}

interface SubscriptionItem {
  module_code: string
  unit_amount_eur: number
  status: string
}

interface BillingProfile {
  id: string
  module_code: string | null
  billing_model: string
  subscription_price_eur: number | null
  commission_percent: number | null
}

interface Props {
  tenantId: string
  tenantName: string
  tenantModules: Record<string, { active: boolean; source: string }>
  catalog: CatalogEntry[]
  overrides: OverrideRow[]
  subscriptionItems: SubscriptionItem[]
  profiles: BillingProfile[]
}

export default function TenantBillingClient({
  tenantId,
  tenantName,
  tenantModules,
  catalog,
  overrides,
  subscriptionItems: _subscriptionItems,
  profiles,
}: Props) {
  const [grantingCode, setGrantingCode] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleGrant(moduleCode: string) {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Motivo obbligatorio per grant override.' })
      return
    }
    setMessage(null)
    startTransition(async () => {
      const result = await grantFreeOverrideAction({
        tenantId,
        moduleCode,
        reason: reason.trim(),
        validUntil: validUntil || null,
      })
      if (result.success) {
        setMessage({ type: 'success', text: `Free override attivato per ${moduleCode}` })
        setGrantingCode(null)
        setReason('')
        setValidUntil('')
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore' })
      }
    })
  }

  function handleRevoke(overrideId: string) {
    const rev = prompt('Motivo della revoca:')
    if (!rev) return
    startTransition(async () => {
      const result = await revokeOverrideAction({ overrideId, reason: rev })
      if (result.success) {
        setMessage({ type: 'success', text: 'Override revocato' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Moduli e override</h3>
          <p className="mt-1 text-xs text-gray-500">
            Stato moduli di <strong>{tenantName}</strong>. Puoi concedere un free override per
            azzerare il costo di un modulo.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {catalog.map((m) => {
            const state = tenantModules[m.code]
            const active = state?.active === true
            const override = overrides.find((o) => o.module_code === m.code)
            const profile = profiles.find((p) => p.module_code === m.code)
            const isGranting = grantingCode === m.code

            return (
              <div key={m.code} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{m.label}</span>
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Attivo
                        </span>
                      )}
                      {override?.override_type === 'free' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Gift className="h-3 w-3" />
                          Gratis
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Prezzo base: €{Number(m.base_price_eur).toFixed(2)}/mese
                      {profile && (
                        <>
                          {' · '}
                          Profilo: {profile.billing_model}
                          {profile.subscription_price_eur != null &&
                            ` €${Number(profile.subscription_price_eur).toFixed(2)}`}
                          {profile.commission_percent != null &&
                            ` · ${profile.commission_percent}% commission`}
                        </>
                      )}
                    </div>
                    {override?.reason && (
                      <div className="mt-1 text-xs italic text-gray-500">
                        Motivo: {override.reason}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {override ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(override.id)}
                        disabled={isPending}
                      >
                        Revoca override
                      </Button>
                    ) : isGranting ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Motivo (obbligatorio)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          placeholder="Scadenza (opz.)"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleGrant(m.code)} disabled={isPending}>
                            Conferma
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setGrantingCode(null)
                              setReason('')
                              setValidUntil('')
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setGrantingCode(m.code)}>
                        Concedi gratis
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
