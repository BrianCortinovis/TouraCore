/**
 * Alloggiati Web - File Generator
 *
 * Generates the TXT file in the EXACT fixed-width format required by the
 * Italian Police (Questura) Alloggiati Web portal for guest registration.
 *
 * Reference: Circolare Ministero dell'Interno - Art. 109 TULPS
 * Portal: https://alloggiatiweb.poliziadistato.it
 *
 * RECORD FORMAT (one line per guest):
 *   Field  Description               Width  Notes
 *   ─────  ────────────────────────  ─────  ────────────────────────────────
 *    1     Tipo Alloggiato              2   "16" single/head, "17" companion, "18" group member
 *    2     Data arrivo                 10   DD/MM/YYYY
 *    3     Permanenza                   2   Number of nights, right-aligned
 *    4     Cognome                     50   Uppercase, left-aligned, space-padded
 *    5     Nome                        30   Uppercase, left-aligned, space-padded
 *    6     Sesso                        1   "1" = male, "2" = female
 *    7     Data nascita                10   DD/MM/YYYY
 *    8     Comune nascita               9   ISTAT municipality code (Italians only)
 *    9     Provincia nascita            2   Province code (Italians) or "EE" (foreigners)
 *   10     Stato nascita                9   ISTAT 9-digit state code
 *   11     Cittadinanza                 9   ISTAT 9-digit state code
 *   12     Tipo documento               5   IDENT / PASSP / PATGU / PERM / PATEN
 *   13     Numero documento            20   Left-aligned, space-padded
 *   14     Luogo rilascio documento     9   ISTAT code of issuing authority
 *
 * All fields are concatenated WITHOUT separators (pure fixed-width).
 * Lines are terminated by CR+LF (\r\n) per the specification.
 */

import { ISTAT_STATE_CODES, isItaly } from './istat-codes'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AlloggiatiGuest {
  last_name: string
  first_name: string
  gender: 'M' | 'F'
  date_of_birth: string // YYYY-MM-DD
  birth_place: string // ISTAT municipality code (for Italians) or description
  birth_province: string | null // 2-letter province code, or null for foreigners
  birth_country: string // ISO 3166-1 alpha-2
  citizenship: string // ISO 3166-1 alpha-2
  document_type: 'id_card' | 'passport' | 'driving_license' | 'residence_permit'
  document_number: string
  document_issued_by: string | null // ISTAT code of issuing municipality/authority
}

export interface AlloggiatiReservation {
  check_in: string // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
}

export interface AlloggiatiRegistration {
  guest: AlloggiatiGuest
  reservation: AlloggiatiReservation
  is_primary: boolean
  group_leader_index?: number // for companions, 0-based index of the primary guest
}

export interface AlloggiatiValidationResult {
  valid: boolean
  errors: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Record type codes per the Alloggiati Web specification */
export const ALLOGGIATI_TYPE = {
  /** Ospite singolo / Capo famiglia (single guest or head of family) */
  PRIMARY: '16',
  /** Familiare (family companion of the primary guest) */
  COMPANION: '17',
  /** Membro gruppo (member of a group) */
  GROUP_MEMBER: '18',
} as const

/** Field widths for each position in the fixed-width record */
const FIELD_WIDTHS = {
  TIPO_ALLOGGIATO: 2,
  DATA_ARRIVO: 10,
  PERMANENZA: 2,
  COGNOME: 50,
  NOME: 30,
  SESSO: 1,
  DATA_NASCITA: 10,
  COMUNE_NASCITA: 9,
  PROVINCIA_NASCITA: 2,
  STATO_NASCITA: 9,
  CITTADINANZA: 9,
  TIPO_DOCUMENTO: 5,
  NUMERO_DOCUMENTO: 20,
  LUOGO_RILASCIO: 9,
} as const

/**
 * Document type mapping from internal codes to Alloggiati Web codes.
 *
 * The Alloggiati Web system uses specific abbreviated codes:
 *   IDENT = Carta d'identita (identity card)
 *   PASSP = Passaporto (passport)
 *   PATGU = Patente di guida (driving license)
 *   PERM  = Permesso di soggiorno (residence permit)
 *   PATEN = Patente (alternate driving license code)
 */
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  id_card: 'IDENT',
  passport: 'PASSP',
  driving_license: 'PATGU',
  residence_permit: 'PERM',
  // Aliases for flexibility
  carta_identita: 'IDENT',
  passaporto: 'PASSP',
  patente: 'PATGU',
  permesso_soggiorno: 'PERM',
}

/** Province code used for foreign-born guests */
const FOREIGN_PROVINCE = 'EE'

/** Placeholder ISTAT municipality code for foreign birth places */
const FOREIGN_MUNICIPALITY = '999999999'

/** Line terminator per Alloggiati Web specification */
const LINE_TERMINATOR = '\r\n'

// ─── Field Formatting Helpers ────────────────────────────────────────────────

/**
 * Pad or truncate a string to a fixed width, left-aligned with spaces.
 */
function padRight(value: string, width: number): string {
  const sanitized = value.substring(0, width)
  return sanitized.padEnd(width, ' ')
}

/**
 * Pad or truncate a string to a fixed width, right-aligned with spaces.
 */
function padLeft(value: string, width: number): string {
  const sanitized = value.substring(0, width)
  return sanitized.padStart(width, ' ')
}

/**
 * Convert a YYYY-MM-DD date string to DD/MM/YYYY format.
 */
function formatDateDDMMYYYY(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: "${isoDate}". Expected YYYY-MM-DD.`)
  }
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

/**
 * Sanitize a text field: uppercase, remove diacritics, strip non-ASCII.
 * The Alloggiati Web system only accepts basic ASCII uppercase characters.
 */
function sanitizeText(value: string): string {
  return value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^A-Z0-9 \-'/.]/g, '') // keep only safe characters
    .trim()
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert an ISO 3166-1 alpha-2 country code to its ISTAT 9-digit state code.
 *
 * @param countryIso2 - Two-letter country code (case-insensitive)
 * @returns The 9-digit ISTAT code, or "999999999" if the country is unknown
 */
export function getCountryIstatCode(countryIso2: string): string {
  const code = ISTAT_STATE_CODES[countryIso2.toUpperCase()]
  if (!code) {
    console.warn(
      `[alloggiati-web] Unknown country code: "${countryIso2}". Using fallback "999999999".`
    )
    return '999999999'
  }
  return code
}

/**
 * Convert a document type from the internal PMS format to the Alloggiati Web code.
 *
 * @param docType - Internal document type identifier
 * @returns The 5-character Alloggiati code (e.g. "IDENT", "PASSP")
 */
export function getDocumentTypeCode(docType: string): string {
  const code = DOCUMENT_TYPE_MAP[docType]
  if (!code) {
    console.warn(
      `[alloggiati-web] Unknown document type: "${docType}". Defaulting to "IDENT".`
    )
    return 'IDENT'
  }
  return code
}

/**
 * Calculate the number of nights between check-in and check-out dates.
 *
 * @param checkIn - Check-in date in YYYY-MM-DD format
 * @param checkOut - Check-out date in YYYY-MM-DD format
 * @returns Number of nights (minimum 1)
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const inDate = new Date(checkIn + 'T00:00:00')
  const outDate = new Date(checkOut + 'T00:00:00')
  const diffMs = outDate.getTime() - inDate.getTime()
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (nights < 1) {
    throw new Error(
      `Invalid stay duration: check-out (${checkOut}) must be after check-in (${checkIn}).`
    )
  }

  return nights
}

/**
 * Validate that all required fields for an Alloggiati Web submission are present
 * and correctly formatted.
 *
 * @param guest - The guest data to validate
 * @returns Validation result with a list of errors (empty if valid)
 */
export function validateAlloggiatiData(
  guest: AlloggiatiGuest
): AlloggiatiValidationResult {
  const errors: string[] = []

  // ── Required string fields ──
  if (!guest.last_name || guest.last_name.trim().length === 0) {
    errors.push('Cognome obbligatorio (last_name is required).')
  }

  if (!guest.first_name || guest.first_name.trim().length === 0) {
    errors.push('Nome obbligatorio (first_name is required).')
  }

  // ── Gender ──
  if (guest.gender !== 'M' && guest.gender !== 'F') {
    errors.push(
      `Sesso non valido: "${guest.gender}". Deve essere "M" o "F" (gender must be "M" or "F").`
    )
  }

  // ── Date of birth ──
  if (!guest.date_of_birth) {
    errors.push('Data di nascita obbligatoria (date_of_birth is required).')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(guest.date_of_birth)) {
    errors.push(
      `Formato data di nascita non valido: "${guest.date_of_birth}". Usare YYYY-MM-DD.`
    )
  } else {
    const dob = new Date(guest.date_of_birth + 'T00:00:00')
    if (isNaN(dob.getTime())) {
      errors.push(
        `Data di nascita non valida: "${guest.date_of_birth}".`
      )
    }
  }

  // ── Birth country ──
  if (!guest.birth_country || guest.birth_country.trim().length === 0) {
    errors.push('Stato di nascita obbligatorio (birth_country is required).')
  } else if (guest.birth_country.length !== 2) {
    errors.push(
      `Codice stato nascita non valido: "${guest.birth_country}". Usare codice ISO alpha-2 a 2 caratteri.`
    )
  } else {
    const istatCode = ISTAT_STATE_CODES[guest.birth_country.toUpperCase()]
    if (!istatCode) {
      errors.push(
        `Codice stato nascita non riconosciuto: "${guest.birth_country}". Codice ISTAT non trovato.`
      )
    }
  }

  // ── Birth place ──
  if (!guest.birth_place || guest.birth_place.trim().length === 0) {
    errors.push('Luogo di nascita obbligatorio (birth_place is required).')
  }

  // ── Birth province (required for Italians) ──
  if (isItaly(guest.birth_country || '')) {
    if (!guest.birth_province || guest.birth_province.trim().length === 0) {
      errors.push(
        'Provincia di nascita obbligatoria per cittadini italiani (birth_province required for Italian nationals).'
      )
    } else if (!/^[A-Z]{2}$/i.test(guest.birth_province)) {
      errors.push(
        `Provincia di nascita non valida: "${guest.birth_province}". Usare codice di 2 lettere (es. MI, RM).`
      )
    }
  }

  // ── Citizenship ──
  if (!guest.citizenship || guest.citizenship.trim().length === 0) {
    errors.push('Cittadinanza obbligatoria (citizenship is required).')
  } else if (guest.citizenship.length !== 2) {
    errors.push(
      `Codice cittadinanza non valido: "${guest.citizenship}". Usare codice ISO alpha-2 a 2 caratteri.`
    )
  } else {
    const istatCode = ISTAT_STATE_CODES[guest.citizenship.toUpperCase()]
    if (!istatCode) {
      errors.push(
        `Codice cittadinanza non riconosciuto: "${guest.citizenship}". Codice ISTAT non trovato.`
      )
    }
  }

  // ── Document type ──
  if (!guest.document_type) {
    errors.push('Tipo documento obbligatorio (document_type is required).')
  } else if (!DOCUMENT_TYPE_MAP[guest.document_type]) {
    errors.push(
      `Tipo documento non valido: "${guest.document_type}". ` +
        `Valori ammessi: id_card, passport, driving_license, residence_permit.`
    )
  }

  // ── Document number ──
  if (!guest.document_number || guest.document_number.trim().length === 0) {
    errors.push('Numero documento obbligatorio (document_number is required).')
  } else if (guest.document_number.length > 20) {
    errors.push(
      `Numero documento troppo lungo: ${guest.document_number.length} caratteri (massimo 20).`
    )
  }

  // ── Document issuing authority ──
  if (!guest.document_issued_by || guest.document_issued_by.trim().length === 0) {
    errors.push(
      'Luogo rilascio documento obbligatorio (document_issued_by is required).'
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generate a single fixed-width line for one guest record in Alloggiati Web format.
 *
 * @param guest - Guest personal and document data
 * @param reservation - Check-in/check-out dates
 * @param isPrimary - true for head of family/single guest (type 16), false for companion (type 17)
 * @returns A single line string (without line terminator)
 */
export function generateAlloggiatiRecord(
  guest: AlloggiatiGuest,
  reservation: AlloggiatiReservation,
  isPrimary: boolean
): string {
  const nights = calculateNights(reservation.check_in, reservation.check_out)

  // Field 1: Tipo Alloggiato (2 chars)
  const tipoAlloggiato = isPrimary ? ALLOGGIATI_TYPE.PRIMARY : ALLOGGIATI_TYPE.COMPANION

  // Field 2: Data arrivo (10 chars) - DD/MM/YYYY
  const dataArrivo = formatDateDDMMYYYY(reservation.check_in)

  // Field 3: Permanenza (2 chars) - number of nights, right-aligned
  const permanenza = padLeft(String(Math.min(nights, 99)), FIELD_WIDTHS.PERMANENZA)

  // Field 4: Cognome (50 chars) - uppercase, left-aligned
  const cognome = padRight(
    sanitizeText(guest.last_name),
    FIELD_WIDTHS.COGNOME
  )

  // Field 5: Nome (30 chars) - uppercase, left-aligned
  const nome = padRight(
    sanitizeText(guest.first_name),
    FIELD_WIDTHS.NOME
  )

  // Field 6: Sesso (1 char) - "1" male, "2" female
  const sesso = guest.gender === 'M' ? '1' : '2'

  // Field 7: Data nascita (10 chars) - DD/MM/YYYY
  const dataNascita = formatDateDDMMYYYY(guest.date_of_birth)

  // Field 8: Comune nascita (9 chars) - ISTAT municipality code
  // For Italian-born guests: the ISTAT code of the birth municipality
  // For foreign-born guests: "999999999" (placeholder)
  const isBornInItaly = isItaly(guest.birth_country)
  const comuneNascita = padRight(
    isBornInItaly ? guest.birth_place.substring(0, 9) : FOREIGN_MUNICIPALITY,
    FIELD_WIDTHS.COMUNE_NASCITA
  )

  // Field 9: Provincia nascita (2 chars)
  // For Italian-born: 2-letter province code (MI, RM, etc.)
  // For foreign-born: "EE"
  const provinciaNascita = isBornInItaly
    ? padRight((guest.birth_province || '').toUpperCase(), FIELD_WIDTHS.PROVINCIA_NASCITA)
    : padRight(FOREIGN_PROVINCE, FIELD_WIDTHS.PROVINCIA_NASCITA)

  // Field 10: Stato nascita (9 chars) - ISTAT state code
  const statoNascita = padRight(
    getCountryIstatCode(guest.birth_country),
    FIELD_WIDTHS.STATO_NASCITA
  )

  // Field 11: Cittadinanza (9 chars) - ISTAT state code
  const cittadinanza = padRight(
    getCountryIstatCode(guest.citizenship),
    FIELD_WIDTHS.CITTADINANZA
  )

  // Field 12: Tipo documento (5 chars)
  const tipoDocumento = padRight(
    getDocumentTypeCode(guest.document_type),
    FIELD_WIDTHS.TIPO_DOCUMENTO
  )

  // Field 13: Numero documento (20 chars) - uppercase, left-aligned
  const numeroDocumento = padRight(
    sanitizeText(guest.document_number),
    FIELD_WIDTHS.NUMERO_DOCUMENTO
  )

  // Field 14: Luogo rilascio documento (9 chars) - ISTAT code
  const luogoRilascio = padRight(
    (guest.document_issued_by || '').substring(0, 9),
    FIELD_WIDTHS.LUOGO_RILASCIO
  )

  // Assemble the fixed-width record
  return (
    tipoAlloggiato +
    dataArrivo +
    permanenza +
    cognome +
    nome +
    sesso +
    dataNascita +
    comuneNascita +
    provinciaNascita +
    statoNascita +
    cittadinanza +
    tipoDocumento +
    numeroDocumento +
    luogoRilascio
  )
}

/**
 * Generate the complete Alloggiati Web TXT file for a set of guest registrations.
 *
 * The file contains one line per guest. Primary guests (type 16) must appear
 * before their companions (type 17). The function automatically enforces this
 * ordering: primaries are emitted first, followed by their companions in the
 * order they appear in the input array.
 *
 * @param registrations - Array of guest registrations to include in the file
 * @returns The complete file content as a string, ready for upload to the portal
 *
 * @example
 * ```ts
 * const fileContent = generateAlloggiatiFile([
 *   {
 *     guest: primaryGuest,
 *     reservation: { check_in: '2026-02-26', check_out: '2026-03-01' },
 *     is_primary: true,
 *   },
 *   {
 *     guest: companionGuest,
 *     reservation: { check_in: '2026-02-26', check_out: '2026-03-01' },
 *     is_primary: false,
 *     group_leader_index: 0,
 *   },
 * ])
 *
 * // Download or upload the file
 * const blob = new Blob([fileContent], { type: 'text/plain;charset=iso-8859-1' })
 * ```
 */
export function generateAlloggiatiFile(
  registrations: AlloggiatiRegistration[]
): string {
  if (registrations.length === 0) {
    return ''
  }

  // Sort: primaries first, then companions in their original order.
  // This ensures that each capo-famiglia/capo-gruppo appears before their members.
  const sorted = [...registrations].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  })

  const lines: string[] = []

  for (const registration of sorted) {
    const line = generateAlloggiatiRecord(
      registration.guest,
      registration.reservation,
      registration.is_primary
    )
    lines.push(line)
  }

  // Join with CR+LF as required by the specification.
  // The file ends with a final CR+LF after the last record.
  return lines.join(LINE_TERMINATOR) + LINE_TERMINATOR
}

/**
 * Validate an entire set of registrations before generating the file.
 * Returns per-guest validation results so the UI can highlight specific issues.
 *
 * @param registrations - The registrations to validate
 * @returns Array of validation results, one per registration (same order as input)
 */
export function validateAlloggiatiRegistrations(
  registrations: AlloggiatiRegistration[]
): AlloggiatiValidationResult[] {
  return registrations.map((registration, index) => {
    const result = validateAlloggiatiData(registration.guest)
    const errors = [...result.errors]

    // Validate reservation dates
    if (!registration.reservation.check_in) {
      errors.push(`Registrazione #${index + 1}: data check-in mancante.`)
    }
    if (!registration.reservation.check_out) {
      errors.push(`Registrazione #${index + 1}: data check-out mancante.`)
    }

    if (registration.reservation.check_in && registration.reservation.check_out) {
      try {
        const nights = calculateNights(
          registration.reservation.check_in,
          registration.reservation.check_out
        )
        if (nights > 99) {
          errors.push(
            `Registrazione #${index + 1}: permanenza ${nights} notti supera il massimo di 99.`
          )
        }
      } catch {
        errors.push(
          `Registrazione #${index + 1}: date soggiorno non valide (check-out deve essere dopo check-in).`
        )
      }
    }

    // Companion must reference a primary guest
    if (!registration.is_primary && registration.group_leader_index === undefined) {
      errors.push(
        `Registrazione #${index + 1}: ospite accompagnatore senza riferimento al capogruppo (group_leader_index mancante).`
      )
    }

    // Verify primary exists at the referenced index
    if (
      !registration.is_primary &&
      registration.group_leader_index !== undefined
    ) {
      const leader = registrations[registration.group_leader_index]
      if (!leader) {
        errors.push(
          `Registrazione #${index + 1}: group_leader_index ${registration.group_leader_index} non corrisponde a nessuna registrazione.`
        )
      } else if (!leader.is_primary) {
        errors.push(
          `Registrazione #${index + 1}: group_leader_index ${registration.group_leader_index} non punta a un ospite primario.`
        )
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  })
}

/**
 * Calculate the expected total line length for a single Alloggiati Web record.
 * Useful for format verification.
 */
export const ALLOGGIATI_RECORD_LENGTH =
  FIELD_WIDTHS.TIPO_ALLOGGIATO +
  FIELD_WIDTHS.DATA_ARRIVO +
  FIELD_WIDTHS.PERMANENZA +
  FIELD_WIDTHS.COGNOME +
  FIELD_WIDTHS.NOME +
  FIELD_WIDTHS.SESSO +
  FIELD_WIDTHS.DATA_NASCITA +
  FIELD_WIDTHS.COMUNE_NASCITA +
  FIELD_WIDTHS.PROVINCIA_NASCITA +
  FIELD_WIDTHS.STATO_NASCITA +
  FIELD_WIDTHS.CITTADINANZA +
  FIELD_WIDTHS.TIPO_DOCUMENTO +
  FIELD_WIDTHS.NUMERO_DOCUMENTO +
  FIELD_WIDTHS.LUOGO_RILASCIO
// = 2 + 10 + 2 + 50 + 30 + 1 + 10 + 9 + 2 + 9 + 9 + 5 + 20 + 9 = 168 chars per line

/**
 * Verify that a generated record has the correct fixed-width length.
 * Throws if the length is wrong - this is a development safeguard.
 *
 * @param record - A single generated record line (without line terminator)
 */
export function assertRecordLength(record: string): void {
  if (record.length !== ALLOGGIATI_RECORD_LENGTH) {
    throw new Error(
      `[alloggiati-web] Record length mismatch: expected ${ALLOGGIATI_RECORD_LENGTH}, got ${record.length}. ` +
        `This indicates a formatting bug. Record: "${record}"`
    )
  }
}
