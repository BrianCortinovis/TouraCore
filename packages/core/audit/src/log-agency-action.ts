import { createServiceRoleClient } from '@touracore/db/server'

export type AgencyAuditActorRole =
  | 'platform_admin'
  | 'agency_owner'
  | 'agency_admin'
  | 'agency_member'
  | 'tenant'
  | 'system'

export type AgencyAuditStatus = 'ok' | 'denied' | 'error'

export interface LogAgencyActionParams {
  readonly action: string
  readonly actorUserId?: string | null
  readonly actorEmail?: string | null
  readonly actorRole?: AgencyAuditActorRole | null
  readonly agencyId?: string | null
  readonly tenantId?: string | null
  readonly targetType?: string | null
  readonly targetId?: string | null
  readonly status?: AgencyAuditStatus
  readonly ipAddress?: string | null
  readonly userAgent?: string | null
  readonly metadata?: Record<string, unknown>
}

export async function logAgencyAction(params: LogAgencyActionParams): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()
    const { error } = await supabase.from('agency_audit_logs').insert({
      action: params.action,
      actor_user_id: params.actorUserId ?? null,
      actor_email: params.actorEmail ?? null,
      actor_role: params.actorRole ?? null,
      agency_id: params.agencyId ?? null,
      tenant_id: params.tenantId ?? null,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      status: params.status ?? 'ok',
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      metadata: params.metadata ?? {},
    })
    if (error) {
      console.error('[audit:agency] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[audit:agency] unexpected:', err instanceof Error ? err.message : String(err))
  }
}
