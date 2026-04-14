export interface AuditLogEntry {
  readonly tenant_id: string
  readonly user_id: string
  readonly action: string
  readonly entity_type: string
  readonly entity_id?: string
  readonly old_data?: Record<string, unknown>
  readonly new_data?: Record<string, unknown>
  readonly ip_address?: string
  readonly user_agent?: string
}

export interface AuditContext {
  readonly tenantId: string
  readonly userId: string
  readonly ipAddress?: string
  readonly userAgent?: string
}
