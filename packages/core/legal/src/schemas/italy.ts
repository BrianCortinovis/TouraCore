import { z } from 'zod'

// Regex codice fiscale italiano: 16 caratteri alfanumerici
const CODICE_FISCALE_REGEX = /^[A-Z0-9]{16}$/i

// Regex P.IVA italiana: 11 cifre
const PARTITA_IVA_REGEX = /^\d{11}$/

// Regex codice SDI: 7 caratteri alfanumerici
const SDI_CODE_REGEX = /^[A-Z0-9]{7}$/i

// Regex ATECO: formato XX.XX.XX
const ATECO_REGEX = /^\d{2}\.\d{2}(\.\d{2})?$/

// Regex CIN: formato IT + codice regione/provincia + alfanumerico
const CIN_REGEX = /^IT[0-9A-Z-]{5,20}$/i

export const ItalyPrivateSchema = z.object({
  fiscal_code: z
    .string()
    .regex(CODICE_FISCALE_REGEX, 'Il codice fiscale deve essere di 16 caratteri alfanumerici')
    .transform((v) => v.toUpperCase()),
  birth_date: z.string().optional(),
  birth_place: z.string().optional(),
})

export type ItalyPrivateData = z.infer<typeof ItalyPrivateSchema>

export const ItalyBusinessSchema = z.object({
  vat_number: z
    .string()
    .regex(PARTITA_IVA_REGEX, 'La partita IVA deve essere di 11 cifre'),
  fiscal_code: z
    .string()
    .regex(CODICE_FISCALE_REGEX, 'Il codice fiscale deve essere di 16 caratteri alfanumerici')
    .transform((v) => v.toUpperCase()),
  sdi_code: z
    .string()
    .regex(SDI_CODE_REGEX, 'Il codice SDI deve essere di 7 caratteri alfanumerici')
    .transform((v) => v.toUpperCase())
    .optional()
    .or(z.literal('')),
  pec: z
    .string()
    .email('Inserisci un indirizzo PEC valido')
    .optional()
    .or(z.literal('')),
  rea_number: z.string().optional().or(z.literal('')),
  ateco_code: z
    .string()
    .regex(ATECO_REGEX, 'Il codice ATECO deve avere formato XX.XX o XX.XX.XX')
    .optional()
    .or(z.literal('')),
})

export type ItalyBusinessData = z.infer<typeof ItalyBusinessSchema>

export const ItalyPropertyLegalSchema = z.object({
  cin_code: z
    .string()
    .regex(CIN_REGEX, 'Il codice CIN non ha un formato valido')
    .optional()
    .or(z.literal('')),
  fiscal_regime: z.enum(['ordinario', 'forfettario', 'cedolare_secca', 'agriturismo_special']).optional(),
  scia_number: z.string().optional().or(z.literal('')),
  scia_date: z.string().optional().or(z.literal('')),
  insurance_policy_number: z.string().optional().or(z.literal('')),
  insurance_expiry: z.string().optional().or(z.literal('')),
  alloggiati_username: z.string().optional().or(z.literal('')),
  alloggiati_password_encrypted: z.string().optional().or(z.literal('')),
  alloggiati_structure_code: z.string().optional().or(z.literal('')),
  istat_structure_code: z.string().optional().or(z.literal('')),
  istat_region: z.string().optional().or(z.literal('')),
})

export type ItalyPropertyLegalData = z.infer<typeof ItalyPropertyLegalSchema>
