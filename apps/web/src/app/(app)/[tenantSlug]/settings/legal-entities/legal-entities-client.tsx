'use client'

import { useState, useTransition } from 'react'
import { Check, Plus, Trash2, Edit3, Receipt, Building2, User, Briefcase, AlertTriangle } from 'lucide-react'
import {
  createLegalEntity,
  updateLegalEntity,
  deleteLegalEntity,
  assignEntityToLegalEntity,
  type CreateLegalEntityInput,
} from './actions'

interface LegalEntity {
  id: string
  type: 'private' | 'business' | 'occasionale'
  display_name: string
  fiscal_code: string
  vat_number: string | null
  company_name: string | null
  legal_form: string | null
  fiscal_regime: string | null
  sdi_recipient_code: string | null
  sdi_pec: string | null
  rt_device_serial: string | null
  rt_provider: string | null
  cin_code: string | null
  cin_region_code: string | null
  address_street: string | null
  address_city: string | null
  address_zip: string | null
  address_province: string | null
  iban: string | null
  is_default: boolean
  is_active: boolean
  stripe_connect_account_id: string | null
  stripe_connect_status: string | null
  occasionale_annual_limit_cents: number
  occasionale_ytd_revenue_cents: number
}

interface EntityLink {
  id: string
  name: string
  kind: string
  slug: string
  legal_entity_id: string | null
}

interface Props {
  tenantId: string
  tenantSlug: string
  legalEntities: LegalEntity[]
  linkedEntities: EntityLink[]
}

const TYPE_LABELS = {
  private: 'Privato (persona fisica)',
  business: 'Azienda P.IVA',
  occasionale: 'Occasionale (<€5k/anno)',
}

const TYPE_ICONS = {
  private: User,
  business: Briefcase,
  occasionale: Receipt,
}

const REGIMI_BY_TYPE: Record<string, Array<{ value: string; label: string; note: string }>> = {
  private: [
    { value: 'locazione_turistica_privata', label: 'Locazione turistica privata', note: 'no IVA, ricevuta non fiscale' },
    { value: 'cedolare_secca_21', label: 'Cedolare secca 21%', note: 'prima unità, locazione breve' },
    { value: 'cedolare_secca_26', label: 'Cedolare secca 26%', note: '>4 unità immobiliari' },
  ],
  business: [
    { value: 'ordinario', label: 'Regime ordinario', note: 'IVA 22%/10%/5%/0%' },
    { value: 'forfettario', label: 'Forfettario', note: '<€85k, no IVA, bollo €2 >€77.47' },
    { value: 'agricolo', label: 'Agricolo', note: 'agriturismo, regime speciale' },
    { value: 'regime_agevolato', label: 'Regime agevolato impresa turistica', note: '' },
  ],
  occasionale: [
    { value: 'prestazione_occasionale', label: 'Prestazione occasionale', note: 'max €5k/anno, ritenuta 20% se B2B' },
  ],
}

export function LegalEntitiesClient({ tenantId, tenantSlug, legalEntities, linkedEntities }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LegalEntity | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (!confirm('Eliminare soggetto fiscale? Solo se nessuna entità collegata.')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteLegalEntity(id, tenantSlug)
      if (!res.success) setError(res.error ?? 'Errore eliminazione')
    })
  }

  const assignToEntity = (entityId: string, legalEntityId: string) => {
    startTransition(async () => {
      const res = await assignEntityToLegalEntity(entityId, legalEntityId, tenantSlug)
      if (!res.success) setError(res.error ?? 'Errore assegnazione')
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Legal entities list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Cappelli fiscali ({legalEntities.length})</h2>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Nuovo soggetto
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {legalEntities.map((le) => {
            const Icon = TYPE_ICONS[le.type]
            const linked = linkedEntities.filter((e) => e.legal_entity_id === le.id)
            return (
              <div key={le.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-md p-2 ${
                      le.type === 'private' ? 'bg-purple-50 text-purple-600' :
                      le.type === 'business' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{le.display_name}</h3>
                      <p className="text-xs text-gray-500">{TYPE_LABELS[le.type]}</p>
                      {le.is_default && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                          <Check className="h-3 w-3" /> Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditing(le); setShowForm(true) }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Modifica"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(le.id)}
                      disabled={isPending || linked.length > 0}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      title={linked.length > 0 ? 'Ha entità collegate' : 'Elimina'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-gray-500">CF</dt>
                    <dd className="font-mono text-gray-900">{le.fiscal_code}</dd>
                  </div>
                  {le.vat_number && (
                    <div>
                      <dt className="text-gray-500">P.IVA</dt>
                      <dd className="font-mono text-gray-900">{le.vat_number}</dd>
                    </div>
                  )}
                  {le.fiscal_regime && (
                    <div className="col-span-2">
                      <dt className="text-gray-500">Regime</dt>
                      <dd className="text-gray-900">{le.fiscal_regime.replace(/_/g, ' ')}</dd>
                    </div>
                  )}
                  {le.cin_code && (
                    <div className="col-span-2">
                      <dt className="text-gray-500">CIN</dt>
                      <dd className="font-mono text-gray-900">{le.cin_code}</dd>
                    </div>
                  )}
                  {le.rt_device_serial && (
                    <div className="col-span-2">
                      <dt className="text-gray-500">RT {le.rt_provider}</dt>
                      <dd className="font-mono text-gray-900">{le.rt_device_serial}</dd>
                    </div>
                  )}
                  {le.type === 'occasionale' && (
                    <div className="col-span-2">
                      <dt className="text-gray-500">YTD €{(le.occasionale_ytd_revenue_cents / 100).toFixed(2)} / €{(le.occasionale_annual_limit_cents / 100).toFixed(0)}</dt>
                      <dd className="h-1.5 rounded bg-gray-100">
                        <div
                          className={`h-1.5 rounded ${
                            le.occasionale_ytd_revenue_cents >= le.occasionale_annual_limit_cents ? 'bg-red-500' :
                            le.occasionale_ytd_revenue_cents >= le.occasionale_annual_limit_cents * 0.8 ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (le.occasionale_ytd_revenue_cents / le.occasionale_annual_limit_cents) * 100)}%` }}
                        />
                      </dd>
                    </div>
                  )}
                </dl>

                {linked.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{linked.length} entità collegate</p>
                    <ul className="mt-1 space-y-0.5">
                      {linked.map((e) => (
                        <li key={e.id} className="text-xs text-gray-700">
                          <Building2 className="mr-1 inline h-3 w-3" /> {e.name} ({e.kind})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Assign entities matrix */}
      {legalEntities.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Assegna entità → soggetti</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Entità</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Soggetto fiscale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linkedEntities.map((e) => {
                  const allowedTypes = e.kind === 'accommodation' ? ['private','business','occasionale'] : ['business','occasionale']
                  const available = legalEntities.filter((le) => allowedTypes.includes(le.type))
                  return (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-gray-900">{e.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{e.kind}</td>
                      <td className="px-3 py-2">
                        <select
                          value={e.legal_entity_id ?? ''}
                          onChange={(ev) => assignToEntity(e.id, ev.target.value, )}
                          disabled={isPending}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {available.map((le) => (
                            <option key={le.id} value={le.id}>
                              {le.display_name} ({le.type})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Form dialog */}
      {showForm && (
        <LegalEntityForm
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onError={setError}
        />
      )}
    </div>
  )
}

function LegalEntityForm({
  tenantId,
  tenantSlug,
  existing,
  onClose,
  onError,
}: {
  tenantId: string
  tenantSlug: string
  existing: LegalEntity | null
  onClose: () => void
  onError: (e: string | null) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<'private' | 'business' | 'occasionale'>(existing?.type ?? 'business')
  const [regime, setRegime] = useState<string>(existing?.fiscal_regime ?? 'ordinario')

  const regimi: Array<{ value: string; label: string; note: string }> = REGIMI_BY_TYPE[type] ?? []

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onError(null)
    const fd = new FormData(e.currentTarget)
    const input: CreateLegalEntityInput = {
      tenantId,
      tenantSlug,
      type,
      displayName: String(fd.get('display_name') ?? ''),
      fiscalCode: String(fd.get('fiscal_code') ?? ''),
      vatNumber: type === 'private' ? null : String(fd.get('vat_number') ?? ''),
      companyName: String(fd.get('company_name') ?? ''),
      legalForm: String(fd.get('legal_form') ?? '') || null,
      fiscalRegime: regime,
      sdiRecipientCode: String(fd.get('sdi_recipient_code') ?? '') || null,
      sdiPec: String(fd.get('sdi_pec') ?? '') || null,
      rtDeviceSerial: String(fd.get('rt_device_serial') ?? '') || null,
      rtProvider: String(fd.get('rt_provider') ?? '') || null,
      cinCode: String(fd.get('cin_code') ?? '') || null,
      cinRegionCode: String(fd.get('cin_region_code') ?? '') || null,
      addressStreet: String(fd.get('address_street') ?? '') || null,
      addressCity: String(fd.get('address_city') ?? '') || null,
      addressZip: String(fd.get('address_zip') ?? '') || null,
      addressProvince: String(fd.get('address_province') ?? '') || null,
      iban: String(fd.get('iban') ?? '') || null,
      isDefault: fd.get('is_default') === 'on',
    }

    startTransition(async () => {
      const res = existing
        ? await updateLegalEntity({ ...input, id: existing.id })
        : await createLegalEntity(input)
      if (res.success) {
        onClose()
      } else {
        onError(res.error ?? 'Errore')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">{existing ? 'Modifica soggetto fiscale' : 'Nuovo soggetto fiscale'}</h2>

        <div className="mt-4 space-y-3">
          {/* Tipo + regime */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Tipo
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as 'private' | 'business' | 'occasionale'
                  setType(newType)
                  setRegime(REGIMI_BY_TYPE[newType]?.[0]?.value ?? '')
                }}
                disabled={!!existing}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              >
                <option value="business">Business (P.IVA)</option>
                <option value="private">Privato (no P.IVA, solo hospitality)</option>
                <option value="occasionale">Occasionale (max €5k/anno)</option>
              </select>
            </label>
            <label className="text-sm">
              Regime fiscale
              <select value={regime} onChange={(e) => setRegime(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5">
                {regimi.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {regimi.find((r) => r.value === regime)?.note && (
                <p className="mt-0.5 text-[10px] text-gray-500">{regimi.find((r) => r.value === regime)?.note}</p>
              )}
            </label>
          </div>

          <label className="block text-sm">
            Nome visualizzato *
            <input name="display_name" defaultValue={existing?.display_name} required className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Codice fiscale *
              <input name="fiscal_code" defaultValue={existing?.fiscal_code} required pattern="[A-Z0-9]{11,16}" className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono uppercase" />
            </label>
            {type !== 'private' && (
              <label className="text-sm">
                P.IVA {type === 'business' ? '*' : ''}
                <input name="vat_number" defaultValue={existing?.vat_number ?? ''} required={type === 'business'} pattern="[0-9]{11}" className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono" />
              </label>
            )}
          </div>

          {type === 'business' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Ragione sociale
                <input name="company_name" defaultValue={existing?.company_name ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
              </label>
              <label className="text-sm">
                Forma giuridica
                <select name="legal_form" defaultValue={existing?.legal_form ?? 'srl'} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5">
                  <option value="individual">Ditta individuale</option>
                  <option value="srl">SRL</option>
                  <option value="srls">SRLS</option>
                  <option value="snc">SNC</option>
                  <option value="sas">SAS</option>
                  <option value="spa">SPA</option>
                  <option value="cooperative">Cooperativa</option>
                  <option value="associazione">Associazione</option>
                </select>
              </label>
            </div>
          )}

          {/* SDI business */}
          {type === 'business' && (
            <fieldset className="rounded border border-gray-200 p-3">
              <legend className="px-1 text-xs font-semibold text-gray-600">Fatturazione elettronica SDI</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Codice destinatario
                  <input name="sdi_recipient_code" defaultValue={existing?.sdi_recipient_code ?? ''} maxLength={7} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono" placeholder="7 char" />
                </label>
                <label className="text-sm">
                  PEC (fallback)
                  <input name="sdi_pec" type="email" defaultValue={existing?.sdi_pec ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
                </label>
              </div>
            </fieldset>
          )}

          {/* RT device (solo business per ristorazione) */}
          {type === 'business' && (
            <fieldset className="rounded border border-gray-200 p-3">
              <legend className="px-1 text-xs font-semibold text-gray-600">Registratore Telematico (ristorazione)</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Matricola RT
                  <input name="rt_device_serial" defaultValue={existing?.rt_device_serial ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono" />
                </label>
                <label className="text-sm">
                  Provider
                  <select name="rt_provider" defaultValue={existing?.rt_provider ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5">
                    <option value="">—</option>
                    <option value="epson">Epson</option>
                    <option value="custom">Custom</option>
                    <option value="rchitalia">RCH Italia</option>
                    <option value="olivetti">Olivetti</option>
                    <option value="other">Altro</option>
                  </select>
                </label>
              </div>
            </fieldset>
          )}

          {/* CIN privato hospitality */}
          {type === 'private' && (
            <fieldset className="rounded border border-gray-200 p-3">
              <legend className="px-1 text-xs font-semibold text-gray-600">CIN (locazione turistica)</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Codice CIN
                  <input name="cin_code" defaultValue={existing?.cin_code ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono" placeholder="IT..." />
                </label>
                <label className="text-sm">
                  Regione
                  <input name="cin_region_code" defaultValue={existing?.cin_region_code ?? ''} maxLength={3} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono uppercase" placeholder="LOM, VEN..." />
                </label>
              </div>
            </fieldset>
          )}

          {/* Indirizzo */}
          <fieldset className="rounded border border-gray-200 p-3">
            <legend className="px-1 text-xs font-semibold text-gray-600">Indirizzo sede fiscale</legend>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 text-sm">
                Via
                <input name="address_street" defaultValue={existing?.address_street ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
              </label>
              <label className="text-sm">
                CAP
                <input name="address_zip" defaultValue={existing?.address_zip ?? ''} maxLength={5} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono" />
              </label>
              <label className="col-span-2 text-sm">
                Città
                <input name="address_city" defaultValue={existing?.address_city ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
              </label>
              <label className="text-sm">
                Provincia
                <input name="address_province" defaultValue={existing?.address_province ?? ''} maxLength={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono uppercase" />
              </label>
            </div>
          </fieldset>

          <label className="block text-sm">
            IBAN (payout)
            <input name="iban" defaultValue={existing?.iban ?? ''} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono uppercase" placeholder="IT60..." />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_default" defaultChecked={existing?.is_default} />
            Soggetto fiscale predefinito
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={isPending} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isPending ? 'Salvataggio...' : existing ? 'Salva modifiche' : 'Crea soggetto'}
          </button>
        </div>
      </form>
    </div>
  )
}
