import type { FiscalRegime, BookingSource } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FiscalBreakdown {
  gross: number
  commission: number
  touristTax: number
  netRentalIncome: number
  iva: number
  ritenutaOta: number
  cedolareSecca: number
  netIncome: number
}

export interface PropertyFiscalSettings {
  fiscalRegime: FiscalRegime
  hasVat: boolean
  isImprenditoriale: boolean
  defaultVatRate: number
  cedolareEnabled: boolean
  cedolareRate: number
}

// ---------------------------------------------------------------------------
// OTA sources that trigger ritenuta 21% for non-imprese
// ---------------------------------------------------------------------------

const DIRECT_SOURCES: BookingSource[] = ['direct', 'phone', 'walk_in', 'email']

function isOtaSource(source: BookingSource): boolean {
  return !DIRECT_SOURCES.includes(source)
}

// ---------------------------------------------------------------------------
// Compute net income based on fiscal regime and property type
// ---------------------------------------------------------------------------

/**
 * Compute the full fiscal breakdown for a single reservation.
 *
 * Flows by type:
 * - Hotel (ordinario):       Gross → Commission → Tourist Tax → IVA → Net
 * - B&B non-impr (cedolare): Gross → Commission → Tourist Tax → Ritenuta OTA 21% → Cedolare Secca → Net
 * - Apartment priv (cedolare): same as B&B non-impr
 * - Affittacamere (ordinario/forf): Gross → Commission → Tourist Tax → IVA → Net
 * - Agriturismo (special):   Gross → Commission → Tourist Tax → IVA (50% detrazione) → Net
 * - Forfettario:             Gross → Commission → Tourist Tax → No IVA charge → Coefficient taxation
 */
export function computeFiscalBreakdown(
  gross: number,
  commission: number,
  touristTax: number,
  source: BookingSource,
  settings: PropertyFiscalSettings,
): FiscalBreakdown {
  const netRentalIncome = gross - commission - touristTax

  // IVA calculation
  let iva = 0
  if (settings.hasVat) {
    switch (settings.fiscalRegime) {
      case 'agriturismo_special':
        // Agriturismo regime speciale: 50% IVA deduction
        iva = round((netRentalIncome * settings.defaultVatRate) / (100 + settings.defaultVatRate) * 0.5)
        break
      case 'forfettario':
        // Forfettario: no IVA charge
        iva = 0
        break
      case 'ordinario':
      default:
        // Ordinario: standard IVA scorporo
        iva = round((netRentalIncome * settings.defaultVatRate) / (100 + settings.defaultVatRate))
        break
    }
  }

  // Ritenuta OTA 21% (only for non-imprese via OTA intermediaries)
  let ritenutaOta = 0
  if (!settings.isImprenditoriale && isOtaSource(source)) {
    ritenutaOta = round(netRentalIncome * 0.21)
  }

  // Cedolare secca
  let cedolareSecca = 0
  if (settings.cedolareEnabled) {
    cedolareSecca = round(netRentalIncome * settings.cedolareRate / 100)
  }

  const netIncome = netRentalIncome - iva - ritenutaOta - cedolareSecca

  return {
    gross,
    commission,
    touristTax,
    netRentalIncome,
    iva,
    ritenutaOta,
    cedolareSecca,
    netIncome,
  }
}

// ---------------------------------------------------------------------------
// Tax deadline helpers
// ---------------------------------------------------------------------------

export interface TaxDeadline {
  date: Date
  label: string
  description: string
  category: 'cedolare_secca' | 'iva' | 'irpef' | 'irap' | 'inps'
}

/**
 * Get upcoming tax deadlines based on fiscal regime.
 */
export function getTaxDeadlines(settings: PropertyFiscalSettings): TaxDeadline[] {
  const now = new Date()
  const year = now.getFullYear()
  const deadlines: TaxDeadline[] = []

  // Cedolare secca deadlines
  if (settings.cedolareEnabled) {
    deadlines.push(
      { date: new Date(year, 5, 16), label: 'Acconto cedolare secca (1a rata)', description: '40% del 95% dell\'imposta', category: 'cedolare_secca' },
      { date: new Date(year, 10, 30), label: 'Acconto cedolare secca (2a rata)', description: '60% del 95% dell\'imposta', category: 'cedolare_secca' },
      { date: new Date(year + 1, 5, 30), label: 'Saldo cedolare secca', description: 'Saldo anno precedente', category: 'cedolare_secca' },
    )
  }

  // IVA deadlines (only for VAT-registered)
  if (settings.hasVat) {
    deadlines.push(
      { date: new Date(year, 0, 16), label: 'Liquidazione IVA dicembre', description: 'IVA mese precedente', category: 'iva' },
      { date: new Date(year, 1, 16), label: 'Liquidazione IVA gennaio', description: 'IVA mese precedente', category: 'iva' },
      { date: new Date(year, 2, 16), label: 'Liquidazione IVA febbraio', description: 'IVA mese precedente', category: 'iva' },
      { date: new Date(year, 3, 16), label: 'Liquidazione IVA trimestrale Q1', description: 'IVA trimestre precedente', category: 'iva' },
      { date: new Date(year, 6, 16), label: 'Liquidazione IVA trimestrale Q2', description: 'IVA trimestre precedente', category: 'iva' },
      { date: new Date(year, 9, 16), label: 'Liquidazione IVA trimestrale Q3', description: 'IVA trimestre precedente', category: 'iva' },
    )
  }

  // Filter to upcoming and sort
  const upcoming = deadlines
    .filter(d => d.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return upcoming.slice(0, 3)
}

// ---------------------------------------------------------------------------
// Labels for fiscal display
// ---------------------------------------------------------------------------

/**
 * Get the KPI labels appropriate for the organization's fiscal regime.
 */
export function getFiscalKpiLabels(settings: PropertyFiscalSettings) {
  const labels: Array<{ key: string; label: string; visible: boolean }> = [
    { key: 'gross', label: 'Revenue Lordo', visible: true },
    { key: 'commissions', label: 'Commissioni OTA', visible: true },
    { key: 'tourist_tax', label: 'Tassa di Soggiorno', visible: true },
    { key: 'iva', label: 'IVA', visible: settings.hasVat && settings.fiscalRegime !== 'forfettario' },
    { key: 'ritenuta_ota', label: 'Ritenuta OTA 21%', visible: !settings.isImprenditoriale },
    { key: 'cedolare_secca', label: 'Cedolare Secca', visible: settings.cedolareEnabled },
    { key: 'net_income', label: 'Netto Proprietario', visible: true },
  ]

  return labels.filter(l => l.visible)
}

/**
 * Get the table columns appropriate for the fiscal regime.
 */
export function getFiscalTableColumns(settings: PropertyFiscalSettings) {
  const columns: Array<{ key: string; header: string; visible: boolean }> = [
    { key: 'reservation_code', header: 'Codice', visible: true },
    { key: 'check_in', header: 'Check-in', visible: true },
    { key: 'source', header: 'Canale', visible: true },
    { key: 'gross_amount', header: 'Lordo', visible: true },
    { key: 'commission_amount', header: 'Commissione', visible: true },
    { key: 'tourist_tax_amount', header: 'T. Soggiorno', visible: true },
    { key: 'iva_amount', header: 'IVA', visible: settings.hasVat && settings.fiscalRegime !== 'forfettario' },
    { key: 'ritenuta_ota_amount', header: 'Rit. OTA 21%', visible: !settings.isImprenditoriale },
    { key: 'cedolare_secca_amount', header: 'Ced. Secca', visible: settings.cedolareEnabled },
    { key: 'net_income', header: 'Netto', visible: true },
  ]

  return columns.filter(c => c.visible)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round(n: number): number {
  return Math.round(n * 100) / 100
}
