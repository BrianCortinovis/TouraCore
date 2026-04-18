import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { getPartnerById } from '@touracore/partners/server'

export const dynamic = 'force-dynamic'

export default async function ApiDocsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const b = await getAuthBootstrapData()
  if (!b.tenant) redirect('/login')
  const partner = await getPartnerById({ id, tenantId: b.tenant.id })
  if (!partner) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'

  return (
    <div className="max-w-3xl space-y-6">
      <nav className="text-sm">
        <Link
          href={b.tenant?.slug ? `/${b.tenant.slug}/settings/partners/${id}` : `/settings/partners/${id}`}
          className="text-blue-600 hover:underline"
        >
          ← Torna a {partner.name}
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-bold">API Documentation</h1>
        <p className="mt-2 text-sm text-gray-600">
          TouraCore Partner API v1 — REST/JSON con autenticazione X-API-Key + X-API-Secret.
        </p>
      </header>

      <section className="rounded-md border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Autenticazione</h2>
        <p className="mt-2 text-sm text-gray-700">
          Ogni request include due header: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Key</code>{' '}
          e <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Secret</code>. Genera la coppia dalla tab
          API Keys del partner. Il secret viene mostrato UNA VOLTA alla creazione.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
          <code>{`curl ${baseUrl}/api/partners/v1/auth/me \\
  -H "X-API-Key: tck_live_..." \\
  -H "X-API-Secret: ..."`}</code>
        </pre>
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Scope (permessi)</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">listings:read</code> — lista attività + dettaglio</li>
          <li><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">availability:read</code> — disponibilità bike/camere</li>
          <li><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">bookings:read</code> — lettura prenotazioni</li>
          <li><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">bookings:write</code> — creazione prenotazioni</li>
          <li><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">bookings:cancel</code> — annullamento</li>
        </ul>
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Endpoints v1</h2>

        <Endpoint
          method="GET"
          path="/api/partners/v1/auth/me"
          scope="listings:read"
          description="Verifica credenziali + info partner"
        />
        <Endpoint
          method="GET"
          path="/api/partners/v1/listings"
          scope="listings:read"
          description="Lista attività del tenant (filter ?kind=bike_rental|accommodation|restaurant…)"
        />
        <Endpoint
          method="GET"
          path="/api/partners/v1/availability"
          scope="availability:read"
          description="Disponibilità bike per window temporale"
          query="?entity_id=uuid&rental_start=ISO&rental_end=ISO&bike_type=optional"
        />
        <Endpoint
          method="POST"
          path="/api/partners/v1/bookings"
          scope="bookings:write"
          description="Crea prenotazione (solo vertical=bike_rental in v1)"
          body={`{
  "entity_id": "uuid",
  "vertical": "bike_rental",
  "rental_start": "2026-05-01T09:00:00Z",
  "rental_end": "2026-05-01T13:00:00Z",
  "items": [{ "bike_type_id": "uuid", "bike_type_key": "e_city", "quantity": 2 }],
  "guest": { "name": "...", "email": "..." }
}`}
        />
      </section>

      <section className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Phase 2 roadmap</p>
        <ul className="mt-1 list-inside list-disc text-blue-800">
          <li>OCTO v1.1 compliance layer per resellers enterprise (Ventrata, Redeam)</li>
          <li>HMAC-SHA256 signature alternative a plaintext secret</li>
          <li>Webhook dispatch firmati (booking.confirmed / commission.earned / commission.paid)</li>
          <li>Swagger UI interactive su /developers/swagger</li>
        </ul>
      </section>
    </div>
  )
}

function Endpoint({
  method,
  path,
  scope,
  description,
  query,
  body,
}: {
  method: string
  path: string
  scope: string
  description: string
  query?: string
  body?: string
}) {
  return (
    <div className="border-b border-gray-100 pb-3 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}
        >
          {method}
        </span>
        <code className="text-xs font-semibold">{path}</code>
        <span className="ml-auto text-[10px] text-gray-500">scope: {scope}</span>
      </div>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
      {query && (
        <code className="mt-2 block rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-700">{query}</code>
      )}
      {body && (
        <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-2 text-[10px] text-gray-100">
          <code>{body}</code>
        </pre>
      )}
    </div>
  )
}
