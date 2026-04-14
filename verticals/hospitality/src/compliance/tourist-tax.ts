/**
 * Tourist Tax (Tassa di Soggiorno / Imposta di Soggiorno) Calculator
 *
 * Implements the calculation logic for the Italian tourist tax (imposta di soggiorno)
 * as regulated by D.Lgs. 23/2011 (Art. 4) and subsequent municipal regulations.
 *
 * Each Italian municipality sets its own rates, exemptions, and maximum taxable nights.
 * This module provides a configurable engine that adapts to any municipality's rules.
 *
 * Key regulations:
 * - D.Lgs. 23/2011 Art. 4 (istituzione dell'imposta di soggiorno)
 * - D.L. 50/2017 Art. 4 (contributo di soggiorno per Roma Capitale)
 * - Municipal regulations (Regolamento comunale per l'imposta di soggiorno)
 */

import {
  parseISO,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  isBefore,
  isAfter,
  format,
  max as dateMax,
  min as dateMin,
} from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TouristTaxConfig {
  rates: {
    category: string // 'adult', 'teen_14_17', 'child_10_13', 'child_0_9'
    amount_per_night: number
    is_exempt: boolean
  }[]
  max_taxable_nights: number
  exemptions: {
    type: string // 'age_under_10', 'resident', 'disabled', 'military', 'driver_guide'
    description: string
  }[]
  municipality_name: string
}

export interface TouristTaxGuest {
  date_of_birth: string
  is_resident: boolean
  is_disabled: boolean
  is_exempt: boolean
  exemption_reason: string | null
}

export interface TouristTaxResult {
  total_amount: number
  taxable_nights: number
  taxable_guests: number
  exempt_guests: number
  details: {
    guest_category: string
    nights: number
    rate_per_night: number
    amount: number
    is_exempt: boolean
    exemption_reason: string | null
  }[]
}

export interface TouristTaxReservation {
  check_in: string
  check_out: string
  reservation_id: string
}

export interface TouristTaxMonthlyReport {
  month: number
  year: number
  municipality: string
  total_collected: number
  total_due: number
  total_exempt_guests: number
  by_category: {
    category: string
    guests: number
    nights: number
    total: number
  }[]
  by_exemption: {
    reason: string
    guests: number
    nights: number
  }[]
}

export interface TouristTaxOrganization {
  name: string
  legal_name: string | null
  vat_number: string | null
  fiscal_code: string | null
  address: string | null
  city: string | null
  province: string | null
  zip: string | null
  istat_structure_code: string | null
}

interface TouristTaxRecord {
  reservation_id: string
  check_in: string
  check_out: string
  result: TouristTaxResult
  collected_amount: number
}

// ---------------------------------------------------------------------------
// Age category helpers
// ---------------------------------------------------------------------------

/**
 * Determine the age of a guest on the check-in date.
 */
function calculateAge(dateOfBirth: string, referenceDate: string): number {
  const birth = parseISO(dateOfBirth)
  const ref = parseISO(referenceDate)

  let age = ref.getFullYear() - birth.getFullYear()
  const monthDiff = ref.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Determine the tax category for a guest based on age at check-in.
 * Standard Italian categories:
 * - child_0_9:   0-9 years (typically exempt)
 * - child_10_13: 10-13 years (reduced rate or exempt, varies by municipality)
 * - teen_14_17:  14-17 years (reduced rate, varies by municipality)
 * - adult:       18+ years (full rate)
 */
function getGuestCategory(age: number): string {
  if (age < 10) return 'child_0_9'
  if (age < 14) return 'child_10_13'
  if (age < 18) return 'teen_14_17'
  return 'adult'
}

/**
 * Find the rate configuration for a given category.
 * Falls back to the 'adult' rate if no specific rate is configured.
 */
function findRate(config: TouristTaxConfig, category: string): { amount_per_night: number; is_exempt: boolean } {
  const rate = config.rates.find(r => r.category === category)
  if (rate) return { amount_per_night: rate.amount_per_night, is_exempt: rate.is_exempt }

  // Fallback to adult rate
  const adultRate = config.rates.find(r => r.category === 'adult')
  if (adultRate) return { amount_per_night: adultRate.amount_per_night, is_exempt: adultRate.is_exempt }

  return { amount_per_night: 0, is_exempt: true }
}

/**
 * Determine the exemption reason for a guest, if any.
 * Returns null if the guest is not exempt.
 *
 * Exemption priority (first match wins):
 * 1. Explicit exemption flag on the guest record
 * 2. Resident of the municipality
 * 3. Disabled person (with documentation)
 * 4. Age-based exemption (per municipal config)
 */
function determineExemption(
  guest: TouristTaxGuest,
  category: string,
  config: TouristTaxConfig,
): { is_exempt: boolean; reason: string | null } {
  // Explicit exemption
  if (guest.is_exempt && guest.exemption_reason) {
    return { is_exempt: true, reason: guest.exemption_reason }
  }

  // Resident exemption (Art. 4 D.Lgs. 23/2011 — municipalities can exempt residents)
  if (guest.is_resident) {
    const exemption = config.exemptions.find(e => e.type === 'resident')
    if (exemption) {
      return { is_exempt: true, reason: exemption.description }
    }
  }

  // Disabled person exemption
  if (guest.is_disabled) {
    const exemption = config.exemptions.find(e => e.type === 'disabled')
    if (exemption) {
      return { is_exempt: true, reason: exemption.description }
    }
  }

  // Age-based exemption from rate config
  const rate = config.rates.find(r => r.category === category)
  if (rate?.is_exempt) {
    const ageExemption = config.exemptions.find(e => e.type === `age_${category}` || e.type === `age_under_10`)
    return {
      is_exempt: true,
      reason: ageExemption?.description ?? `Esenzione per categoria: ${category}`,
    }
  }

  return { is_exempt: false, reason: null }
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate tourist tax for a reservation based on the municipality's configuration.
 *
 * The tax is calculated per guest per night, subject to:
 * - Maximum taxable nights per stay (typically 5-14, set by the municipality)
 * - Rate varies by guest age category
 * - Various exemptions as configured by the municipality
 *
 * Nights are counted as calendar nights spent in the accommodation.
 * The check-out day does not count as a night.
 */
export function calculateTouristTax(
  reservation: TouristTaxReservation,
  guests: TouristTaxGuest[],
  config: TouristTaxConfig,
): TouristTaxResult {
  const checkIn = parseISO(reservation.check_in)
  const checkOut = parseISO(reservation.check_out)
  const totalNights = differenceInCalendarDays(checkOut, checkIn)

  if (totalNights <= 0) {
    return {
      total_amount: 0,
      taxable_nights: 0,
      taxable_guests: 0,
      exempt_guests: guests.length,
      details: [],
    }
  }

  // Apply maximum taxable nights
  const taxableNights = Math.min(totalNights, config.max_taxable_nights)

  const details: TouristTaxResult['details'] = []
  let totalAmount = 0
  let taxableGuests = 0
  let exemptGuests = 0

  for (const guest of guests) {
    const age = calculateAge(guest.date_of_birth, reservation.check_in)
    const category = getGuestCategory(age)
    const rate = findRate(config, category)
    const exemption = determineExemption(guest, category, config)

    if (exemption.is_exempt || rate.is_exempt) {
      exemptGuests++
      details.push({
        guest_category: category,
        nights: totalNights,
        rate_per_night: rate.amount_per_night,
        amount: 0,
        is_exempt: true,
        exemption_reason: exemption.reason ?? `Esenzione per categoria: ${category}`,
      })
    } else {
      const amount = taxableNights * rate.amount_per_night
      // Round to 2 decimal places
      const roundedAmount = Math.round(amount * 100) / 100

      taxableGuests++
      totalAmount += roundedAmount
      details.push({
        guest_category: category,
        nights: taxableNights,
        rate_per_night: rate.amount_per_night,
        amount: roundedAmount,
        is_exempt: false,
        exemption_reason: null,
      })
    }
  }

  return {
    total_amount: Math.round(totalAmount * 100) / 100,
    taxable_nights: taxableNights,
    taxable_guests: taxableGuests,
    exempt_guests: exemptGuests,
    details,
  }
}

// ---------------------------------------------------------------------------
// Monthly report
// ---------------------------------------------------------------------------

/**
 * Generate a monthly tourist tax report for submission to the municipality.
 *
 * Italian municipalities require accommodation facilities to report the tourist
 * tax collected and the breakdown by category and exemptions. Reports are
 * typically due within 15-20 days of the following month.
 */
export function generateTouristTaxReport(
  records: TouristTaxRecord[],
  month: number,
  year: number,
  organization: TouristTaxOrganization,
): TouristTaxMonthlyReport {
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))

  // Filter records to those with check-in in the reporting month
  // (some municipalities use check-in date, others use the actual stay dates)
  const monthRecords = records.filter(r => {
    const checkIn = parseISO(r.check_in)
    return !isBefore(checkIn, monthStart) && !isAfter(checkIn, monthEnd)
  })

  const categoryMap = new Map<string, { guests: number; nights: number; total: number }>()
  const exemptionMap = new Map<string, { guests: number; nights: number }>()
  let totalCollected = 0
  let totalDue = 0
  let totalExemptGuests = 0

  for (const record of monthRecords) {
    const { result, collected_amount } = record

    totalDue += result.total_amount
    totalCollected += collected_amount

    for (const detail of result.details) {
      if (detail.is_exempt) {
        totalExemptGuests++

        const reason = detail.exemption_reason ?? 'Non specificato'
        const exemptEntry = exemptionMap.get(reason) ?? { guests: 0, nights: 0 }
        exemptEntry.guests += 1
        exemptEntry.nights += detail.nights
        exemptionMap.set(reason, exemptEntry)
      } else {
        const catEntry = categoryMap.get(detail.guest_category) ?? { guests: 0, nights: 0, total: 0 }
        catEntry.guests += 1
        catEntry.nights += detail.nights
        catEntry.total += detail.amount
        categoryMap.set(detail.guest_category, catEntry)
      }
    }
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      guests: data.guests,
      nights: data.nights,
      total: Math.round(data.total * 100) / 100,
    }))
    .sort((a, b) => a.category.localeCompare(b.category))

  const byExemption = Array.from(exemptionMap.entries())
    .map(([reason, data]) => ({
      reason,
      guests: data.guests,
      nights: data.nights,
    }))
    .sort((a, b) => a.reason.localeCompare(b.reason))

  const municipalityName = (organization as TouristTaxOrganization & { municipality_name?: string }).municipality_name
    ?? organization.city
    ?? 'N/D'

  return {
    month,
    year,
    municipality: municipalityName,
    total_collected: Math.round(totalCollected * 100) / 100,
    total_due: Math.round(totalDue * 100) / 100,
    total_exempt_guests: totalExemptGuests,
    by_category: byCategory,
    by_exemption: byExemption,
  }
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  adult: 'Adulti (18+)',
  teen_14_17: 'Ragazzi (14-17)',
  child_10_13: 'Bambini (10-13)',
  child_0_9: 'Bambini (0-9)',
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

// ---------------------------------------------------------------------------
// Annual declaration
// ---------------------------------------------------------------------------

/**
 * Generate the annual declaration text for the municipality.
 *
 * Italian municipalities require accommodation facilities to submit an annual
 * declaration (dichiarazione annuale) summarizing the tourist tax collected
 * during the calendar year. The declaration is typically due by January 31
 * of the following year (some municipalities allow until March 31).
 *
 * Legal basis: Art. 4 D.Lgs. 23/2011, municipal regulations.
 */
export function generateAnnualDeclaration(
  records: TouristTaxRecord[],
  year: number,
  organization: TouristTaxOrganization,
): string {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)

  const yearRecords = records.filter(r => {
    const checkIn = parseISO(r.check_in)
    return !isBefore(checkIn, yearStart) && !isAfter(checkIn, yearEnd)
  })

  // Calculate monthly totals
  const monthlyTotals: { month: number; due: number; collected: number; guests: number; exemptGuests: number }[] = []

  for (let m = 1; m <= 12; m++) {
    const mStart = startOfMonth(new Date(year, m - 1, 1))
    const mEnd = endOfMonth(new Date(year, m - 1, 1))

    const monthRecords = yearRecords.filter(r => {
      const checkIn = parseISO(r.check_in)
      return !isBefore(checkIn, mStart) && !isAfter(checkIn, mEnd)
    })

    let due = 0
    let collected = 0
    let guests = 0
    let exemptGuests = 0

    for (const record of monthRecords) {
      due += record.result.total_amount
      collected += record.collected_amount
      guests += record.result.taxable_guests
      exemptGuests += record.result.exempt_guests
    }

    monthlyTotals.push({
      month: m,
      due: Math.round(due * 100) / 100,
      collected: Math.round(collected * 100) / 100,
      guests,
      exemptGuests,
    })
  }

  const totalDue = monthlyTotals.reduce((sum, mt) => sum + mt.due, 0)
  const totalCollected = monthlyTotals.reduce((sum, mt) => sum + mt.collected, 0)
  const totalGuests = monthlyTotals.reduce((sum, mt) => sum + mt.guests, 0)
  const totalExemptGuests = monthlyTotals.reduce((sum, mt) => sum + mt.exemptGuests, 0)

  const lines: string[] = []
  const separator = '='.repeat(78)
  const thinSeparator = '-'.repeat(78)

  lines.push(separator)
  lines.push('DICHIARAZIONE ANNUALE IMPOSTA DI SOGGIORNO')
  lines.push(`ANNO ${year}`)
  lines.push(separator)
  lines.push('')
  lines.push('DATI DELLA STRUTTURA RICETTIVA')
  lines.push(thinSeparator)
  lines.push(`Denominazione:    ${organization.legal_name ?? organization.name}`)
  if (organization.vat_number) lines.push(`Partita IVA:      ${organization.vat_number}`)
  if (organization.fiscal_code) lines.push(`Codice Fiscale:   ${organization.fiscal_code}`)
  if (organization.address) {
    const addressParts = [
      organization.address,
      organization.zip,
      organization.city,
      organization.province ? `(${organization.province})` : null,
    ].filter(Boolean)
    lines.push(`Indirizzo:        ${addressParts.join(' ')}`)
  }
  if (organization.istat_structure_code) {
    lines.push(`Codice ISTAT:     ${organization.istat_structure_code}`)
  }
  lines.push('')

  // Monthly breakdown
  lines.push('RIEPILOGO MENSILE')
  lines.push(thinSeparator)
  lines.push(
    padRight('Mese', 16) +
    padLeft('Ospiti', 10) +
    padLeft('Esenti', 10) +
    padLeft('Dovuto', 14) +
    padLeft('Riscosso', 14) +
    padLeft('Differenza', 14),
  )
  lines.push(thinSeparator)

  for (const mt of monthlyTotals) {
    const diff = Math.round((mt.collected - mt.due) * 100) / 100
    lines.push(
      padRight(MONTH_NAMES[mt.month - 1]!, 16) +
      padLeft(mt.guests.toString(), 10) +
      padLeft(mt.exemptGuests.toString(), 10) +
      padLeft(formatCurrency(mt.due), 14) +
      padLeft(formatCurrency(mt.collected), 14) +
      padLeft(formatCurrency(diff), 14),
    )
  }

  lines.push(thinSeparator)
  const totalDiff = Math.round((totalCollected - totalDue) * 100) / 100
  lines.push(
    padRight('TOTALE ANNUO', 16) +
    padLeft(totalGuests.toString(), 10) +
    padLeft(totalExemptGuests.toString(), 10) +
    padLeft(formatCurrency(totalDue), 14) +
    padLeft(formatCurrency(totalCollected), 14) +
    padLeft(formatCurrency(totalDiff), 14),
  )
  lines.push('')

  // Summary
  lines.push('RIEPILOGO')
  lines.push(thinSeparator)
  lines.push(`Totale imposta dovuta:      ${formatCurrency(totalDue)}`)
  lines.push(`Totale imposta riscossa:    ${formatCurrency(totalCollected)}`)
  if (totalDiff > 0) {
    lines.push(`Eccedenza da versare:       ${formatCurrency(totalDiff)}`)
  } else if (totalDiff < 0) {
    lines.push(`Importo non riscosso:       ${formatCurrency(Math.abs(totalDiff))}`)
  } else {
    lines.push(`Saldo:                      ${formatCurrency(0)}`)
  }
  lines.push(`Totale ospiti tassabili:    ${totalGuests}`)
  lines.push(`Totale ospiti esenti:       ${totalExemptGuests}`)
  lines.push('')

  // Legal declaration
  lines.push(separator)
  lines.push('DICHIARAZIONE')
  lines.push(separator)
  lines.push('')
  lines.push(
    'Il/La sottoscritto/a, in qualita\' di gestore/legale rappresentante della struttura ' +
    'ricettiva sopra indicata, ai sensi e per gli effetti dell\'art. 4 del D.Lgs. 14 marzo ' +
    '2011, n. 23, e del vigente Regolamento comunale per l\'applicazione dell\'imposta di ' +
    'soggiorno, dichiara che i dati sopra riportati sono veritieri e corrispondono alle ' +
    'scritture contabili della struttura.',
  )
  lines.push('')
  lines.push(
    'Il dichiarante e\' consapevole che, ai sensi dell\'art. 76 del D.P.R. 445/2000, ' +
    'le dichiarazioni mendaci sono punite ai sensi del codice penale e delle leggi speciali ' +
    'in materia.',
  )
  lines.push('')
  lines.push(`Data: ${format(new Date(), 'dd/MM/yyyy')}`)
  lines.push('')
  lines.push('Firma del dichiarante: ____________________________')
  lines.push('')
  lines.push(separator)
  lines.push(`Documento generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}
