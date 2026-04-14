/**
 * ISTAT C59 Model Calculator
 *
 * Implements the Italian National Institute of Statistics (ISTAT) model C/59
 * for accommodation statistics reporting. All accommodation facilities in Italy
 * are required to submit monthly data on arrivals and presences, broken down
 * by guest nationality (foreigners) and province of residence (Italians).
 *
 * Legal basis: D.Lgs. 322/1989, D.P.R. 394/1999, Circolare ISTAT
 */

import {
  parseISO,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  isSameMonth,
  format,
  max as dateMax,
  min as dateMin,
} from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IstatReservation {
  check_in: string
  check_out: string
  guest_nationality: string // ISO 3166-1 alpha-2
  guest_province: string | null // Italian province code (e.g. "MI") for IT guests
  adults: number
  children: number
  status: string // only 'checked_in' and 'checked_out' are counted
}

export interface IstatData {
  month: number
  year: number
  italian_arrivals: number
  italian_presences: number
  foreign_arrivals: number
  foreign_presences: number
  breakdown_italian: { province: string; arrivals: number; presences: number }[]
  breakdown_foreign: { country: string; arrivals: number; presences: number }[]
}

export interface IstatOrganization {
  istat_structure_code: string | null
  istat_region: string | null
  name: string
  city: string | null
  province: string | null
}

// ---------------------------------------------------------------------------
// Province and country labels used in the C/59 report output
// ---------------------------------------------------------------------------

const ITALIAN_PROVINCE_NAMES: Record<string, string> = {
  AG: 'Agrigento', AL: 'Alessandria', AN: 'Ancona', AO: 'Aosta',
  AR: 'Arezzo', AP: 'Ascoli Piceno', AT: 'Asti', AV: 'Avellino',
  BA: 'Bari', BT: 'Barletta-Andria-Trani', BL: 'Belluno', BN: 'Benevento',
  BG: 'Bergamo', BI: 'Biella', BO: 'Bologna', BZ: 'Bolzano',
  BS: 'Brescia', BR: 'Brindisi', CA: 'Cagliari', CL: 'Caltanissetta',
  CB: 'Campobasso', CE: 'Caserta', CT: 'Catania', CZ: 'Catanzaro',
  CH: 'Chieti', CO: 'Como', CS: 'Cosenza', CR: 'Cremona',
  KR: 'Crotone', CN: 'Cuneo', EN: 'Enna', FM: 'Fermo',
  FE: 'Ferrara', FI: 'Firenze', FG: 'Foggia', FC: 'Forli-Cesena',
  FR: 'Frosinone', GE: 'Genova', GO: 'Gorizia', GR: 'Grosseto',
  IM: 'Imperia', IS: 'Isernia', SP: 'La Spezia', AQ: "L'Aquila",
  LT: 'Latina', LE: 'Lecce', LC: 'Lecco', LI: 'Livorno',
  LO: 'Lodi', LU: 'Lucca', MC: 'Macerata', MN: 'Mantova',
  MS: 'Massa-Carrara', MT: 'Matera', ME: 'Messina', MI: 'Milano',
  MO: 'Modena', MB: 'Monza e Brianza', NA: 'Napoli', NO: 'Novara',
  NU: 'Nuoro', OR: 'Oristano', PD: 'Padova', PA: 'Palermo',
  PR: 'Parma', PV: 'Pavia', PG: 'Perugia', PU: 'Pesaro e Urbino',
  PE: 'Pescara', PC: 'Piacenza', PI: 'Pisa', PT: 'Pistoia',
  PN: 'Pordenone', PZ: 'Potenza', PO: 'Prato', RG: 'Ragusa',
  RA: 'Ravenna', RC: 'Reggio Calabria', RE: 'Reggio Emilia', RI: 'Rieti',
  RN: 'Rimini', RM: 'Roma', RO: 'Rovigo', SA: 'Salerno',
  SS: 'Sassari', SV: 'Savona', SI: 'Siena', SR: 'Siracusa',
  SO: 'Sondrio', SU: 'Sud Sardegna', TA: 'Taranto', TE: 'Teramo',
  TR: 'Terni', TO: 'Torino', TP: 'Trapani', TN: 'Trento',
  TV: 'Treviso', TS: 'Trieste', UD: 'Udine', VA: 'Varese',
  VE: 'Venezia', VB: 'Verbano-Cusio-Ossola', VC: 'Vercelli', VR: 'Verona',
  VV: 'Vibo Valentia', VI: 'Vicenza', VT: 'Viterbo',
}

/** Subset of ISO 3166-1 country names commonly used in ISTAT reporting. */
const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgio', BG: 'Bulgaria', CY: 'Cipro',
  CZ: 'Cechia', DE: 'Germania', DK: 'Danimarca', EE: 'Estonia',
  ES: 'Spagna', FI: 'Finlandia', FR: 'Francia', GR: 'Grecia',
  HR: 'Croazia', HU: 'Ungheria', IE: 'Irlanda', LT: 'Lituania',
  LU: 'Lussemburgo', LV: 'Lettonia', MT: 'Malta', NL: 'Paesi Bassi',
  PL: 'Polonia', PT: 'Portogallo', RO: 'Romania', SE: 'Svezia',
  SI: 'Slovenia', SK: 'Slovacchia', CH: 'Svizzera', GB: 'Regno Unito',
  US: 'Stati Uniti', CA: 'Canada', BR: 'Brasile', AR: 'Argentina',
  MX: 'Messico', CN: 'Cina', JP: 'Giappone', KR: 'Corea del Sud',
  IN: 'India', AU: 'Australia', NZ: 'Nuova Zelanda', RU: 'Russia',
  UA: 'Ucraina', TR: 'Turchia', IL: 'Israele', ZA: 'Sudafrica',
  EG: 'Egitto', MA: 'Marocco', TN: 'Tunisia', SA: 'Arabia Saudita',
  AE: 'Emirati Arabi Uniti', NO: 'Norvegia', IS: 'Islanda',
  RS: 'Serbia', BA: 'Bosnia-Erzegovina', ME: 'Montenegro',
  MK: 'Macedonia del Nord', AL: 'Albania', XK: 'Kosovo',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_STATUSES = new Set(['checked_in', 'checked_out'])

function isItalian(nationality: string): boolean {
  return nationality.toUpperCase() === 'IT'
}

/**
 * Calculate the number of overnight presences in a given month for a
 * reservation. A "presence" in ISTAT terminology corresponds to one night
 * spent in the accommodation. The check-out day is NOT counted as a presence
 * because the guest does not sleep that night.
 *
 * Example: check-in Jan 28, check-out Feb 3 => Jan presences = 3 (nights of
 * 28, 29, 30), Feb presences = 3 (nights of 31-Jan counted in Jan, then
 * Feb 1, 2, 3... wait, the guest sleeps the night of Feb 1 and Feb 2 but
 * leaves on Feb 3 — so Feb presences = 2? No. Let's think again:
 *
 * Nights are: Jan28->29, Jan29->30, Jan30->31, Jan31->Feb1, Feb1->Feb2, Feb2->Feb3
 * The "night" is attributed to the date of check-in for that night. So:
 * Jan: 28, 29, 30, 31 = 4 nights... but Jan 31 -> Feb 1, is that a Jan night?
 *
 * ISTAT convention: the presence is attributed to the day the guest is registered
 * as present in the accommodation. The standard approach is:
 * - Presences = number of nights = differenceInCalendarDays(check_out, check_in)
 * - For a given month, presences = overlap days between [check_in, check_out)
 *   intersected with [monthStart, monthEnd].
 *
 * We clamp [check_in, check_out) to [monthStart, monthEnd+1) and count the days.
 */
function calculatePresencesInMonth(
  checkIn: Date,
  checkOut: Date,
  month: number,
  year: number,
  guestCount: number,
): number {
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))
  // The day after monthEnd is the first day of the next month
  const monthCeiling = new Date(year, month, 1)

  // The reservation's "presence window" is [checkIn, checkOut) — half-open
  const overlapStart = dateMax([checkIn, monthStart])
  const overlapEnd = dateMin([checkOut, monthCeiling])

  const nights = differenceInCalendarDays(overlapEnd, overlapStart)
  if (nights <= 0) return 0

  return nights * guestCount
}

/**
 * Determine if a reservation counts as an "arrival" in the given month.
 * An arrival is counted when the check-in date falls within the reporting month.
 */
function isArrivalInMonth(checkIn: Date, month: number, year: number): boolean {
  return checkIn.getFullYear() === year && checkIn.getMonth() + 1 === month
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate ISTAT arrivals and presences from reservation data, grouped by
 * nationality (for foreign guests) and province of residence (for Italian guests).
 *
 * Only reservations with status 'checked_in' or 'checked_out' are counted.
 */
export function calculateIstatData(
  reservations: IstatReservation[],
  month: number,
  year: number,
): IstatData {
  const italianMap = new Map<string, { arrivals: number; presences: number }>()
  const foreignMap = new Map<string, { arrivals: number; presences: number }>()

  let italianArrivals = 0
  let italianPresences = 0
  let foreignArrivals = 0
  let foreignPresences = 0

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))

  for (const res of reservations) {
    // Only count valid statuses
    if (!VALID_STATUSES.has(res.status)) continue

    const checkIn = parseISO(res.check_in)
    const checkOut = parseISO(res.check_out)

    // Skip reservations that have no overlap with the reporting month
    if (isAfter(checkIn, monthEnd) || isBefore(checkOut, monthStart) || differenceInCalendarDays(checkOut, monthStart) <= 0) {
      continue
    }

    const guestCount = res.adults + res.children
    if (guestCount <= 0) continue

    const presences = calculatePresencesInMonth(checkIn, checkOut, month, year, guestCount)
    const arrival = isArrivalInMonth(checkIn, month, year)
    // For ISTAT, one arrival is counted per reservation (not per guest)
    // However, many regional implementations count arrivals = number of guests.
    // The standard C/59 model counts arrivals as number of guests arriving.
    const arrivalCount = arrival ? guestCount : 0

    const nationality = res.guest_nationality.toUpperCase()

    if (isItalian(nationality)) {
      const province = res.guest_province?.toUpperCase() || 'ND' // ND = Non Determinata
      const entry = italianMap.get(province) ?? { arrivals: 0, presences: 0 }
      entry.arrivals += arrivalCount
      entry.presences += presences
      italianMap.set(province, entry)

      italianArrivals += arrivalCount
      italianPresences += presences
    } else {
      const country = nationality
      const entry = foreignMap.get(country) ?? { arrivals: 0, presences: 0 }
      entry.arrivals += arrivalCount
      entry.presences += presences
      foreignMap.set(country, entry)

      foreignArrivals += arrivalCount
      foreignPresences += presences
    }
  }

  // Sort breakdowns alphabetically by key
  const breakdownItalian = Array.from(italianMap.entries())
    .map(([province, data]) => ({ province, ...data }))
    .sort((a, b) => a.province.localeCompare(b.province))

  const breakdownForeign = Array.from(foreignMap.entries())
    .map(([country, data]) => ({ country, ...data }))
    .sort((a, b) => a.country.localeCompare(b.country))

  return {
    month,
    year,
    italian_arrivals: italianArrivals,
    italian_presences: italianPresences,
    foreign_arrivals: foreignArrivals,
    foreign_presences: foreignPresences,
    breakdown_italian: breakdownItalian,
    breakdown_foreign: breakdownForeign,
  }
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function getProvinceName(code: string): string {
  return ITALIAN_PROVINCE_NAMES[code] ?? code
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

/**
 * Generate the C/59 ISTAT report in the standard text format.
 *
 * The output follows the official tabular layout used for data submission
 * to the regional statistics offices (Uffici di Statistica Regionale).
 */
export function generateIstatC59Report(data: IstatData, organization: IstatOrganization): string {
  const lines: string[] = []
  const separator = '='.repeat(72)
  const thinSeparator = '-'.repeat(72)

  // Header
  lines.push(separator)
  lines.push('MODELLO ISTAT C/59 - MOVIMENTO DEI CLIENTI')
  lines.push('NEGLI ESERCIZI RICETTIVI')
  lines.push(separator)
  lines.push('')
  lines.push(`Codice struttura: ${organization.istat_structure_code ?? 'N/D'}`)
  lines.push(`Struttura:        ${organization.name}`)
  if (organization.city) {
    lines.push(`Comune:           ${organization.city}${organization.province ? ` (${organization.province})` : ''}`)
  }
  if (organization.istat_region) {
    lines.push(`Regione:          ${organization.istat_region}`)
  }
  lines.push(`Mese di rif.:     ${MONTH_NAMES[data.month - 1]} ${data.year}`)
  lines.push('')

  // Table header
  const colProvCountry = 36
  const colArrivals = 14
  const colPresences = 14

  function formatRow(label: string, arrivals: number | string, presences: number | string): string {
    const aStr = typeof arrivals === 'number' ? arrivals.toLocaleString('it-IT') : arrivals
    const pStr = typeof presences === 'number' ? presences.toLocaleString('it-IT') : presences
    return `${padRight(label, colProvCountry)} ${padLeft(aStr, colArrivals)} ${padLeft(pStr, colPresences)}`
  }

  // Section A — Italian guests
  lines.push(thinSeparator)
  lines.push('SEZIONE A - CLIENTI ITALIANI')
  lines.push(thinSeparator)
  lines.push(formatRow('Provincia di residenza', 'Arrivi', 'Presenze'))
  lines.push(thinSeparator)

  for (const row of data.breakdown_italian) {
    const label = `${getProvinceName(row.province)} (${row.province})`
    lines.push(formatRow(label, row.arrivals, row.presences))
  }

  lines.push(thinSeparator)
  lines.push(formatRow('TOTALE ITALIANI', data.italian_arrivals, data.italian_presences))
  lines.push('')

  // Section B — Foreign guests
  lines.push(thinSeparator)
  lines.push('SEZIONE B - CLIENTI STRANIERI')
  lines.push(thinSeparator)
  lines.push(formatRow('Paese di cittadinanza', 'Arrivi', 'Presenze'))
  lines.push(thinSeparator)

  for (const row of data.breakdown_foreign) {
    const label = `${getCountryName(row.country)} (${row.country})`
    lines.push(formatRow(label, row.arrivals, row.presences))
  }

  lines.push(thinSeparator)
  lines.push(formatRow('TOTALE STRANIERI', data.foreign_arrivals, data.foreign_presences))
  lines.push('')

  // Grand total
  lines.push(separator)
  lines.push(formatRow(
    'TOTALE GENERALE',
    data.italian_arrivals + data.foreign_arrivals,
    data.italian_presences + data.foreign_presences,
  ))
  lines.push(separator)
  lines.push('')
  lines.push(`Generato il: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate the ISTAT data for common errors before submission.
 */
export function validateIstatData(data: IstatData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Month range
  if (data.month < 1 || data.month > 12) {
    errors.push(`Mese non valido: ${data.month}. Deve essere compreso tra 1 e 12.`)
  }

  // Year sanity check
  if (data.year < 2000 || data.year > 2100) {
    errors.push(`Anno non valido: ${data.year}.`)
  }

  // Negative values
  if (data.italian_arrivals < 0) errors.push('Gli arrivi italiani non possono essere negativi.')
  if (data.italian_presences < 0) errors.push('Le presenze italiane non possono essere negative.')
  if (data.foreign_arrivals < 0) errors.push('Gli arrivi stranieri non possono essere negativi.')
  if (data.foreign_presences < 0) errors.push('Le presenze straniere non possono essere negative.')

  // Arrivals cannot exceed presences (each arrival implies at least 1 presence)
  if (data.italian_arrivals > data.italian_presences && data.italian_presences > 0) {
    errors.push(
      `Gli arrivi italiani (${data.italian_arrivals}) superano le presenze (${data.italian_presences}). ` +
      'Ogni arrivo genera almeno una presenza.',
    )
  }
  if (data.foreign_arrivals > data.foreign_presences && data.foreign_presences > 0) {
    errors.push(
      `Gli arrivi stranieri (${data.foreign_arrivals}) superano le presenze (${data.foreign_presences}). ` +
      'Ogni arrivo genera almeno una presenza.',
    )
  }

  // Breakdown totals must match header totals
  const italianBreakdownArrivals = data.breakdown_italian.reduce((sum, r) => sum + r.arrivals, 0)
  const italianBreakdownPresences = data.breakdown_italian.reduce((sum, r) => sum + r.presences, 0)
  if (italianBreakdownArrivals !== data.italian_arrivals) {
    errors.push(
      `Totale arrivi italiani nel dettaglio (${italianBreakdownArrivals}) non corrisponde ` +
      `al totale dichiarato (${data.italian_arrivals}).`,
    )
  }
  if (italianBreakdownPresences !== data.italian_presences) {
    errors.push(
      `Totale presenze italiane nel dettaglio (${italianBreakdownPresences}) non corrisponde ` +
      `al totale dichiarato (${data.italian_presences}).`,
    )
  }

  const foreignBreakdownArrivals = data.breakdown_foreign.reduce((sum, r) => sum + r.arrivals, 0)
  const foreignBreakdownPresences = data.breakdown_foreign.reduce((sum, r) => sum + r.presences, 0)
  if (foreignBreakdownArrivals !== data.foreign_arrivals) {
    errors.push(
      `Totale arrivi stranieri nel dettaglio (${foreignBreakdownArrivals}) non corrisponde ` +
      `al totale dichiarato (${data.foreign_arrivals}).`,
    )
  }
  if (foreignBreakdownPresences !== data.foreign_presences) {
    errors.push(
      `Totale presenze straniere nel dettaglio (${foreignBreakdownPresences}) non corrisponde ` +
      `al totale dichiarato (${data.foreign_presences}).`,
    )
  }

  // Validate Italian province codes
  for (const row of data.breakdown_italian) {
    if (row.province !== 'ND' && !ITALIAN_PROVINCE_NAMES[row.province]) {
      errors.push(`Codice provincia sconosciuto: "${row.province}".`)
    }
  }

  // Validate foreign country codes (basic: must be 2 uppercase letters)
  for (const row of data.breakdown_foreign) {
    if (!/^[A-Z]{2}$/.test(row.country)) {
      errors.push(`Codice paese non valido: "${row.country}". Utilizzare il formato ISO 3166-1 alpha-2.`)
    }
    if (row.country === 'IT') {
      errors.push('Il codice "IT" appare tra gli stranieri. I clienti italiani devono essere in Sezione A.')
    }
  }

  // Check for duplicate entries
  const italianProvinces = data.breakdown_italian.map(r => r.province)
  const italianDuplicates = italianProvinces.filter((p, i) => italianProvinces.indexOf(p) !== i)
  if (italianDuplicates.length > 0) {
    errors.push(`Province duplicate nella sezione italiana: ${[...new Set(italianDuplicates)].join(', ')}.`)
  }

  const foreignCountries = data.breakdown_foreign.map(r => r.country)
  const foreignDuplicates = foreignCountries.filter((c, i) => foreignCountries.indexOf(c) !== i)
  if (foreignDuplicates.length > 0) {
    errors.push(`Paesi duplicati nella sezione stranieri: ${[...new Set(foreignDuplicates)].join(', ')}.`)
  }

  return { valid: errors.length === 0, errors }
}
