// Mustache-like {{var}} interpolation + dotted path + fallback. Zero deps.

export function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const parts = path.split('.')
    let cur: unknown = vars
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p]
      } else {
        return ''
      }
    }
    return cur == null ? '' : String(cur)
  })
}

export function renderEmail(tpl: {
  subject?: string | null
  body_html?: string | null
  body_text?: string | null
}, vars: Record<string, unknown>): { subject: string; html: string; text: string } {
  return {
    subject: tpl.subject ? renderTemplate(tpl.subject, vars) : '',
    html: tpl.body_html ? renderTemplate(tpl.body_html, vars) : '',
    text: tpl.body_text ? renderTemplate(tpl.body_text, vars) : '',
  }
}
