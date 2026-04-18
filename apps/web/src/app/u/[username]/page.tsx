import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Image as ImageIcon } from 'lucide-react'
import {
  getBookingUrl,
  getPlatformProfile,
  getProfileListings,
  type ProfileListing,
} from '@touracore/listings'
import { createPublicClient } from '@/lib/supabase-public'

export const revalidate = 60
export const dynamicParams = true

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = createPublicClient()
  const profile = await getPlatformProfile(supabase, username)
  if (!profile) return { title: 'Profilo non trovato · TouraCore', robots: { index: false } }

  const title = profile.intro_headline
    ? `${profile.display_name} — ${profile.intro_headline}`
    : profile.display_name
  const description = profile.intro_description ?? `${profile.display_name} su TouraCore`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
  }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = createPublicClient()
  const profile = await getPlatformProfile(supabase, username)
  if (!profile) notFound()

  const listings = await getProfileListings(supabase, profile.profile_id)

  const showMulti = profile.default_booking_mode === 'multi' || profile.default_booking_mode === 'mixed'
  const showSingles = profile.default_booking_mode === 'singles' || profile.default_booking_mode === 'mixed'
  const multiBookingUrl = profile.tenant_slug ? getBookingUrl(profile.tenant_slug) : null

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#0b1220]">
      {/* Top bar brand */}
      <div className="bg-[#003b95] py-2.5 text-[13px] text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6">
          <span className="font-bold text-[18px]">TouraCore</span>
          <Link href="/" className="text-[11px] uppercase tracking-wide opacity-90 hover:opacity-100">
            Home
          </Link>
        </div>
      </div>

      {/* Hero */}
      <header className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:py-20">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-[#e5e7eb] md:h-32 md:w-32"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#e7f0ff] text-[#003b95] md:h-32 md:w-32">
                <span className="text-[40px] font-bold">{profile.display_name.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#6b7280]">
                @{profile.username}
              </div>
              <h1 className="text-[32px] font-bold leading-tight md:text-[44px]">
                {profile.display_name}
              </h1>
              {profile.intro_headline ? (
                <p className="mt-2 max-w-[52ch] text-[18px] leading-snug text-[#1f2937]">
                  {profile.intro_headline}
                </p>
              ) : null}
            </div>
            {showMulti && multiBookingUrl ? (
              <a
                href={multiBookingUrl}
                className="rounded-md bg-[#003b95] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#002468]"
              >
                Prenota tutto →
              </a>
            ) : null}
          </div>
          {profile.intro_description ? (
            <p className="mt-6 max-w-[78ch] whitespace-pre-line text-[15px] leading-relaxed text-[#1f2937]">
              {profile.intro_description}
            </p>
          ) : null}
        </div>
      </header>

      {/* Listings */}
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <h2 className="mb-6 text-[22px] font-bold">Le mie attività</h2>
        {listings.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d1d5db] bg-white p-10 text-center text-[14px] text-[#6b7280]">
            Nessuna attività selezionata.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard
                key={l.pivot_id}
                listing={l}
                showSingleCta={showSingles}
                tenantSlug={profile.tenant_slug}
              />
            ))}
          </ul>
        )}
      </main>

      <footer className="mt-10 border-t border-[#e5e7eb] bg-white py-6 text-center text-[12px] text-[#6b7280]">
        Profilo distribuito con <b>TouraCore</b>
      </footer>
    </div>
  )
}

function ListingCard({
  listing,
  showSingleCta,
  tenantSlug,
}: {
  listing: ProfileListing
  showSingleCta: boolean
  tenantSlug: string | null
}) {
  const href = `/s/${listing.tenant_slug}/${listing.slug}`
  const bookingHref = tenantSlug ? getBookingUrl(tenantSlug) : href
  return (
    <li className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
      <Link href={href}>
        <div className="relative aspect-[16/10] bg-[#e5e7eb]">
          {listing.hero_url ? (
            <img
              src={listing.hero_url}
              alt={listing.entity_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#9ca3af]">
              <ImageIcon size={28} />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#003b95]">
            {listing.entity_kind.replace('_', ' ')}
          </span>
        </div>
      </Link>
      <div className="p-4">
        <Link href={href}>
          <h3 className="text-[16px] font-bold leading-tight hover:underline">
            {listing.custom_label ?? listing.entity_name}
          </h3>
        </Link>
        {listing.tagline ? (
          <p className="mt-1 line-clamp-2 text-[13px] text-[#6b7280]">{listing.tagline}</p>
        ) : null}
        <div className="mt-3 flex items-center gap-3 text-[13px]">
          <Link href={href} className="font-semibold text-[#003b95] hover:underline">
            Scheda →
          </Link>
          {showSingleCta ? (
            <a
              href={bookingHref}
              className="rounded-md bg-[#003b95] px-3 py-1.5 font-bold text-white hover:bg-[#002468]"
            >
              Prenota
            </a>
          ) : null}
        </div>
      </div>
    </li>
  )
}
