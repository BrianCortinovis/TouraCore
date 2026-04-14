import { createServiceRoleClient } from '@touracore/db/server'
import type { AuditContext } from './types'

interface LogAuditParams {
  readonly context: AuditContext
  readonly action: string
  readonly entityType: string
  readonly entityId?: string
  readonly oldData?: Record<string, unknown>
  readonly newData?: Record<string, unknown>
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  const { context, action, entityType, entityId, oldData, newData } = params

  try {
    const supabase = await createServiceRoleClient()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        tenant_id: context.tenantId,
        user_id: context.userId,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        old_data: oldData ?? null,
        new_data: newData ?? null,
        ip_address: context.ipAddress ?? null,
        user_agent: context.userAgent ?? null,
      })

    if (error) {
      console.error('[audit] Errore scrittura audit log:', error.message)
    }
  } catch (err) {
    console.error('[audit] Errore imprevisto:', err instanceof Error ? err.message : String(err))
  }
}
