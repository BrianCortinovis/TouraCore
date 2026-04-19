import { listTemplates } from '@touracore/notifications'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const platformTemplates = await listTemplates({ scope: 'platform', scopeId: null })

  const grouped = new Map<string, typeof platformTemplates>()
  for (const t of platformTemplates) {
    const k = t.key
    if (!grouped.has(k)) grouped.set(k, [])
    grouped.get(k)!.push(t)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Template library</h1>
        <p className="mt-1 text-sm text-slate-600">
          {platformTemplates.length} template platform attivi. Agency/tenant possono creare override.
        </p>
      </header>

      <section className="space-y-3">
        {[...grouped.entries()].map(([key, variants]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-mono text-sm font-semibold">{key}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {variants.map((v) => (
                <span key={v.id} className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px]">
                  {v.channel}/{v.locale}{v.is_active ? '' : ' (inactive)'}
                </span>
              ))}
            </div>
            {variants[0]?.subject && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="text-slate-400">subject:</span> {variants[0].subject}
              </p>
            )}
          </div>
        ))}
        {grouped.size === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nessun template. Esegui seed M082 via SQL o admin UI.
          </p>
        )}
      </section>
    </div>
  )
}
