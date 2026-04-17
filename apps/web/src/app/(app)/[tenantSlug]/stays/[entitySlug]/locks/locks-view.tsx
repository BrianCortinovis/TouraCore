'use client'

import { useState, useTransition } from 'react'
import { Plus, Battery, KeyRound, X, Wifi } from 'lucide-react'
import { createSmartLock, issueLockAccessCode, revokeLockAccessCode } from './actions'

interface Lock {
  id: string
  roomId: string | null
  provider: string
  deviceId: string
  deviceName: string
  accessMethod: string
  batteryLevel: number | null
  lastSeenAt: string | null
}

interface Code {
  id: string
  lockId: string
  reservationId: string | null
  pinCode: string | null
  validFrom: string
  validTo: string
  status: string
}

interface Props {
  tenantSlug: string
  entitySlug: string
  entityId: string
  locks: Lock[]
  codes: Code[]
}

export function LocksView({ tenantSlug, entitySlug, entityId, locks, codes }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [issuePinFor, setIssuePinFor] = useState<Lock | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-600">{locks.length} dispositivi</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4"/> Nuovo dispositivo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {locks.length === 0 ? (
          <p className="col-span-2 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
            Nessun smart lock configurato
          </p>
        ) : locks.map((l) => {
          const lockCodes = codes.filter((c) => c.lockId === l.id)
          return (
            <div key={l.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-blue-50 p-2">
                    <KeyRound className="h-5 w-5 text-blue-600"/>
                  </div>
                  <div>
                    <h3 className="font-medium">{l.deviceName}</h3>
                    <p className="text-xs text-gray-500">{l.provider} · {l.deviceId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {l.batteryLevel !== null && (
                    <span className="flex items-center gap-1">
                      <Battery className="h-3 w-3"/> {l.batteryLevel}%
                    </span>
                  )}
                  {l.lastSeenAt && (
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3"/> {new Date(l.lastSeenAt).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600">PIN attivi: {lockCodes.length}</p>
                  <button onClick={() => setIssuePinFor(l)}
                    className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    + PIN
                  </button>
                </div>
                {lockCodes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {lockCodes.slice(0, 3).map((c) => (
                      <li key={c.id} className="flex items-center justify-between">
                        <span className="font-mono">{c.pinCode ?? '****'}</span>
                        <span className="text-gray-500">
                          {c.validFrom.slice(0, 10)} → {c.validTo.slice(0, 10)}
                        </span>
                        <button onClick={() =>
                          startTransition(async () => { await revokeLockAccessCode(c.id, tenantSlug, entitySlug) })
                        } className="text-red-600 hover:text-red-700"><X className="h-3 w-3"/></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <AddLockDialog entityId={entityId} tenantSlug={tenantSlug} entitySlug={entitySlug} onClose={() => setShowAdd(false)}/>
      )}
      {issuePinFor && (
        <IssuePinDialog lock={issuePinFor} tenantSlug={tenantSlug} entitySlug={entitySlug} onClose={() => setIssuePinFor(null)}/>
      )}
    </>
  )
}

function AddLockDialog(props: { entityId: string; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    provider: 'nuki' as 'nuki'|'ttlock'|'igloohome'|'keynest'|'manual',
    deviceId: '',
    deviceName: '',
    accessMethod: 'pin' as 'pin'|'app'|'keycard',
    apiKey: '',
    apiSecret: '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createSmartLock({
        entityId: props.entityId,
        tenantSlug: props.tenantSlug,
        entitySlug: props.entitySlug,
        provider: form.provider,
        deviceId: form.deviceId,
        deviceName: form.deviceName,
        accessMethod: form.accessMethod,
        config: { apiKey: form.apiKey, apiSecret: form.apiSecret, smartlockId: form.deviceId },
      })
      props.onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuovo smart lock</h2>
        <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as 'nuki' })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="nuki">Nuki</option>
          <option value="ttlock">TTLock</option>
          <option value="igloohome">Igloohome</option>
          <option value="keynest">KeyNest</option>
          <option value="manual">Manuale (no API)</option>
        </select>
        <input required placeholder="Device ID / Smart Lock ID" value={form.deviceId}
          onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input required placeholder="Nome (es. Camera 101)" value={form.deviceName}
          onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input placeholder="API Key (opt)" type="password" value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        {form.provider === 'ttlock' && (
          <input placeholder="API Secret (TTLock)" type="password" value={form.apiSecret}
            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        )}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Salva'}</button>
        </div>
      </form>
    </div>
  )
}

function IssuePinDialog(props: { lock: Lock; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [pin, setPin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    validFrom: new Date().toISOString().slice(0, 16),
    validTo: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 16),
    guestName: '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setPin(null)
    startTransition(async () => {
      const result = await issueLockAccessCode({
        lockId: props.lock.id,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        guestName: form.guestName || undefined,
        tenantSlug: props.tenantSlug,
        entitySlug: props.entitySlug,
      })
      if (result.ok) setPin(result.pinCode ?? null)
      else setError(result.error ?? 'Errore')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuovo PIN per {props.lock.deviceName}</h2>
        <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input type="datetime-local" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input placeholder="Nome ospite (opt)" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        {pin && (
          <div className="rounded border border-green-300 bg-green-50 p-3 text-center">
            <p className="text-xs text-green-700">PIN creato</p>
            <p className="font-mono text-3xl font-bold tracking-widest text-green-900">{pin}</p>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Chiudi</button>
          {!pin && <button type="submit" disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Genero…' : 'Genera PIN'}</button>}
        </div>
      </form>
    </div>
  )
}
