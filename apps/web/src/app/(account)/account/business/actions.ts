'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { logAudit, getAuditContext } from '@touracore/audit'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function getBusinessDetailsAction(): Promise<ActionResult> {
  await createServerSupabaseClient()
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  const admin = await createServiceRoleClient()
  const { data, error } = await admin
    .from('tenants')
    .select('name, slug, legal_name, vat_number, fiscal_code, country, legal_type, legal_details, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_postal_code, billing_country')
    .eq('id', bootstrap.tenant.id)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

const BusinessDetailsSchema = z.object({
  legal_name: z.string().max(200).optional().or(z.literal('')),
  vat_number: z.string().max(20).optional().or(z.literal('')),
  fiscal_code: z.string().max(20).optional().or(z.literal('')),
  billing_address_line1: z.string().max(200).optional().or(z.literal('')),
  billing_address_line2: z.string().max(200).optional().or(z.literal('')),
  billing_city: z.string().max(100).optional().or(z.literal('')),
  billing_state: z.string().max(50).optional().or(z.literal('')),
  billing_postal_code: z.string().max(20).optional().or(z.literal('')),
  billing_country: z.string().max(5).optional().or(z.literal('')),
  legal_details: z.record(z.string(), z.string()).optional(),
})

export async function updateBusinessDetailsAction(input: unknown): Promise<ActionResult> {
  const parsed = BusinessDetailsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessione scaduta.' }

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) return { success: false, error: 'Nessuna attività attiva.' }

  const admin = await createServiceRoleClient()
  const { error } = await admin
    .from('tenants')
    .update({
      legal_name: parsed.data.legal_name || null,
      vat_number: parsed.data.vat_number || null,
      fiscal_code: parsed.data.fiscal_code || null,
      billing_address_line1: parsed.data.billing_address_line1 || null,
      billing_address_line2: parsed.data.billing_address_line2 || null,
      billing_city: parsed.data.billing_city || null,
      billing_state: parsed.data.billing_state || null,
      billing_postal_code: parsed.data.billing_postal_code || null,
      billing_country: parsed.data.billing_country || null,
      legal_details: parsed.data.legal_details ?? {},
    })
    .eq('id', bootstrap.tenant.id)

  if (error) return { success: false, error: 'Errore durante il salvataggio.' }

  const auditCtx = await getAuditContext(bootstrap.tenant.id, user.id)
  await logAudit({
    context: auditCtx,
    action: 'tenant.update_business',
    entityType: 'tenant',
    entityId: bootstrap.tenant.id,
    newData: { updated_fields: Object.keys(parsed.data) },
  })

  revalidatePath('/account/business')
  return { success: true }
}
