import { getDecryptedCredentials } from './credentials'

interface SendEmailParams {
  organizationId: string
  to: string
  subject: string
  html: string
  from?: string
  reservationId?: string
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ success: boolean; skipped?: boolean }> {
  const creds = await getDecryptedCredentials(params.organizationId, 'resend')
  if (!creds) return { success: true, skipped: true }
  // Stub: API Resend non ancora collegata
  return { success: true, skipped: true }
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
}
