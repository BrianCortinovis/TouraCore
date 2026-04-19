'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Badge, Card, CardContent, Input } from '@touracore/ui'
import {
  Coins, Settings, FileText, Download, CheckCircle, AlertCircle,
  RefreshCw, ToggleLeft, ToggleRight, Save,
} from 'lucide-react'
import {
  loadTaxRatesAction,
  saveTaxRateAction,
  saveTaxSettingsAction,
  loadTaxSettingsAction,
  loadTaxRecordsAction,
  collectTaxAction,
  exportMonthlyReportAction,
} from './actions'

interface TaxRate {
  id: string
  entity_id: string
  category: string
  rate_per_person: number
  is_exempt: boolean
  is_active: boolean
}

interface TaxRecord {
  id: string
  tax_date: string
  nights: number
  guests_count: number
  rate_per_person: number
  total_amount: number
  is_exempt: boolean
  exemption_reason: string | null
  is_collected: boolean
  collected_at: string | null
  payment_method: string | null
  booking: { guest_name: string; check_in: string; check_out: string } | null
  guest: { first_name: string; last_name: string } | null
}

interface TaxSettings {
  tourist_tax_enabled: boolean
  tourist_tax_max_nights: number
  tourist_tax_municipality: string | null
  tourist_tax_payment_policy: 'online_only' | 'onsite_only' | 'guest_choice'
}

interface Summary {
  total_due: number
  total_collected: number
  total_exempt: number
  total_pending: number
  total_records: number
}

const CATEGORIES = [
  { key: 'adult', label: 'Adulti (18+)' },
  { key: 'teen_14_17', label: 'Ragazzi (14-17)' },
  { key: 'child_10_13', label: 'Bambini (10-13)' },
  { key: 'child_0_9', label: 'Bambini (0-9)' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Contanti' },
  { value: 'credit_card', label: 'Carta di credito' },
  { value: 'pos', label: 'POS' },
  { value: 'bank_transfer', label: 'Bonifico' },
]

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

export default function TouristTaxPage() {
  const now = new Date()
  const [tab, setTab] = useState<'records' | 'config'>('records')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<TaxRecord[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rates, setRates] = useState<Record<string, { rate: number; exempt: boolean }>>({})
  const [settings, setSettings] = useState<TaxSettings>({
    tourist_tax_enabled: false,
    tourist_tax_max_nights: 10,
    tourist_tax_municipality: null,
    tourist_tax_payment_policy: 'onsite_only',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadTaxRecordsAction(month, year)
      if (result.success && result.data) {
        setRecords(result.data.records as TaxRecord[])
        setSummary(result.data.summary as Summary)
      } else {
        setError(result.error ?? 'Errore caricamento')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  const loadConfig = useCallback(async () => {
    const [ratesResult, settingsResult] = await Promise.all([
      loadTaxRatesAction(),
      loadTaxSettingsAction(),
    ])
    if (ratesResult.success && ratesResult.data) {
      const rateMap: Record<string, { rate: number; exempt: boolean }> = {}
      for (const cat of CATEGORIES) {
        rateMap[cat.key] = { rate: 0, exempt: cat.key === 'child_0_9' }
      }
      for (const r of (ratesResult.data.rates as TaxRate[])) {
        rateMap[r.category] = { rate: Number(r.rate_per_person), exempt: r.is_exempt }
      }
      setRates(rateMap)
    }
    if (settingsResult.success && settingsResult.data) {
      const s = settingsResult.data.settings as TaxSettings
      setSettings({
        tourist_tax_enabled: s.tourist_tax_enabled ?? false,
        tourist_tax_max_nights: s.tourist_tax_max_nights ?? 10,
        tourist_tax_municipality: s.tourist_tax_municipality ?? null,
        tourist_tax_payment_policy: s.tourist_tax_payment_policy ?? 'onsite_only',
      })
    }
  }, [])

  useEffect(() => { void loadRecords() }, [loadRecords])
  useEffect(() => { void loadConfig() }, [loadConfig])

  const handleSaveConfig = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    const settingsResult = await saveTaxSettingsAction({
      tourist_tax_enabled: settings.tourist_tax_enabled,
      tourist_tax_max_nights: settings.tourist_tax_max_nights,
      tourist_tax_municipality: settings.tourist_tax_municipality ?? '',
      tourist_tax_payment_policy: settings.tourist_tax_payment_policy,
    })

    if (!settingsResult.success) {
      setError(settingsResult.error ?? 'Errore salvataggio')
      setSaving(false)
      return
    }

    for (const cat of CATEGORIES) {
      const r = rates[cat.key]
      if (!r) continue
      const result = await saveTaxRateAction({
        category: cat.key,
        rate_per_person: r.rate,
        is_exempt: r.exempt,
      })
      if (!result.success) {
        setError(result.error ?? 'Errore salvataggio tariffa')
        setSaving(false)
        return
      }
    }

    setSuccess('Configurazione salvata')
    setSaving(false)
  }

  const handleCollect = async (recordId: string, paymentMethod: string) => {
    const result = await collectTaxAction(recordId, paymentMethod)
    if (result.success) {
      void loadRecords()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  const handleExport = async () => {
    setError('')
    const result = await exportMonthlyReportAction(month, year)
    if (result.success && result.data) {
      const blob = new Blob([result.data.content as string], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.data.filename as string
      a.click()
      URL.revokeObjectURL(url)
    } else {
      setError(result.error ?? 'Errore export')
    }
  }

  const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="h-6 w-6" />
            Tassa di Soggiorno
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Imposta di soggiorno — D.Lgs. 23/2011 Art. 4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('records')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'records' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Registrazioni
          </button>
          <button
            onClick={() => setTab('config')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'config' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-1" />
            Configurazione
          </button>
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

      {/* Records tab */}
      {tab === 'records' && (
        <>
          {/* Month selector + summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
                min={2020}
                max={2030}
              />
              <Button variant="outline" size="sm" onClick={loadRecords} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {records.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Esporta report
                </Button>
              )}
            </div>
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_due)}</p>
                  <p className="text-xs text-gray-500 mt-1">Totale dovuto</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{fmt(summary.total_collected)}</p>
                  <p className="text-xs text-gray-500 mt-1">Riscosso</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{summary.total_pending}</p>
                  <p className="text-xs text-gray-500 mt-1">Da riscuotere</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-gray-500">{summary.total_exempt}</p>
                  <p className="text-xs text-gray-500 mt-1">Esenti</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Records list */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                Nessun record per {MONTHS[month - 1]} {year}
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg divide-y bg-white">
              {records.map((rec) => {
                const guestName = rec.guest
                  ? `${rec.guest.first_name} ${rec.guest.last_name}`
                  : rec.booking?.guest_name ?? '—'

                return (
                  <div key={rec.id} className="p-3 flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{guestName}</span>
                        {rec.is_exempt ? (
                          <Badge variant="secondary">Esente</Badge>
                        ) : rec.is_collected ? (
                          <Badge variant="default">Riscossa</Badge>
                        ) : (
                          <Badge variant="warning">Da riscuotere</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {rec.tax_date} — {rec.nights} notti × {rec.guests_count} ospiti × {fmt(Number(rec.rate_per_person))} = {fmt(Number(rec.total_amount))}
                      </p>
                      {rec.is_exempt && rec.exemption_reason && (
                        <p className="text-xs text-gray-400">{rec.exemption_reason}</p>
                      )}
                      {rec.is_collected && rec.payment_method && (
                        <p className="text-xs text-green-600">
                          Riscossa ({rec.payment_method})
                          {rec.collected_at && ` — ${new Date(rec.collected_at).toLocaleDateString('it-IT')}`}
                        </p>
                      )}
                    </div>
                    {!rec.is_exempt && !rec.is_collected && (
                      <div className="flex items-center gap-1 ml-2">
                        {PAYMENT_METHODS.map((pm) => (
                          <Button
                            key={pm.value}
                            variant="outline"
                            size="sm"
                            onClick={() => handleCollect(rec.id, pm.value)}
                            title={pm.label}
                            className="text-xs px-2"
                          >
                            {pm.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Config tab */}
      {tab === 'config' && (
        <div className="space-y-6">
          {/* Enable/disable + general settings */}
          <Card>
            <CardContent className="py-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Impostazioni generali</h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Tassa di soggiorno attiva</p>
                  <p className="text-xs text-gray-500">Abilita il calcolo automatico della tassa al check-in</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, tourist_tax_enabled: !s.tourist_tax_enabled }))}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {settings.tourist_tax_enabled ? (
                    <ToggleRight className="h-8 w-8 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comune
                  </label>
                  <Input
                    value={settings.tourist_tax_municipality ?? ''}
                    onChange={(e) => setSettings(s => ({ ...s, tourist_tax_municipality: e.target.value }))}
                    placeholder="es. Roma, Firenze, Milano..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notti max tassabili
                  </label>
                  <Input
                    type="number"
                    value={settings.tourist_tax_max_nights}
                    onChange={(e) => setSettings(s => ({ ...s, tourist_tax_max_nights: Number(e.target.value) }))}
                    min={1}
                    max={365}
                  />
                  <p className="text-xs text-gray-400 mt-1">Varia per comune (tipicamente 5-14)</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalità di pagamento tassa
                </label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {[
                    { val: 'onsite_only', label: 'Solo in struttura', desc: 'Ospite paga al check-in in loco' },
                    { val: 'online_only', label: 'Solo online', desc: 'Pagamento obbligatorio durante check-in online' },
                    { val: 'guest_choice', label: 'Ospite sceglie', desc: 'Ospite decide tra online o in struttura' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, tourist_tax_payment_policy: opt.val as TaxSettings['tourist_tax_payment_policy'] }))}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        settings.tourist_tax_payment_policy === opt.val
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Per pagamento online serve Stripe collegato alla struttura.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rate configuration */}
          <Card>
            <CardContent className="py-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Tariffe per categoria</h2>
              <p className="text-xs text-gray-500">
                Imposta la tariffa €/notte per ogni categoria di ospite secondo il regolamento comunale
              </p>

              <div className="space-y-3">
                {CATEGORIES.map((cat) => {
                  const r = rates[cat.key] ?? { rate: 0, exempt: false }
                  return (
                    <div key={cat.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-40">
                        <p className="font-medium text-sm">{cat.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.rate}
                          onChange={(e) => setRates(prev => ({
                            ...prev,
                            [cat.key]: { ...r, rate: Number(e.target.value) },
                          }))}
                          className="w-24"
                          disabled={r.exempt}
                        />
                        <span className="text-sm text-gray-500">/notte</span>
                      </div>
                      <label className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="checkbox"
                          checked={r.exempt}
                          onChange={(e) => setRates(prev => ({
                            ...prev,
                            [cat.key]: { ...r, exempt: e.target.checked },
                          }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600">Esente</span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Salvataggio...' : 'Salva configurazione'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
