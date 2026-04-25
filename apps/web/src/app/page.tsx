import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Compass,
  Calendar,
  BarChart3,
  Shield,
  ArrowRight,
  Zap,
  Users,
  Globe,
} from 'lucide-react'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getAuthBootstrapData } from '@touracore/auth'

export const metadata: Metadata = {
  title: 'TouraCore — Piattaforma multi-verticale per il turismo italiano',
  description:
    'Hospitality, ristorazione, noleggi, attività outdoor: channel manager, booking engine, fattura elettronica, CIN, Alloggiati Web e tassa di soggiorno integrate.',
  keywords: [
    'gestionale turismo',
    'channel manager Italia',
    'booking engine hotel',
    'CIN affitti brevi',
    'Alloggiati Web',
    'fattura elettronica turismo',
    'PMS multi-vertical',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'TouraCore — Piattaforma multi-verticale per il turismo italiano',
    description:
      'Hospitality, ristorazione, noleggi, attività outdoor in un\'unica piattaforma compliant con la normativa italiana.',
    siteName: 'TouraCore',
    locale: 'it_IT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TouraCore',
    description: 'Gestisci la tua attività turistica. Tutto da un posto.',
  },
}

export default async function HomePage() {
  const bootstrap = await getAuthBootstrapData()
  const user = bootstrap.user

  // Utente loggato: redirect intelligente in base al ruolo
  if (user) {
    const adminClient = await createServiceRoleClient()

    const { data: admin } = await adminClient
      .from('platform_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (admin) {
      redirect('/superadmin')
    }

    const tenantSlug = bootstrap.tenant?.slug

    if (tenantSlug) {
      redirect(`/${tenantSlug}`)
    }

    const { data: agencyMembership } = await adminClient
      .from('agency_memberships')
      .select('agencies(slug)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (agencyMembership) {
      const agencyRel = (agencyMembership as unknown as { agencies?: unknown }).agencies
      const agencySlug = Array.isArray(agencyRel)
        ? (agencyRel[0] as { slug?: string } | undefined)?.slug
        : (agencyRel as { slug?: string } | null)?.slug
      if (agencySlug) redirect(`/a/${agencySlug}`)
    }

    const serverClient = await createServerSupabaseClient()
    const { data: authRes } = await serverClient.auth.getUser()
    const intentScope = (authRes.user?.user_metadata as { intent_scope?: string } | null)?.intent_scope
    if (intentScope === 'agency') {
      redirect('/agency-onboarding')
    }

    redirect('/onboarding')
  }

  // Utente NON loggato: mostra landing
  return <LandingPage />
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <Features />
      <Verticals />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <span className="text-lg font-bold text-gray-900">TouraCore</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Accedi
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Inizia gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 to-white py-20 sm:py-28">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%233b82f6%22%20fill-opacity=%220.03%22%3E%3Ccircle%20cx=%2230%22%20cy=%2230%22%20r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Zap className="h-3 w-3" />
            Piattaforma multi-verticale per il turismo italiano
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Gestisci la tua attività turistica.{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Tutto da un posto.
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 sm:text-xl">
            Hospitality, tour, noleggi e attività outdoor.
            Channel manager, booking engine, compliance italiana integrata.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 sm:w-auto"
            >
              Crea account gratuito
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
            >
              Accedi
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            Nessuna carta di credito richiesta · Setup in meno di 5 minuti
          </p>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      icon: Calendar,
      title: 'Planning integrato',
      description:
        'Calendario drag & drop, prenotazioni, gestione unità e tariffe stagionali. Tutto in un\'unica vista.',
    },
    {
      icon: Globe,
      title: 'Channel manager',
      description:
        'Integrazione con Booking.com, Airbnb, Expedia, Vrbo via Octorate. Sincronizzazione automatica.',
    },
    {
      icon: Shield,
      title: 'Compliance italiana',
      description:
        'Alloggiati Web, ISTAT, CIN, SCIA, fattura elettronica, tassa di soggiorno e cedolare secca.',
    },
    {
      icon: Users,
      title: 'Team e agenzie',
      description:
        'Livelli di permessi per staff, gestione multi-struttura, portali agenzie con marca bianca.',
    },
    {
      icon: BarChart3,
      title: 'Report e KPI',
      description:
        'Occupazione, RevPAR, ADR, incassi per canale. Heatmap annuale, metriche in tempo reale.',
    },
    {
      icon: Zap,
      title: 'Setup veloce',
      description:
        'Onboarding guidato, configurazione preimpostata per tipo di struttura, zero codice.',
    },
  ]

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Tutto quello che ti serve
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Dalla prenotazione alla fattura. Dalla compliance al channel manager.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <f.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Verticals() {
  const verticals = [
    {
      icon: Building2,
      title: 'Ospitalità',
      subtitle: 'Hotel · B&B · Agriturismi · Case vacanze',
      available: true,
    },
    {
      icon: Compass,
      title: 'Attività outdoor',
      subtitle: 'Tour · Bike rental · Esperienze',
      available: false,
    },
  ]

  return (
    <section className="bg-gradient-to-b from-white to-blue-50/50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Un modulo per ogni settore
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Attiva solo i moduli che ti servono. Paghi solo quello che usi.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {verticals.map((v) => (
            <div
              key={v.title}
              className="relative rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"
            >
              {!v.available && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  In arrivo
                </span>
              )}
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
                <v.icon className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{v.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{v.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">TouraCore</span>
            <span className="text-xs text-gray-400">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <Link href="/discover" className="hover:text-gray-900">
              Esplora
            </Link>
            <Link href="/login" className="hover:text-gray-900">
              Accedi
            </Link>
            <Link href="/register" className="hover:text-gray-900">
              Registrati
            </Link>
            <Link href="/legal/privacy" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/legal/cookie-policy" className="hover:text-gray-900">
              Cookie
            </Link>
            <Link href="/legal/terms" className="hover:text-gray-900">
              Termini
            </Link>
            <Link
              href="/superadmin-login"
              className="text-xs text-gray-400 hover:text-gray-600"
              title="Accesso amministratori piattaforma"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
