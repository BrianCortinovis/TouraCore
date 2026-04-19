import type { Metadata } from 'next'
import { getSubProcessors } from '@touracore/compliance'
import { BRAND_CONFIG } from '@/config/brand'
import { getSiteBaseUrl } from '@/lib/site-url'
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd'

export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  const base = getSiteBaseUrl()
  const title = `Sub-processor · ${BRAND_CONFIG.brand}`
  const description = `Elenco dei sub-responsabili del trattamento dati di ${BRAND_CONFIG.brand} ai sensi dell'Art. 28 GDPR.`
  return {
    title,
    description,
    alternates: { canonical: `${base}/legal/sub-processors` },
    openGraph: {
      title,
      description,
      url: `${base}/legal/sub-processors`,
      type: 'article',
      locale: 'it_IT',
    },
    robots: { index: true, follow: true },
  }
}

export default function SubProcessorsPage() {
  const base = getSiteBaseUrl()
  const subProcessors = getSubProcessors()

  const breadcrumbs = [
    { name: 'Home', url: `${base}/` },
    { name: 'Legale', url: `${base}/legal` },
    { name: 'Sub-processor', url: `${base}/legal/sub-processors` },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <nav aria-label="breadcrumb" className="mb-6 text-sm text-gray-500">
        <ol className="flex gap-2">
          {breadcrumbs.map((b, i) => (
            <li key={b.url} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>›</span>}
              {i < breadcrumbs.length - 1 ? (
                <a href={b.url} className="hover:underline">{b.name}</a>
              ) : (
                <span className="text-gray-700">{b.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <h1>Elenco Sub-processor</h1>
      <p className="text-gray-600">
        Ai sensi dell&apos;Art. 28 GDPR, {BRAND_CONFIG.data_controller} utilizza i seguenti sub-responsabili del trattamento. Modifiche a questo elenco sono notificate con 30 giorni di preavviso via email agli utenti registrati.
      </p>
      <p className="text-sm text-gray-500">
        Ultimo aggiornamento: {BRAND_CONFIG.last_updated}
      </p>

      <div className="mt-8 overflow-x-auto not-prose">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border-b font-semibold">Fornitore</th>
              <th className="p-3 border-b font-semibold">Finalità</th>
              <th className="p-3 border-b font-semibold">Sede</th>
              <th className="p-3 border-b font-semibold">Trasferimento</th>
              <th className="p-3 border-b font-semibold">DPA</th>
            </tr>
          </thead>
          <tbody>
            {subProcessors.map((sp) => (
              <tr key={sp.name} className="hover:bg-gray-50">
                <td className="p-3 border-b font-medium">{sp.name}</td>
                <td className="p-3 border-b text-gray-700">{sp.purpose}</td>
                <td className="p-3 border-b text-gray-700">{sp.country}</td>
                <td className="p-3 border-b">
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono">
                    {sp.transfer_mechanism}
                  </span>
                </td>
                <td className="p-3 border-b">
                  <a
                    href={sp.dpa_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Link DPA ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8">Categorie di dati</h2>
      <ul>
        {subProcessors.map((sp) => (
          <li key={sp.name}>
            <strong>{sp.name}:</strong> {sp.data_categories.join(', ')}
          </li>
        ))}
      </ul>

      <h2>Meccanismi di trasferimento extra-UE</h2>
      <ul>
        <li><strong>EU:</strong> fornitore UE, no trasferimento extra-EEA</li>
        <li><strong>DPF:</strong> EU-US Data Privacy Framework (certificazione attiva)</li>
        <li><strong>SCC:</strong> Standard Contractual Clauses (Decisione UE 2021/914)</li>
      </ul>

      <p className="text-sm text-gray-500 mt-8">
        Per domande o obiezioni: <a href={`mailto:${BRAND_CONFIG.dpo_email}`}>{BRAND_CONFIG.dpo_email}</a>
      </p>
    </>
  )
}
