'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, DataTable, Input, Modal, Select } from '@touracore/ui'
import { Calendar, Loader2, Percent, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import { WeekdaySelector } from '@touracore/hospitality/src/components/rates'
import type { PricingRuleType, PriceSuggestion, PricingRule } from '@touracore/hospitality/src/types/database'
import {
  acceptPriceSuggestionAction,
  deletePricingRuleAction,
  loadRevenueDashboardAction,
  recalculateRevenueSuggestionsAction,
  refreshRevenueSnapshotAction,
  rejectPriceSuggestionAction,
  savePricingRuleAction,
  togglePricingRuleAction,
  type RevenueDashboardData,
} from './actions'

const RULE_TYPES: Array<{ value: PricingRuleType; label: string }> = [
  { value: 'occupancy_based', label: 'Occupazione' },
  { value: 'demand_surge', label: 'Picco domanda' },
  { value: 'day_of_week', label: 'Giorno settimana' },
  { value: 'advance_booking', label: 'Anticipo prenotazione' },
  { value: 'last_minute', label: 'Last minute' },
  { value: 'length_of_stay', label: 'Durata soggiorno' },
]

const ADJUSTMENT_TYPES = [
  { value: 'percentage', label: 'Percentuale' },
  { value: 'fixed', label: 'Importo fisso' },
]

type AdjustmentType = 'percentage' | 'fixed'

interface RevenueRuleForm {
  id?: string
  name: string
  rule_type: PricingRuleType
  adjustment_type: AdjustmentType
  adjustment_value: string
  priority: string
  is_active: boolean
  room_type_id: string
  rate_plan_id: string
  valid_from: string
  valid_to: string
  min_occupancy: string
  max_occupancy: string
  occupancy_threshold: string
  min_days_advance: string
  max_days_advance: string
  within_days: string
  min_nights: string
  days: number[]
}

const emptyForm: RevenueRuleForm = {
  name: '',
  rule_type: 'occupancy_based',
  adjustment_type: 'percentage',
  adjustment_value: '10',
  priority: '0',
  is_active: true,
  room_type_id: '',
  rate_plan_id: '',
  valid_from: '',
  valid_to: '',
  min_occupancy: '70',
  max_occupancy: '100',
  occupancy_threshold: '85',
  min_days_advance: '0',
  max_days_advance: '365',
  within_days: '3',
  min_nights: '3',
  days: [],
}

function formatMoney(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function ruleAdjustmentLabel(rule: PricingRule) {
  return rule.adjustment_type === 'percentage'
    ? `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_value}%`
    : `${rule.adjustment_value > 0 ? '+' : ''}${formatMoney(rule.adjustment_value)}`
}

function getConditionsSummary(rule: PricingRule) {
  const conditions = rule.conditions as Record<string, unknown>

  switch (rule.rule_type) {
    case 'occupancy_based':
      return `Occupazione ${String(conditions.min_occupancy ?? 0)}-${String(conditions.max_occupancy ?? 100)}%`
    case 'demand_surge':
      return `Soglia ${String(conditions.occupancy_threshold ?? 85)}%`
    case 'day_of_week':
      return `Giorni ${Array.isArray(conditions.days) ? conditions.days.length : 0}`
    case 'advance_booking':
      return `Anticipo ${String(conditions.min_days_advance ?? 0)}-${String(conditions.max_days_advance ?? 365)} gg`
    case 'last_minute':
      return `Entro ${String(conditions.within_days ?? 3)} gg`
    case 'length_of_stay':
      return `Da ${String(conditions.min_nights ?? 3)} notti`
    default:
      return 'Regola personalizzata'
  }
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [form, setForm] = useState<RevenueRuleForm>(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const next = await loadRevenueDashboardAction()
    setData(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const latestStats = data?.latestStats ?? null

  const ruleTypeOptions = useMemo(() => RULE_TYPES, [])
  const roomTypeOptions = useMemo(
    () => [{ value: '', label: 'Tutte le unità' }, ...(data?.roomTypes ?? []).map((rt) => ({
      value: rt.id,
      label: rt.code ? `${rt.name} (${rt.code})` : rt.name,
    }))],
    [data?.roomTypes],
  )
  const ratePlanOptions = useMemo(
    () => [{ value: '', label: 'Tutti i piani' }, ...(data?.ratePlans ?? []).map((rp) => ({
      value: rp.id,
      label: rp.code ? `${rp.name} (${rp.code})` : rp.name,
    }))],
    [data?.ratePlans],
  )

  function openCreateRule() {
    setEditingRule(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEditRule(rule: PricingRule) {
    const conditions = rule.conditions as Record<string, unknown>
    setEditingRule(rule)
    setForm({
      id: rule.id,
      name: rule.name,
      rule_type: rule.rule_type,
      adjustment_type: rule.adjustment_type,
      adjustment_value: String(rule.adjustment_value),
      priority: String(rule.priority),
      is_active: rule.is_active,
      room_type_id: rule.room_type_id ?? '',
      rate_plan_id: rule.rate_plan_id ?? '',
      valid_from: rule.valid_from ?? '',
      valid_to: rule.valid_to ?? '',
      min_occupancy: String((conditions.min_occupancy as number) ?? 70),
      max_occupancy: String((conditions.max_occupancy as number) ?? 100),
      occupancy_threshold: String((conditions.occupancy_threshold as number) ?? 85),
      min_days_advance: String((conditions.min_days_advance as number) ?? 0),
      max_days_advance: String((conditions.max_days_advance as number) ?? 365),
      within_days: String((conditions.within_days as number) ?? 3),
      min_nights: String((conditions.min_nights as number) ?? 3),
      days: Array.isArray(conditions.days) ? (conditions.days as number[]) : [],
    })
    setError('')
    setModalOpen(true)
  }

  function setField(field: keyof RevenueRuleForm, value: string | boolean | number[] | PricingRuleType | AdjustmentType) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function refreshSnapshot() {
    setInfo('')
    setError('')
    const res = await refreshRevenueSnapshotAction()
    if (res.success) {
      setInfo('Snapshot giornaliero aggiornato.')
      await load()
    } else {
      setError(res.error || 'Errore snapshot')
    }
  }

  async function recalculateSuggestions() {
    setInfo('')
    setError('')
    const res = await recalculateRevenueSuggestionsAction()
    if (res.success) {
      setInfo('Suggerimenti revenue ricalcolati.')
      await load()
    } else {
      setError(res.error || 'Errore ricalcolo')
    }
  }

  async function handleRuleSave() {
    setSaving(true)
    setError('')
    setInfo('')

    const conditions: Record<string, unknown> = {}

    switch (form.rule_type) {
      case 'occupancy_based':
        conditions.min_occupancy = Number(form.min_occupancy)
        conditions.max_occupancy = Number(form.max_occupancy)
        break
      case 'demand_surge':
        conditions.occupancy_threshold = Number(form.occupancy_threshold)
        break
      case 'day_of_week':
        conditions.days = form.days
        break
      case 'advance_booking':
        conditions.min_days_advance = Number(form.min_days_advance)
        conditions.max_days_advance = Number(form.max_days_advance)
        break
      case 'last_minute':
        conditions.within_days = Number(form.within_days)
        break
      case 'length_of_stay':
        conditions.min_nights = Number(form.min_nights)
        break
    }

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name,
      rule_type: form.rule_type,
      conditions,
      adjustment_type: form.adjustment_type,
      adjustment_value: Number(form.adjustment_value),
      priority: Number(form.priority),
      is_active: form.is_active,
      room_type_id: form.room_type_id || null,
      rate_plan_id: form.rate_plan_id || null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
    }

    const res = await savePricingRuleAction(payload as Parameters<typeof savePricingRuleAction>[0])
    if (res.success) {
      setInfo(form.id ? 'Regola aggiornata.' : 'Regola creata.')
      setModalOpen(false)
      await load()
    } else {
      setError(res.error || 'Errore salvataggio')
    }

    setSaving(false)
  }

  async function handleToggleRule(rule: PricingRule) {
    setError('')
    const res = await togglePricingRuleAction(rule.id)
    if (res.success) {
      await load()
    } else {
      setError(res.error || 'Errore stato regola')
    }
  }

  async function handleDeleteRule(rule: PricingRule) {
    if (!confirm(`Eliminare la regola "${rule.name}"?`)) return
    const res = await deletePricingRuleAction(rule.id)
    if (res.success) {
      await load()
    } else {
      setError(res.error || 'Errore eliminazione')
    }
  }

  async function handleSuggestionAction(id: string, action: 'accept' | 'reject') {
    const res = action === 'accept'
      ? await acceptPriceSuggestionAction(id)
      : await rejectPriceSuggestionAction(id)

    if (res.success) {
      await load()
    } else {
      setError(res.error || 'Errore suggerimento')
    }
  }

  const columns = [
    { key: 'name', header: 'Nome' },
    {
      key: 'type',
      header: 'Tipo',
      render: (rule: PricingRule) => ruleTypeOptions.find((item) => item.value === rule.rule_type)?.label ?? rule.rule_type,
    },
    {
      key: 'adjustment',
      header: 'Ajust',
      render: (rule: PricingRule) => (
        <Badge variant={rule.adjustment_type === 'percentage' ? 'warning' : 'secondary'}>
          {ruleAdjustmentLabel(rule)}
        </Badge>
      ),
    },
    {
      key: 'scope',
      header: 'Ambito',
      render: (rule: PricingRule) => getConditionsSummary(rule),
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Stato',
      render: (rule: PricingRule) => (
        <Badge variant={rule.is_active ? 'success' : 'secondary'}>
          {rule.is_active ? 'Attiva' : 'Inattiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (rule: PricingRule) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => handleToggleRule(rule)}>
            {rule.is_active ? 'Disattiva' : 'Attiva'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEditRule(rule)}>
            Modifica
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule)} className="text-red-600 hover:text-red-700">
            Elimina
          </Button>
        </div>
      ),
    },
  ]

  const suggestionsColumns = [
    { key: 'date', header: 'Data', render: (s: PriceSuggestion) => formatDate(s.date) },
    { key: 'room_type', header: 'Unità', render: (s: PriceSuggestion & { room_type?: { name: string } | null }) => s.room_type?.name ?? '—' },
    { key: 'current_price', header: 'Attuale', render: (s: PriceSuggestion) => s.current_price != null ? formatMoney(s.current_price) : '—' },
    { key: 'suggested_price', header: 'Suggerito', render: (s: PriceSuggestion) => s.suggested_price != null ? formatMoney(s.suggested_price) : '—' },
    {
      key: 'occupancy',
      header: 'Occupazione',
      render: (s: PriceSuggestion) => `${s.occupancy_forecast ?? 0}%`,
    },
    {
      key: 'status',
      header: 'Stato',
      render: (s: PriceSuggestion) => (
        <Badge variant={s.status === 'pending' ? 'warning' : s.status === 'accepted' ? 'success' : 'secondary'}>
          {s.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (suggestion: PriceSuggestion) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => handleSuggestionAction(suggestion.id, 'accept')}>
            Accetta
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleSuggestionAction(suggestion.id, 'reject')} className="text-red-600 hover:text-red-700">
            Rifiuta
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const occupancy = latestStats?.occupancy_pct ?? 0
  const revenue = latestStats?.revenue ?? 0
  const adr = latestStats?.adr ?? 0
  const revpar = latestStats?.revpar ?? 0

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8_52%,_#e0f2fe)] text-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.55)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/10 text-white">Revenue</Badge>
              <Badge className="border-white/20 bg-white/10 text-white">Occupancy aware</Badge>
              <Badge className="border-white/20 bg-white/10 text-white">Percentuale + fisso</Badge>
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Controllo prezzo dinamico, regole, suggerimenti e inserimento diretto unità.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-100/90 sm:text-base">
              Qui gestisci l’ottimizzazione revenue: puoi applicare rialzi percentuali, importi fissi,
              oppure aprire la matrice prezzi per inserire il prezzo diretto per ogni unità.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                <TrendingUp className="h-4 w-4" />
                ADR / RevPAR / Occupazione
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                <Percent className="h-4 w-4" />
                +% o importo fisso
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                <Calendar className="h-4 w-4" />
                Suggerimenti giornalieri
              </span>
            </div>
          </div>

          <aside className="border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-200">Occupazione</p>
                <p className="mt-2 text-2xl font-semibold">{occupancy}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-200">Revenue</p>
                <p className="mt-2 text-2xl font-semibold">{formatMoney(revenue)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-200">ADR</p>
                <p className="mt-2 text-2xl font-semibold">{formatMoney(adr)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-200">RevPAR</p>
                <p className="mt-2 text-2xl font-semibold">{formatMoney(revpar)}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {info}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ultimo snapshot</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {latestStats ? formatDate(latestStats.date) : 'Nessun dato'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {latestStats ? `${latestStats.occupied_rooms}/${latestStats.total_rooms} camere occupate` : 'Premi snapshot per aggiornare'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Regole attive</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{data?.pricingRules.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Percentuali e importi fissi sulle regole revenue.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Suggerimenti</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{data?.priceSuggestions.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Da applicare, accettare o rifiutare.</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button onClick={openCreateRule}>Nuova regola</Button>
        <Button variant="outline" onClick={refreshSnapshot}>Aggiorna snapshot</Button>
        <Button variant="outline" onClick={recalculateSuggestions}>Ricalcola suggerimenti</Button>
        <div className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Prezzo diretto unità: gestiscilo nella matrice tariffe, qui usi variazioni percentuali o importi fissi.
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Regole revenue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Definisci quando il sistema deve alzare o abbassare il prezzo: percentuale o importo fisso.
          </p>
        </div>
        <DataTable
          columns={columns}
          data={data?.pricingRules ?? []}
          keyExtractor={(rule) => rule.id}
          emptyMessage="Nessuna regola revenue configurata"
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Suggerimenti prezzo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Il motore calcola i prezzi in base all’occupazione e alle regole attive.
          </p>
        </div>
        <DataTable
          columns={suggestionsColumns}
          data={data?.priceSuggestions ?? []}
          keyExtractor={(suggestion) => suggestion.id}
          emptyMessage="Nessun suggerimento generato"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Andamento snapshot</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ultimi giorni per occupazione, revenue, ADR e RevPAR.
            </p>
          </div>
          <Button variant="ghost" onClick={refreshSnapshot}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aggiorna
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data?.dailyStats.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDate(row.date)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <span>Occ.</span>
                <span className="text-right font-medium text-slate-950">{row.occupancy_pct}%</span>
                <span>Rev.</span>
                <span className="text-right font-medium text-slate-950">{formatMoney(row.revenue)}</span>
                <span>ADR</span>
                <span className="text-right font-medium text-slate-950">{formatMoney(row.adr)}</span>
                <span>RevPAR</span>
                <span className="text-right font-medium text-slate-950">{formatMoney(row.revpar)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Suggerimenti in attesa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verifica i suggerimenti prima di applicarli al pricing pubblico.
          </p>
        </div>
        <DataTable
          columns={suggestionsColumns}
          data={(data?.priceSuggestions ?? []).filter((s) => s.status === 'pending')}
          keyExtractor={(suggestion) => suggestion.id}
          emptyMessage="Nessun suggerimento in attesa"
        />
      </section>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? 'Modifica regola revenue' : 'Nuova regola revenue'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome regola" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            <Select
              label="Tipo regola"
              options={RULE_TYPES}
              value={form.rule_type}
              onChange={(e) => setField('rule_type', e.target.value as PricingRuleType)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Aggiustamento"
              options={ADJUSTMENT_TYPES}
              value={form.adjustment_type}
              onChange={(e) => setField('adjustment_type', e.target.value as AdjustmentType)}
            />
            <Input
              label={form.adjustment_type === 'percentage' ? 'Valore %' : 'Importo fisso'}
              type="number"
              step="0.01"
              value={form.adjustment_value}
              onChange={(e) => setField('adjustment_value', e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Priorità" type="number" value={form.priority} onChange={(e) => setField('priority', e.target.value)} />
            <Input label="Data inizio" type="date" value={form.valid_from} onChange={(e) => setField('valid_from', e.target.value)} />
            <Input label="Data fine" type="date" value={form.valid_to} onChange={(e) => setField('valid_to', e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Unità"
              options={roomTypeOptions}
              value={form.room_type_id}
              onChange={(e) => setField('room_type_id', e.target.value)}
            />
            <Select
              label="Tariffa"
              options={ratePlanOptions}
              value={form.rate_plan_id}
              onChange={(e) => setField('rate_plan_id', e.target.value)}
            />
          </div>

          {form.rule_type === 'occupancy_based' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Occupazione minima %" type="number" value={form.min_occupancy} onChange={(e) => setField('min_occupancy', e.target.value)} />
              <Input label="Occupazione massima %" type="number" value={form.max_occupancy} onChange={(e) => setField('max_occupancy', e.target.value)} />
            </div>
          )}

          {form.rule_type === 'demand_surge' && (
            <Input
              label="Soglia occupazione %"
              type="number"
              value={form.occupancy_threshold}
              onChange={(e) => setField('occupancy_threshold', e.target.value)}
            />
          )}

          {form.rule_type === 'day_of_week' && (
            <WeekdaySelector
              label="Giorni applicazione"
              helper="Se non scegli nulla, la regola non si applica a giorni specifici."
              value={form.days}
              onChange={(days) => setField('days', days)}
            />
          )}

          {form.rule_type === 'advance_booking' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Min giorni anticipo" type="number" value={form.min_days_advance} onChange={(e) => setField('min_days_advance', e.target.value)} />
              <Input label="Max giorni anticipo" type="number" value={form.max_days_advance} onChange={(e) => setField('max_days_advance', e.target.value)} />
            </div>
          )}

          {form.rule_type === 'last_minute' && (
            <Input label="Entro quanti giorni" type="number" value={form.within_days} onChange={(e) => setField('within_days', e.target.value)} />
          )}

          {form.rule_type === 'length_of_stay' && (
            <Input label="Min notti" type="number" value={form.min_nights} onChange={(e) => setField('min_nights', e.target.value)} />
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Regola attiva
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleRuleSave} disabled={saving || !form.name}>
              {saving ? 'Salvataggio...' : editingRule ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
