/**
 * ISTAT State Codes (Codici Stato ISTAT)
 *
 * Mapping from ISO 3166-1 alpha-2 country codes to the 9-digit ISTAT codes
 * used by the Italian Ministry of the Interior for the Alloggiati Web system.
 *
 * Source: ISTAT - Classificazione degli stati esteri
 * Format: 9-digit numeric string (e.g. "100000100" for Italy)
 *
 * Structure of the code:
 *   - First digit (1-4): Continent
 *     1 = Europe (Italy), 2 = Europe (other), 3 = Asia, 4 = Americas/Oceania/Africa
 *   - Digits 2-3: "00" (reserved)
 *   - Digits 4-6: "000" (reserved)
 *   - Digits 7-9: Country numeric identifier
 */

/** Map of ISO 3166-1 alpha-2 country codes to 9-digit ISTAT state codes */
export const ISTAT_STATE_CODES: Record<string, string> = {
  // ── Italy ──────────────────────────────────────────────────────────────
  IT: '100000100',

  // ── Europe (EU member states) ──────────────────────────────────────────
  AT: '200000040', // Austria
  BE: '200000056', // Belgium
  BG: '200000100', // Bulgaria
  HR: '200000191', // Croatia
  CY: '200000196', // Cyprus
  CZ: '200000167', // Czech Republic
  DK: '200000208', // Denmark
  EE: '200000233', // Estonia
  FI: '200000246', // Finland
  FR: '200000076', // France
  DE: '200000084', // Germany
  GR: '200000300', // Greece
  HU: '200000348', // Hungary
  IE: '200000372', // Ireland
  LV: '200000428', // Latvia
  LT: '200000440', // Lithuania
  LU: '200000442', // Luxembourg
  MT: '200000470', // Malta
  NL: '200000151', // Netherlands
  PL: '200000176', // Poland
  PT: '200000188', // Portugal
  RO: '200000642', // Romania
  SK: '200000703', // Slovakia
  SI: '200000705', // Slovenia
  ES: '200000203', // Spain
  SE: '200000752', // Sweden

  // ── Europe (non-EU) ────────────────────────────────────────────────────
  AL: '200000008', // Albania
  AD: '200000020', // Andorra
  AM: '200000051', // Armenia
  AZ: '200000031', // Azerbaijan
  BY: '200000112', // Belarus
  BA: '200000070', // Bosnia and Herzegovina
  GE: '200000268', // Georgia
  IS: '200000352', // Iceland
  XK: '200000999', // Kosovo
  LI: '200000438', // Liechtenstein
  MD: '200000498', // Moldova
  MC: '200000492', // Monaco
  ME: '200000499', // Montenegro
  MK: '200000807', // North Macedonia
  NO: '200000578', // Norway
  RS: '200000688', // Serbia
  CH: '200000211', // Switzerland
  TR: '200000792', // Turkey
  UA: '200000804', // Ukraine
  GB: '200000219', // United Kingdom
  VA: '200000336', // Vatican City
  SM: '200000674', // San Marino

  // ── Asia ────────────────────────────────────────────────────────────────
  AF: '300000004', // Afghanistan
  BD: '300000050', // Bangladesh
  CN: '300000156', // China
  IN: '300000356', // India
  ID: '300000360', // Indonesia
  IR: '300000364', // Iran
  IQ: '300000368', // Iraq
  IL: '300000376', // Israel
  JP: '300000392', // Japan
  JO: '300000400', // Jordan
  KZ: '300000398', // Kazakhstan
  KW: '300000414', // Kuwait
  LB: '300000422', // Lebanon
  MY: '300000458', // Malaysia
  PK: '300000586', // Pakistan
  PH: '300000608', // Philippines
  QA: '300000634', // Qatar
  SA: '300000682', // Saudi Arabia
  SG: '300000702', // Singapore
  KR: '300000410', // South Korea
  LK: '300000144', // Sri Lanka
  SY: '300000760', // Syria
  TW: '300000158', // Taiwan
  TH: '300000764', // Thailand
  AE: '300000784', // United Arab Emirates
  UZ: '300000860', // Uzbekistan
  VN: '300000704', // Vietnam

  // ── Africa ──────────────────────────────────────────────────────────────
  DZ: '400000012', // Algeria
  AO: '400000024', // Angola
  CM: '400000120', // Cameroon
  EG: '400000818', // Egypt
  ET: '400000231', // Ethiopia
  GH: '400000288', // Ghana
  KE: '400000404', // Kenya
  LY: '400000434', // Libya
  MA: '400000504', // Morocco
  MZ: '400000508', // Mozambique
  NG: '400000566', // Nigeria
  SN: '400000686', // Senegal
  ZA: '400000710', // South Africa
  TN: '400000788', // Tunisia

  // ── Americas ────────────────────────────────────────────────────────────
  AR: '400000032', // Argentina
  BR: '400000076', // Brazil
  CA: '400000124', // Canada
  CL: '400000152', // Chile
  CO: '400000170', // Colombia
  CR: '400000188', // Costa Rica
  CU: '400000192', // Cuba
  DO: '400000214', // Dominican Republic
  EC: '400000218', // Ecuador
  SV: '400000222', // El Salvador
  GT: '400000320', // Guatemala
  HN: '400000340', // Honduras
  JM: '400000388', // Jamaica
  MX: '400000484', // Mexico
  NI: '400000558', // Nicaragua
  PA: '400000591', // Panama
  PY: '400000600', // Paraguay
  PE: '400000604', // Peru
  US: '400000336', // United States
  UY: '400000858', // Uruguay
  VE: '400000862', // Venezuela

  // ── Oceania ─────────────────────────────────────────────────────────────
  AU: '400000036', // Australia
  NZ: '400000554', // New Zealand
}

/**
 * Retrieve the ISTAT 9-digit state code for a given ISO 3166-1 alpha-2 country code.
 *
 * @param countryIso2 - Two-letter country code (case-insensitive)
 * @returns The 9-digit ISTAT state code, or null if not found
 */
export function getIstatCodeByIso2(countryIso2: string): string | null {
  return ISTAT_STATE_CODES[countryIso2.toUpperCase()] ?? null
}

/**
 * Check whether a given country code is Italy.
 */
export function isItaly(countryIso2: string): boolean {
  return countryIso2.toUpperCase() === 'IT'
}

/**
 * Get the display name (in Italian) of a country given its ISO alpha-2 code.
 * This is a subset of common countries for UI display purposes.
 */
export const COUNTRY_NAMES_IT: Record<string, string> = {
  IT: 'Italia',
  AT: 'Austria',
  BE: 'Belgio',
  BG: 'Bulgaria',
  HR: 'Croazia',
  CY: 'Cipro',
  CZ: 'Repubblica Ceca',
  DK: 'Danimarca',
  EE: 'Estonia',
  FI: 'Finlandia',
  FR: 'Francia',
  DE: 'Germania',
  GR: 'Grecia',
  HU: 'Ungheria',
  IE: 'Irlanda',
  LV: 'Lettonia',
  LT: 'Lituania',
  LU: 'Lussemburgo',
  MT: 'Malta',
  NL: 'Paesi Bassi',
  PL: 'Polonia',
  PT: 'Portogallo',
  RO: 'Romania',
  SK: 'Slovacchia',
  SI: 'Slovenia',
  ES: 'Spagna',
  SE: 'Svezia',
  AL: 'Albania',
  AD: 'Andorra',
  BA: 'Bosnia ed Erzegovina',
  CH: 'Svizzera',
  GB: 'Regno Unito',
  IS: 'Islanda',
  ME: 'Montenegro',
  MK: 'Macedonia del Nord',
  NO: 'Norvegia',
  RS: 'Serbia',
  TR: 'Turchia',
  UA: 'Ucraina',
  RU: 'Russia',
  MD: 'Moldavia',
  CN: 'Cina',
  JP: 'Giappone',
  KR: 'Corea del Sud',
  IN: 'India',
  IL: 'Israele',
  SA: 'Arabia Saudita',
  AE: 'Emirati Arabi Uniti',
  US: 'Stati Uniti',
  CA: 'Canada',
  MX: 'Messico',
  BR: 'Brasile',
  AR: 'Argentina',
  AU: 'Australia',
  NZ: 'Nuova Zelanda',
  EG: 'Egitto',
  MA: 'Marocco',
  TN: 'Tunisia',
  ZA: 'Sudafrica',
  NG: 'Nigeria',
}
