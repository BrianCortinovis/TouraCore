import { createServiceRoleClient } from '@touracore/db/server'

export interface TemplateRow {
  id: string
  key: string
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | 'slack'
  locale: string
  scope: 'platform' | 'agency' | 'tenant'
  scope_id: string | null
  subject: string | null
  body_html: string | null
  body_text: string | null
  body_mjml: string | null
  variables: unknown
  is_active: boolean
  version: number
  updated_at: string
}

export async function saveTemplate(input: {
  key: string
  channel: TemplateRow['channel']
  locale: string
  scope: TemplateRow['scope']
  scopeId?: string | null
  subject?: string | null
  bodyHtml?: string | null
  bodyText?: string | null
  bodyMjml?: string | null
  variables?: string[]
  isActive?: boolean
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServiceRoleClient()
  const row = {
    key: input.key,
    channel: input.channel,
    locale: input.locale,
    scope: input.scope,
    scope_id: input.scopeId ?? null,
    subject: input.subject ?? null,
    body_html: input.bodyHtml ?? null,
    body_text: input.bodyText ?? null,
    body_mjml: input.bodyMjml ?? null,
    variables: input.variables ?? [],
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('notification_templates')
    .upsert(row, { onConflict: 'key,channel,locale,scope,scope_id' })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}

export async function listTemplates(filters?: {
  scope?: TemplateRow['scope']
  scopeId?: string | null
  channel?: TemplateRow['channel']
  locale?: string
}): Promise<TemplateRow[]> {
  const supabase = await createServiceRoleClient()
  let q = supabase.from('notification_templates').select('*').order('key').order('channel').order('locale')
  if (filters?.scope) q = q.eq('scope', filters.scope)
  if (filters?.scopeId !== undefined) {
    if (filters.scopeId === null) q = q.is('scope_id', null)
    else q = q.eq('scope_id', filters.scopeId)
  }
  if (filters?.channel) q = q.eq('channel', filters.channel)
  if (filters?.locale) q = q.eq('locale', filters.locale)
  const { data } = await q
  return (data ?? []) as TemplateRow[]
}
