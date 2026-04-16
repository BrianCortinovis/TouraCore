'use client'

import { Badge, Button, Card, CardContent } from '@touracore/ui'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { BookingWidget } from '@touracore/hospitality/src/components/booking'
import { PropertyServicePreview } from '@touracore/hospitality/src/components/property'
import type { PropertyServicePreviewData } from '@touracore/hospitality/src/config/property-service-preview'
import type { Property } from '@touracore/hospitality/src/types/database'

type PublicProperty = Pick<Property, 'id' | 'name' | 'slug' | 'type' | 'short_description'>

interface BookingEngineClientProps {
  tenantSlug: string
  tenantName: string
  property: PublicProperty | null
  previewData: PropertyServicePreviewData | null
}

const FLOW_STEPS = [
  {
    number: '01',
    title: 'Ricerca',
    description: 'L’ospite seleziona date, adulti, bambini, infanti, tariffa e animali.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Risultati',
    description: 'Vede camere disponibili, prezzi, policy e offerte applicate.',
    icon: LayoutGrid,
  },
  {
    number: '03',
    title: 'Extra e dati',
    description: 'Compila anagrafica, documento, indirizzo, extra e richieste speciali.',
    icon: Users,
  },
  {
    number: '04',
    title: 'Conferma',
    description: 'Riceve il riepilogo finale con codice, tariffa, extra e totale.',
    icon: CheckCircle2,
  },
] as const

export function BookingEngineClient({
  tenantSlug,
  tenantName,
  property,
  previewData,
}: BookingEngineClientProps) {
  const publicPath = property?.slug ? `/book/${property.slug}` : null
  const totalSections = previewData?.sections.length ?? 0

  return (
    <div className="space-y-8">
      <section className="overflow-hidden border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8_55%,_#e0f2fe)] text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/10 text-white">Booking engine</Badge>
              <Badge className="border-white/20 bg-white/10 text-white">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Template + stepper
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Flusso di prenotazione pubblico, moduli attivi e template operativo.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-100/90 sm:text-base">
                Qui vedi come il booking engine si presenta all’ospite: ricerca, risultati,
                extra, raccolta dati avanzata e conferma finale. Sotto trovi la preview dei
                moduli visibili nel template della struttura.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                <CalendarDays className="h-4 w-4" />
                {tenantName}
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                /{tenantSlug}
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                <LayoutGrid className="h-4 w-4" />
                {totalSections || 0} moduli visibili
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2">
                <Users className="h-4 w-4" />
                4 step pubblici
              </span>
            </div>
          </div>

          <aside className="border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
              Template booking
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {property?.name ?? tenantName}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-100/90">
              {property?.short_description || 'Anteprima del template pubblico e delle sezioni attive.'}
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-100/90">
              <div className="flex items-center justify-between">
                <span>Route pubblica</span>
                <span className="font-medium">{publicPath ?? 'Nessuna struttura attiva'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stato preview</span>
                <span className="font-medium">{previewData ? 'Attiva' : 'Placeholder'}</span>
              </div>
            </div>
            {publicPath && (
              <div className="mt-5">
                <Button
                  className="w-full"
                  onClick={() => window.open(publicPath, '_blank', 'noopener,noreferrer')}
                >
                  Apri booking pubblico
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Step del booking engine</h2>
          <p className="mt-1 text-sm text-gray-500">
            La sequenza che l’ospite attraversa dal primo input alla conferma.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {FLOW_STEPS.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.number} className="border-slate-200">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                      Step {step.number}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-950">{step.title}</h3>
                    <p className="text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Template widget</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Questo è il blocco che l’ospite vede prima di iniziare la prenotazione.
                </p>
              </div>
              {publicPath && (
                <Badge variant="secondary">/{property?.slug}</Badge>
              )}
            </div>

            {property?.slug ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <BookingWidget
                  orgSlug={property.slug}
                  showHeader
                  hotelName={property.name}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                Nessuna struttura attiva trovata per il tenant. Crea o attiva una proprietà per
                vedere il template del booking engine.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Template operativo</h2>
              <p className="mt-1 text-sm text-gray-500">
                Il booking engine riassume disponibilità, servizi e configurazione visibile.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Struttura
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">
                  {property?.name ?? tenantName}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {property?.short_description || 'Anteprima template pronta per essere pubblicata.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Moduli inclusi
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Prenotazione', 'Tariffe', 'Disponibilità', 'Ospiti', 'Pet policy', 'Conferma'].map((label) => (
                    <span
                      key={label}
                      className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Percorso ospite
                </div>
                <ol className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>1. Cerca disponibilità e numero ospiti.</li>
                  <li>2. Scegli la camera e visualizza il prezzo finale.</li>
                  <li>3. Inserisci dati, richieste e dettagli animali.</li>
                  <li>4. Conferma e ricevi il codice prenotazione.</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Preview moduli</h2>
          <p className="mt-1 text-sm text-gray-500">
            Se la struttura ha servizi configurati, qui vedi la scheda interna come si presenta
            nel template.
          </p>
        </div>

        {previewData ? (
          <div className="overflow-hidden border border-slate-200 bg-white">
            <PropertyServicePreview data={previewData} mode="dashboard" />
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500">
            Nessun dato disponibile per la preview moduli.
          </div>
        )}
      </section>
    </div>
  )
}
