// Zod schemas per validazione input layer agenzia

import { z } from 'zod'

export const managementModeSchema = z.enum(['agency_managed', 'self_service'])

export const billingModeSchema = z.enum(['client_direct', 'agency_covered'])

export const linkStatusSchema = z.enum(['pending', 'active', 'revoked'])

export const agencyRoleSchema = z.enum(['agency_owner', 'agency_admin', 'agency_member'])

export const createAgencySchema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lo slug deve contenere solo lettere minuscole, numeri e trattini'),
  legal_name: z.string().max(200).optional(),
  billing_email: z.string().email('Email non valida').optional(),
  country: z.string().length(2).default('IT'),
})

export const createAgencyTenantLinkSchema = z.object({
  agency_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role: z.string().default('manager'),
  default_management_mode: managementModeSchema.default('self_service'),
  billing_mode: billingModeSchema.default('client_direct'),
})

export const updateAgencyTenantLinkSchema = z.object({
  status: linkStatusSchema.optional(),
  default_management_mode: managementModeSchema.optional(),
  billing_mode: billingModeSchema.optional(),
})

export type CreateAgencyInput = z.infer<typeof createAgencySchema>
export type CreateAgencyTenantLinkInput = z.infer<typeof createAgencyTenantLinkSchema>
export type UpdateAgencyTenantLinkInput = z.infer<typeof updateAgencyTenantLinkSchema>
