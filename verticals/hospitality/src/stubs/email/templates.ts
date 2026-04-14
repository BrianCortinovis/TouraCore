import { createServerSupabaseClient } from '@touracore/db'

export interface EmailTemplate {
  id: string
  entity_id: string
  name: string
  trigger: string
  channel: string
  subject: string | null
  body_html: string | null
  body_text: string | null
  variables: string[]
  send_days_offset: number
  is_active: boolean
}

export async function getTemplateById(
  templateId: string
): Promise<EmailTemplate | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error || !data) return null
  return data as EmailTemplate
}

export async function getTemplatesByTrigger(
  entityId: string,
  trigger: string,
  channel?: string
): Promise<EmailTemplate[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('message_templates')
    .select('*')
    .eq('entity_id', entityId)
    .eq('trigger', trigger)
    .eq('is_active', true)

  if (channel) {
    query = query.eq('channel', channel)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as EmailTemplate[]
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
}

export interface RenderedMessage {
  subject: string
  html: string
  text: string
}

export function renderFullTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): RenderedMessage {
  return {
    subject: template.subject ? renderTemplate(template.subject, variables) : '',
    html: template.body_html ? renderTemplate(template.body_html, variables) : '',
    text: template.body_text ? renderTemplate(template.body_text, variables) : '',
  }
}
