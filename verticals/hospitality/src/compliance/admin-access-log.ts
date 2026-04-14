/**
 * Admin Access Logging — Provvedimento Garante 27/11/2008
 *
 * Implements mandatory access logging for system administrators as required
 * by the Italian Data Protection Authority (Garante per la Protezione dei
 * Dati Personali) ruling of 27 November 2008, subsequently updated on
 * 25 June 2009.
 *
 * For Italian accommodation facilities using software that processes
 * personal data, all system administrator accesses must be logged with:
 * - Timestamps (login/logout or session start/end)
 * - Username / user identifier
 * - Description of the event (access type)
 *
 * Logs must be retained for a minimum of 6 months and must be complete,
 * inalterabile (tamper-proof), and verifiable.
 *
 * Key regulations:
 * - Provvedimento Garante Privacy 27/11/2008 (Misure e accorgimenti
 *   prescritti ai titolari dei trattamenti effettuati con strumenti
 *   elettronici relativamente alle attribuzioni delle funzioni di
 *   amministratore di sistema)
 * - Provvedimento Garante Privacy 25/06/2009 (proroga e modifiche)
 * - GDPR Art. 5(2) — Principio di responsabilizzazione (accountability)
 * - D.Lgs. 196/2003 Art. 154-bis (poteri del Garante)
 */

import { format } from 'date-fns'

import type { AuditLog } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminAccessParams {
  tenant_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  ip_address?: string
  user_agent?: string
  session_id: string
  access_type: 'login' | 'logout' | 'data_access' | 'data_modification' | 'export' | 'settings_change'
}

export interface AccessReportEntry {
  timestamp: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  ip_address: string | null
  access_type: string | null
  session_id: string | null
}

export interface AccessReport {
  _metadata: {
    report_type: string
    generated_at: string
    period_from: string
    period_to: string
    total_entries: number
    legal_basis: string
  }
  entries: AccessReportEntry[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Staff roles that qualify as system administrators under the Provvedimento
 * Garante 27/11/2008. These roles have privileged access to systems
 * containing personal data and their accesses must be logged.
 */
export const ADMIN_ROLES: readonly string[] = ['owner', 'manager']

/**
 * Minimum retention period for admin access logs, in months.
 * The Garante requires at least 6 months of retention.
 */
export const MIN_RETENTION_MONTHS = 6

// ---------------------------------------------------------------------------
// Role check
// ---------------------------------------------------------------------------

/**
 * Determine whether a given role qualifies as a system administrator
 * under the Provvedimento Garante 27/11/2008.
 *
 * System administrators ("amministratori di sistema") are defined as
 * figures who manage and maintain IT systems or databases, including
 * database administrators, network administrators, and anyone with
 * privileged access to systems processing personal data.
 */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role)
}

// ---------------------------------------------------------------------------
// Audit log creation
// ---------------------------------------------------------------------------

/**
 * Create an audit log entry for an admin access event.
 *
 * Per the Provvedimento Garante 27/11/2008, the log must include:
 * - Timestamp of the access
 * - Identity of the administrator
 * - Description of the event
 *
 * The returned object matches the AuditLog interface with `is_admin_access`
 * set to `true`, ready for direct insertion into the `audit_logs` table.
 *
 * The `id` and `created_at` fields are omitted as they are generated
 * by the database.
 */
export function createAdminAccessLog(
  params: AdminAccessParams,
): Omit<AuditLog, 'id' | 'created_at'> {
  const now = new Date().toISOString()

  return {
    tenant_id: params.tenant_id,
    user_id: params.user_id,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    old_data: null,
    new_data: null,
    ip_address: params.ip_address ?? null,
    user_agent: params.user_agent ?? null,
    session_id: params.session_id,
    login_timestamp: params.access_type === 'login' ? now : null,
    logout_timestamp: params.access_type === 'logout' ? now : null,
    is_admin_access: true,
    access_type: params.access_type,
  }
}

// ---------------------------------------------------------------------------
// Retention management
// ---------------------------------------------------------------------------

/**
 * Return the cutoff date before which admin access logs may be purged.
 *
 * Per the Provvedimento Garante 27/11/2008, access logs must be retained
 * for a minimum of 6 months. Logs older than this date are eligible for
 * deletion (though longer retention is permitted and recommended for
 * accountability purposes under GDPR Art. 5(2)).
 */
export function getRetentionCutoffDate(): Date {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - MIN_RETENTION_MONTHS)
  return cutoff
}

// ---------------------------------------------------------------------------
// Access report generation
// ---------------------------------------------------------------------------

/**
 * Generate a formatted access report for compliance audits.
 *
 * The Provvedimento Garante 27/11/2008 requires that admin access logs
 * be verifiable ("verificabili"). This report provides a structured,
 * human-readable summary of all admin accesses within a given period,
 * suitable for presentation during audits or inspections by the Garante.
 *
 * The report includes metadata (period, generation date, legal basis)
 * and a chronological list of all access events with relevant details.
 */
export function generateAccessReport(
  logs: AuditLog[],
  period: { from: string; to: string },
): AccessReport {
  const periodFrom = new Date(period.from)
  const periodTo = new Date(period.to)

  const filteredLogs = logs
    .filter(log => {
      const logDate = new Date(log.created_at)
      return logDate >= periodFrom && logDate <= periodTo && log.is_admin_access
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const entries: AccessReportEntry[] = filteredLogs.map(log => ({
    timestamp: log.created_at,
    user_id: log.user_id ?? 'unknown',
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    ip_address: log.ip_address,
    access_type: log.access_type,
    session_id: log.session_id,
  }))

  return {
    _metadata: {
      report_type: 'Registro accessi amministratori di sistema — Provvedimento Garante 27/11/2008',
      generated_at: new Date().toISOString(),
      period_from: format(periodFrom, 'dd/MM/yyyy'),
      period_to: format(periodTo, 'dd/MM/yyyy'),
      total_entries: entries.length,
      legal_basis:
        'Provvedimento Garante per la Protezione dei Dati Personali del 27/11/2008 ' +
        '(G.U. n. 300 del 24/12/2008) — Misure e accorgimenti prescritti ai titolari ' +
        'dei trattamenti effettuati con strumenti elettronici relativamente alle ' +
        'attribuzioni delle funzioni di amministratore di sistema',
    },
    entries,
  }
}
