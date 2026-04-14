import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { buildMetadata, buildLodgingBusinessLd, JsonLdScript } from '@touracore/seo'
import { getPublicPropertyAction } from './actions'
import { PropertyGallery } from './components/property-gallery'
import { RoomTypeCard } from './components/room-type-card'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicPropertyAction(slug)
  if (!data) return {}

  return buildMetadata({
    title: `${data.property.name} - Prenota ora`,
    description: data.property.description || `Prenota il tuo soggiorno presso ${data.property.name}`,
    ogImage: data.media[0]?.url,
    canonicalUrl: `/property/${slug}`,
  })
}

export default async function PublicPropertyPage({ params }: Props) {
  const { slug } = await params
  const data = await getPublicPropertyAction(slug)

  if (!data) notFound()

  const { property, roomTypes, media } = data

  const jsonLd = buildLodgingBusinessLd({
    name: property.name,
    description: property.description || undefined,
    url: `/property/${slug}`,
    image: media[0]?.url,
    address: {
      street: property.address || undefined,
      city: property.city || undefined,
      province: property.province || undefined,
      zip: property.zip || undefined,
      country: property.country || 'IT',
    },
  })

  return (
    <>
      <JsonLdScript data={jsonLd} />

      <div className="min-h-screen bg-white">
        {/* Hero */}
        <header className="relative bg-gray-900">
          {media[0] && (
            <Image
              src={media[0].url}
              alt={media[0].alt || property.name}
              className="h-80 w-full object-cover opacity-60 sm:h-96"
              fill
              unoptimized
            />
          )}
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-5xl px-4 pb-8">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{property.name}</h1>
              {property.city && (
                <p className="mt-1 text-lg text-gray-200">
                  {property.city}{property.province ? `, ${property.province}` : ''}
                </p>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Main content */}
            <div className="space-y-10 lg:col-span-2">
              {/* Description */}
              {property.description && (
                <section>
                  <h2 className="text-xl font-semibold text-gray-900">La struttura</h2>
                  <p className="mt-3 leading-relaxed text-gray-600">{property.description}</p>
                </section>
              )}

              {/* Gallery */}
              {media.length > 1 && (
                <section>
                  <h2 className="text-xl font-semibold text-gray-900">Galleria</h2>
                  <PropertyGallery media={media} />
                </section>
              )}

              {/* Room types */}
              {roomTypes.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold text-gray-900">Le nostre camere</h2>
                  <div className="mt-4 space-y-4">
                    {roomTypes.map((rt) => (
                      <RoomTypeCard key={rt.id} roomType={rt} slug={slug} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Booking CTA */}
              <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Prenota il tuo soggiorno</h3>
                {roomTypes.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    A partire da €{Math.min(...roomTypes.map((r) => r.base_price)).toFixed(2)} / notte
                  </p>
                )}
                <Link
                  href={`/book/${slug}`}
                  className="mt-4 block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Verifica disponibilità
                </Link>
              </div>

              {/* Info */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Informazioni</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  {property.address && (
                    <div>
                      <dt className="text-gray-500">Indirizzo</dt>
                      <dd className="text-gray-900">
                        {property.address}, {property.zip} {property.city}
                      </dd>
                    </div>
                  )}
                  {property.phone && (
                    <div>
                      <dt className="text-gray-500">Telefono</dt>
                      <dd className="text-gray-900">{property.phone}</dd>
                    </div>
                  )}
                  {property.email && (
                    <div>
                      <dt className="text-gray-500">Email</dt>
                      <dd className="text-gray-900">{property.email}</dd>
                    </div>
                  )}
                  {property.website && (
                    <div>
                      <dt className="text-gray-500">Sito web</dt>
                      <dd>
                        <a href={property.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {property.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-500">Check-in / Check-out</dt>
                    <dd className="text-gray-900">
                      {property.default_check_in_time || '15:00'} / {property.default_check_out_time || '10:00'}
                    </dd>
                  </div>
                  {property.cin_code && (
                    <div>
                      <dt className="text-gray-500">CIN</dt>
                      <dd className="text-gray-900">{property.cin_code}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </aside>
          </div>
        </main>

        <footer className="border-t border-gray-200 py-6">
          <p className="text-center text-xs text-gray-400">
            Powered by TouraCore
          </p>
        </footer>
      </div>
    </>
  )
}
