import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  renderPolicy,
  getPolicyVersion,
  SUPPORTED_LOCALES,
  type Locale,
} from '@touracore/compliance'
import { BRAND_CONFIG } from '@/config/brand'
import {
  resolvePolicySlug,
  CANONICAL_SLUG,
  getAllCanonicalSlugs,
} from '@/lib/policy-alias'
import { getSiteBaseUrl } from '@/lib/site-url'
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd'

export const revalidate = 86400
export const dynamicParams = false

export async function generateStaticParams() {
  return getAllCanonicalSlugs().map((policy) => ({ policy }))
}

interface PageProps {
  params: Promise<{ policy: string }>
  searchParams: Promise<{ lang?: string }>
}

function parseLocale(raw: string | undefined): Locale {
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale
  }
  return 'it'
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { policy: slug } = await params
  const { lang } = await searchParams
  const policyKey = resolvePolicySlug(slug)
  if (!policyKey) return {}

  const locale = parseLocale(lang)
  const rendered = renderPolicy(policyKey, locale, BRAND_CONFIG)
  const base = getSiteBaseUrl()
  const canonical = `${base}/legal/${CANONICAL_SLUG[policyKey]}${locale === 'en' ? '?lang=en' : ''}`

  return {
    title: `${rendered.title} · ${BRAND_CONFIG.brand}`,
    description: `${rendered.title} — ${BRAND_CONFIG.data_controller}`,
    alternates: {
      canonical,
      languages: {
        it: `${base}/legal/${CANONICAL_SLUG[policyKey]}`,
        en: `${base}/legal/${CANONICAL_SLUG[policyKey]}?lang=en`,
      },
    },
    openGraph: {
      title: rendered.title,
      description: `${rendered.title} — ${BRAND_CONFIG.brand}`,
      url: canonical,
      type: 'article',
      locale: locale === 'en' ? 'en_US' : 'it_IT',
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      'policy-version': rendered.version,
    },
  }
}

export default async function LegalPolicyPage({
  params,
  searchParams,
}: PageProps) {
  const { policy: slug } = await params
  const { lang } = await searchParams
  const policyKey = resolvePolicySlug(slug)
  if (!policyKey) notFound()

  const locale = parseLocale(lang)
  const rendered = renderPolicy(policyKey, locale, BRAND_CONFIG)
  const base = getSiteBaseUrl()

  const breadcrumbs = [
    { name: 'Home', url: `${base}/` },
    { name: locale === 'en' ? 'Legal' : 'Legale', url: `${base}/legal` },
    {
      name: rendered.title,
      url: `${base}/legal/${CANONICAL_SLUG[policyKey]}`,
    },
  ]

  const altLocale: Locale = locale === 'it' ? 'en' : 'it'
  const altUrl = `/legal/${CANONICAL_SLUG[policyKey]}${altLocale === 'en' ? '?lang=en' : ''}`

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="mb-6 flex items-center justify-between text-sm text-gray-500">
        <nav aria-label="breadcrumb">
          <ol className="flex gap-2">
            {breadcrumbs.map((b, i) => (
              <li key={b.url} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>›</span>}
                {i < breadcrumbs.length - 1 ? (
                  <a href={b.url} className="hover:underline">
                    {b.name}
                  </a>
                ) : (
                  <span className="text-gray-700">{b.name}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <a
          href={altUrl}
          className="text-blue-600 hover:underline"
          hrefLang={altLocale}
        >
          {altLocale === 'en' ? 'English' : 'Italiano'}
        </a>
      </div>
      <div
        lang={locale}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    </>
  )
}
