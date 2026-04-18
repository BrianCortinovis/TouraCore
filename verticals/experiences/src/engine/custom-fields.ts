import { z } from 'zod'

export interface CustomFieldDef {
  code: string
  label: string
  field_type: string
  required: boolean
  per_guest: boolean
  options: Array<{ value: string; label: string }>
  validation: Record<string, unknown>
}

export function buildZodSchema(fields: CustomFieldDef[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    let s: z.ZodTypeAny
    switch (f.field_type) {
      case 'number':
      case 'age':
      case 'height_cm':
      case 'weight_kg':
      case 'shoe_size':
        s = z.coerce.number()
        break
      case 'email':
        s = z.string().email()
        break
      case 'phone':
        s = z.string().min(5)
        break
      case 'date':
        s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        break
      case 'checkbox':
        s = z.boolean()
        break
      case 'select':
      case 'language':
      case 'clothing_size':
        s = z.enum(f.options.map((o) => o.value) as [string, ...string[]])
        break
      case 'multiselect':
        s = z.array(z.string())
        break
      default:
        s = z.string()
    }
    shape[f.code] = f.required ? s : s.optional()
  }
  return z.object(shape)
}

export function validateCustomFields(fields: CustomFieldDef[], values: Record<string, unknown>) {
  return buildZodSchema(fields).safeParse(values)
}
