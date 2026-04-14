import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type {
  PoliceRegistration,
  IstatReport,
  TouristTaxRecord,
  ProcessingActivity,
  DataProcessingAgreement,
  DataBreach,
  DataBreachTimeline,
  AmlCashRecord,
  AuditLog,
  CancellationPolicy,
  AlloggiatiStatus,
} from '../types/database'

// --- Police / Alloggiati ---

interface PoliceRegistrationFilters {
  status?: AlloggiatiStatus
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export async function getPoliceRegistrations(filters: PoliceRegistrationFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { status, dateFrom, dateTo, search, page = 1, limit = 25 } = filters

  let query = supabase
    .from('police_registrations')
    .select('*, reservation:reservations!reservation_id(reservation_code)', { count: 'exact' })

  if (propId) query = query.eq('entity_id', propId)

  if (status) {
    query = query.eq('alloggiati_status', status)
  }

  if (dateFrom) {
    query = query.gte('registration_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('registration_date', dateTo)
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,document_number.ilike.%${search}%`
    )
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('registration_date', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    registrations: data as (PoliceRegistration & { reservation: { reservation_code: string } | null })[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// --- ISTAT ---

export async function getIstatReports(year: number) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('istat_reports')
    .select('*')
    .eq('year', year)

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('month', { ascending: true })

  if (error) throw error
  return data as IstatReport[]
}

// --- Tourist Tax ---

interface TouristTaxFilters {
  dateFrom?: string
  dateTo?: string
  isCollected?: boolean
  isExempt?: boolean
  page?: number
  limit?: number
}

export async function getTouristTaxRecords(filters: TouristTaxFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { dateFrom, dateTo, isCollected, isExempt, page = 1, limit = 25 } = filters

  let query = supabase
    .from('tourist_tax_records')
    .select('*, guest:guests!guest_id(first_name, last_name), reservation:reservations!reservation_id(reservation_code, check_in, check_out)', { count: 'exact' })

  if (propId) query = query.eq('entity_id', propId)

  if (dateFrom) {
    query = query.gte('tax_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('tax_date', dateTo)
  }

  if (isCollected !== undefined) {
    query = query.eq('is_collected', isCollected)
  }

  if (isExempt !== undefined) {
    query = query.eq('is_exempt', isExempt)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('tax_date', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    records: data as (TouristTaxRecord & {
      guest: { first_name: string; last_name: string } | null
      reservation: { reservation_code: string; check_in: string; check_out: string } | null
    })[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// --- GDPR: Processing Activities ---

export async function getProcessingActivities() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('processing_activities')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('activity_name', { ascending: true })

  if (error) throw error
  return data as ProcessingActivity[]
}

// --- GDPR: Data Processing Agreements ---

export async function getDpaAgreements() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('data_processing_agreements')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('processor_name', { ascending: true })

  if (error) throw error
  return data as DataProcessingAgreement[]
}

// --- GDPR: Data Breaches ---

export async function getDataBreaches() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('data_breaches')
    .select(`
      *,
      timeline:data_breach_timeline(*)
    `)

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('detected_at', { ascending: false })

  if (error) throw error
  return data as (DataBreach & { timeline: DataBreachTimeline[] })[]
}

// --- AML Cash Records ---

interface AmlRecordFilters {
  dateFrom?: string
  dateTo?: string
  thresholdExceeded?: boolean
  page?: number
  limit?: number
}

export async function getAmlRecords(filters: AmlRecordFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { dateFrom, dateTo, thresholdExceeded, page = 1, limit = 25 } = filters

  let query = supabase
    .from('aml_cash_records')
    .select('*', { count: 'exact' })

  if (propId) query = query.eq('entity_id', propId)

  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('transaction_date', dateTo)
  }

  if (thresholdExceeded !== undefined) {
    query = query.eq('is_threshold_exceeded', thresholdExceeded)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('transaction_date', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    records: data as AmlCashRecord[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// --- Audit Logs ---

interface AdminLogFilters {
  action?: string
  entityType?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export async function getAdminLogs(filters: AdminLogFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { action, entityType, userId, dateFrom, dateTo, page = 1, limit = 50 } = filters

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (propId) query = query.eq('entity_id', propId)

  if (action) {
    query = query.eq('action', action)
  }

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    logs: data as AuditLog[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// --- Cancellation Policies ---

export async function getCancellationPolicies() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('cancellation_policies')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('name', { ascending: true })

  if (error) throw error
  return data as CancellationPolicy[]
}
