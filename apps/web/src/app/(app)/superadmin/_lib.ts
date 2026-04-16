import { type SubscriptionPlan } from '@touracore/billing'

export type MonthBucket = {
  key: string
  label: string
  value: number
}

export type SuperadminTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet'

export type SuperadminModule = {
  key: string
  label: string
  status: 'live' | 'ready' | 'planned'
  description: string
}

export const PLAN_ORDER: SubscriptionPlan[] = ['trial', 'starter', 'professional', 'enterprise']

export const PLAN_ORDER_LABELS: Record<SubscriptionPlan, string> = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export const SHARED_CORE_MODULES = [
  'Auth & roles',
  'Tenant isolation',
  'Audit logs',
  'Billing & ledger',
  'Integrations',
  'Security headers',
  'Media',
  'Notifications',
  'Booking engine',
  'Compliance',
]

export const SUITE_VERTICALS: SuperadminModule[] = [
  {
    key: 'hospitality',
    label: 'Hospitality',
    status: 'live',
    description: 'Booking engine, PMS, revenue, compliance, housekeeping e channel sync.',
  },
  {
    key: 'restaurant',
    label: 'Ristorazione',
    status: 'planned',
    description: 'Tables, menu, delivery, events, prenotazioni e loyalty.',
  },
  {
    key: 'bike-rental',
    label: 'Bike rental',
    status: 'planned',
    description: 'Noleggio biciclette, slot, depositi, waiver, inventory e danni.',
  },
  {
    key: 'moto-rental',
    label: 'Moto rental',
    status: 'planned',
    description: 'Noleggio moto, documenti, insurance, depositi e checklist mezzi.',
  },
  {
    key: 'ski-school',
    label: 'Scuola sci',
    status: 'planned',
    description: 'Lezioni, gruppi, livelli, istruttori, attrezzatura e waiver.',
  },
  {
    key: 'experiences',
    label: 'Experiences',
    status: 'ready',
    description: 'Tour, attività, booking a slot, partecipanti e extras.',
  },
  {
    key: 'wellness',
    label: 'Wellness & spa',
    status: 'ready',
    description: 'Trattamenti, accessi, slot, capienze e add-on premium.',
  },
]

const MONTH_LABELS: Record<string, string> = {
  '01': 'Gen',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'Mag',
  '06': 'Giu',
  '07': 'Lug',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Ott',
  '11': 'Nov',
  '12': 'Dic',
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toMonthKey(dateValue: string | Date) {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function getMonthLabel(monthKey: string) {
  const [year, month = '01'] = monthKey.split('-')
  return `${MONTH_LABELS[month] ?? month} ${year}`
}

export function buildMonthBuckets(monthsBack = 6) {
  const buckets: MonthBucket[] = []
  const now = new Date()

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    buckets.push({
      key: toMonthKey(date),
      label: getMonthLabel(toMonthKey(date)),
      value: 0,
    })
  }

  return buckets
}

export function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

export function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((acc, item) => acc + getValue(item), 0)
}

export function fillBucketsFromRows<T>(
  buckets: MonthBucket[],
  rows: T[],
  getDate: (row: T) => string | Date | null | undefined,
) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const date = getDate(row)
    if (!date) continue
    const monthKey = toMonthKey(date)
    counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1)
  }

  return buckets.map((bucket) => ({
    ...bucket,
    value: counts.get(bucket.key) ?? 0,
  }))
}

export function topCounts<T>(
  items: T[],
  getKey: (item: T) => string,
  limit = 6,
) {
  return Object.entries(countBy(items, getKey))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export function formatCurrency(value: number, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('it-IT').format(value)
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(typeof value === 'string' ? new Date(value) : value)
}

export function maskEnvValue(value: string | undefined | null) {
  if (!value) return 'non configurato'
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function inferSupabaseProjectRef(url: string | undefined | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    if (!host.endsWith('.supabase.co')) return null
    return host.replace('.supabase.co', '')
  } catch {
    return null
  }
}
