/**
 * CIN (Codice Identificativo Nazionale) Validator
 *
 * Validates and formats the CIN assigned to Italian accommodation facilities
 * per D.L. 145/2023 (Art. 13-ter), converted with modifications by
 * L. 191/2023. The CIN replaces the previous regional identification systems
 * and is mandatory for all accommodation structures operating in Italy.
 *
 * The CIN is issued by the Ministero del Turismo through the BDSR
 * (Banca Dati delle Strutture Ricettive) and must be displayed on all
 * external signage and online advertisements (portals, OTAs, website).
 *
 * CIN Format: IT + 3-digit province code + alphanumeric code
 *   Example: IT037ABC12345DE
 *
 * Key regulations:
 * - D.L. 145/2023 Art. 13-ter (istituzione del CIN)
 * - L. 191/2023 (conversione in legge con modificazioni)
 * - D.M. Turismo 06/06/2024 (modalita' operative e sanzioni)
 * - Circolare Ministero del Turismo n. 0032983/2024
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Regular expression for validating the CIN format.
 *
 * Structure:
 * - "IT" prefix (case-insensitive during validation, stored uppercase)
 * - 3-digit province code (ISTAT numeric province code, 001-110)
 * - Alphanumeric code (letters and digits, variable length, min 1 char)
 *
 * The full CIN is typically 10-16 characters long, but the specification
 * does not enforce a strict maximum on the alphanumeric suffix.
 */
export const CIN_REGEX = /^IT\d{3}[A-Z0-9]+$/i

/**
 * Valid ISTAT numeric province codes (001-110 plus newer codes).
 * Used to validate the 3-digit province portion of the CIN.
 */
const VALID_PROVINCE_CODES = new Set([
  '001', '002', '003', '004', '005', '006', '007', '008', '009', '010',
  '011', '012', '013', '014', '015', '016', '017', '018', '019', '020',
  '021', '022', '023', '024', '025', '026', '027', '028', '029', '030',
  '031', '032', '033', '034', '035', '036', '037', '038', '039', '040',
  '041', '042', '043', '044', '045', '046', '047', '048', '049', '050',
  '051', '052', '053', '054', '055', '056', '057', '058', '059', '060',
  '061', '062', '063', '064', '065', '066', '067', '068', '069', '070',
  '071', '072', '073', '074', '075', '076', '077', '078', '079', '080',
  '081', '082', '083', '084', '085', '086', '087', '088', '089', '090',
  '091', '092', '093', '094', '095', '096', '097', '098', '099', '100',
  '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
  '111',
])

/** Minimum total length of a valid CIN (IT + 3 digits + at least 1 alphanumeric) */
const CIN_MIN_LENGTH = 6

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a CIN (Codice Identificativo Nazionale) string.
 *
 * Performs the following checks:
 * 1. The value is a non-empty string
 * 2. The value matches the CIN regex pattern (IT + 3 digits + alphanumeric code)
 * 3. The 3-digit province code is a valid ISTAT numeric code
 * 4. The alphanumeric suffix is present and non-empty
 *
 * @param cin - The CIN string to validate
 * @returns Validation result with `valid` flag and array of error messages
 *
 * @example
 * ```ts
 * const result = validateCIN('IT037ABC12345DE')
 * // { valid: true, errors: [] }
 *
 * const invalid = validateCIN('XX999')
 * // { valid: false, errors: ['Il CIN deve iniziare con il prefisso "IT".'] }
 * ```
 */
export function validateCIN(cin: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // ── Empty / missing value ──
  if (!cin || cin.trim().length === 0) {
    errors.push('Il CIN e\' obbligatorio (CIN is required).')
    return { valid: false, errors }
  }

  const normalized = cin.trim().toUpperCase()

  // ── Minimum length ──
  if (normalized.length < CIN_MIN_LENGTH) {
    errors.push(
      `Il CIN "${cin}" e' troppo corto. Lunghezza minima: ${CIN_MIN_LENGTH} caratteri ` +
      '(formato: IT + codice provincia 3 cifre + codice alfanumerico).'
    )
    return { valid: false, errors }
  }

  // ── "IT" prefix ──
  if (!normalized.startsWith('IT')) {
    errors.push(
      'Il CIN deve iniziare con il prefisso "IT" (codice paese Italia).'
    )
  }

  // ── Regex format ──
  if (!CIN_REGEX.test(normalized)) {
    errors.push(
      `Il formato del CIN "${cin}" non e' valido. ` +
      'Formato atteso: IT + 3 cifre (codice provincia) + codice alfanumerico ' +
      '(es. IT037ABC12345DE).'
    )
    // If the regex fails, detailed checks below may not apply, so return early
    return { valid: false, errors }
  }

  // ── Province code validation ──
  const provinceCode = normalized.substring(2, 5)
  if (!VALID_PROVINCE_CODES.has(provinceCode)) {
    errors.push(
      `Codice provincia "${provinceCode}" non valido. ` +
      'Il codice deve corrispondere a un codice numerico ISTAT di provincia valido (001-111).'
    )
  }

  // ── Alphanumeric suffix ──
  const suffix = normalized.substring(5)
  if (suffix.length === 0) {
    errors.push(
      'Il CIN deve contenere un codice alfanumerico dopo il codice provincia.'
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Format a CIN string for display.
 *
 * Normalizes the CIN by trimming whitespace and converting to uppercase,
 * as required by the Ministero del Turismo specifications. The CIN must
 * always be displayed in uppercase on signage and online platforms.
 *
 * @param cin - The raw CIN string to format
 * @returns The formatted CIN in uppercase, trimmed of whitespace
 *
 * @example
 * ```ts
 * formatCIN('  it037abc12345de  ')
 * // => 'IT037ABC12345DE'
 * ```
 */
export function formatCIN(cin: string): string {
  return cin.trim().toUpperCase()
}
