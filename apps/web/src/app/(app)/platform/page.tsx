import Link from 'next/link'

export default async function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Platform Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Control Room
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Nuova home tier platform. Il pannello superadmin legacy resta attivo
          durante la migrazione M076-M079.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/superadmin"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Legacy
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            Vai al Superadmin
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Billing catalogo, override free, tenancy e system health.
          </p>
        </Link>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Roadmap
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">M076</p>
          <p className="mt-2 text-sm text-slate-500">
            Dashboard MRR + forecast + alert center.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Roadmap
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">M077-M079</p>
          <p className="mt-2 text-sm text-slate-500">
            Agencies CRUD, plan/commission editor, tech ops panel.
          </p>
        </div>
      </section>
    </div>
  )
}
