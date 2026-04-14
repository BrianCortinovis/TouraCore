// Audit writer per azioni eseguite tramite agenzia

import { createServiceRoleClient } from '@touracore/db/server'

interface AgencyAuditParams {
  readonly tenantId: string
  readonly userId: string
  readonly agencyId: string
  readonly action: string
  readonly entityType: string
  readonly entityId?: string
  readonly oldData?: Record<string, unknown>
  readonly newData?: Record<string, unknown>
  readonly ipAddress?: string
  readonly userAgent?: string
}

/**
 * Scrive un record nell'audit_log con via_agency_id impostato.
 * Usa service_role per bypassare RLS (la scrittura audit non deve fallire per permessi).
 */
export async function writeAgencyAuditEntry(params: AgencyAuditParams): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    const { error } = await supabase.from('audit_logs').insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      via_agency_id: params.agencyId,
    })

    if (error) {
      console.error('[agency-audit] Errore scrittura audit:', error.message)
    }
  } catch (err) {
    console.error('[agency-audit] Errore imprevisto:', err instanceof Error ? err.message : String(err))
  }
}
