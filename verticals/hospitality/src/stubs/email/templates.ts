export interface EmailTemplate {
  id: string
  subject: string
  html: string
}

export async function getTemplateById(
  _templateId: string
): Promise<EmailTemplate | null> {
  return null
}
