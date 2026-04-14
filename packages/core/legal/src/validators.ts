import type { CountryCode, LegalType, ValidationResult, ValidationError } from './types'
import { ItalyPrivateSchema, ItalyBusinessSchema, ItalyPropertyLegalSchema } from './schemas/italy'
import { SwitzerlandPlaceholderSchema } from './schemas/switzerland'
import { FrancePlaceholderSchema } from './schemas/france'
import { AustriaPlaceholderSchema } from './schemas/austria'
import { GermanyPlaceholderSchema } from './schemas/germany'

function zodToValidationErrors(zodError: { issues: Array<{ path: PropertyKey[]; message: string }> }): ValidationError[] {
  return zodError.issues.map((issue) => ({
    field: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

export function validateTenantLegalDetails(
  country: CountryCode,
  legalType: LegalType,
  data: unknown
): ValidationResult<Record<string, unknown>> {
  if (country === 'IT') {
    const schema = legalType === 'private' ? ItalyPrivateSchema : ItalyBusinessSchema
    const result = schema.safeParse(data)
    if (result.success) return { success: true, data: result.data as Record<string, unknown> }
    return { success: false, errors: zodToValidationErrors(result.error) }
  }

  // Paesi placeholder: accettano qualunque cosa
  const placeholderSchemas: Record<string, typeof SwitzerlandPlaceholderSchema> = {
    CH: SwitzerlandPlaceholderSchema,
    FR: FrancePlaceholderSchema,
    AT: AustriaPlaceholderSchema,
    DE: GermanyPlaceholderSchema,
  }

  const schema = placeholderSchemas[country]
  if (!schema) return { success: false, errors: [{ field: 'country', message: 'Paese non supportato' }] }

  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data as Record<string, unknown> }
  return { success: false, errors: zodToValidationErrors(result.error) }
}

export function validatePropertyLegalDetails(
  country: CountryCode,
  data: unknown
): ValidationResult<Record<string, unknown>> {
  if (country === 'IT') {
    const result = ItalyPropertyLegalSchema.safeParse(data)
    if (result.success) return { success: true, data: result.data as Record<string, unknown> }
    return { success: false, errors: zodToValidationErrors(result.error) }
  }

  // Paesi placeholder: accettano qualunque cosa
  const placeholderSchemas: Record<string, typeof SwitzerlandPlaceholderSchema> = {
    CH: SwitzerlandPlaceholderSchema,
    FR: FrancePlaceholderSchema,
    AT: AustriaPlaceholderSchema,
    DE: GermanyPlaceholderSchema,
  }

  const schema = placeholderSchemas[country]
  if (!schema) return { success: false, errors: [{ field: 'country', message: 'Paese non supportato' }] }

  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data as Record<string, unknown> }
  return { success: false, errors: zodToValidationErrors(result.error) }
}
