import type { FC, ReactNode } from 'react'

export type ListingLocale = 'it' | 'en' | 'de' | 'fr'

export type ListingShellLegal = {
  /** Ragione sociale (legal name) of the operator */
  legalName?: string | null
  /** P.IVA / VAT number */
  vatNumber?: string | null
  /** REA / chamber-of-commerce number */
  reaNumber?: string | null
  /** Sede legale (legal address single line) */
  legalAddress?: string | null
  /** CIN code if single-entity tenant */
  cinCode?: string | null
}

export type ListingShellProps = {
  children: ReactNode
  /** Tenant display name (footer + topbar subtitle) */
  tenantName: string
  /** Active locale (2-letter) */
  locale?: ListingLocale
  /** Listing ID shown in footer as reference */
  listingId?: string
  /** Optional sticky sub-navigation slot (template per kind) */
  subnav?: ReactNode
  /** Optional breadcrumb slot rendered above main content */
  breadcrumb?: ReactNode
  /** Optional legal info displayed in footer (Italy compliance) */
  legal?: ListingShellLegal
}

const LOCALES: ListingLocale[] = ['it', 'en', 'de', 'fr']

export const ListingShell: FC<ListingShellProps> = ({
  children,
  tenantName,
  locale = 'it',
  listingId,
  subnav,
  breadcrumb,
  legal,
}) => {
  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#0b1220] antialiased">
      {/* TOP BAR */}
      <div className="bg-[#003b95] text-white text-[13px]">
        <div className="mx-auto flex h-10 max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[18px]">TouraCore</span>
            <span className="opacity-70">· Distribuzione ufficiale</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-white/30 px-2 py-1 text-[11px]">EUR · €</span>
            <span className="rounded border border-white/30 px-2 py-1 text-[11px]">
              {LOCALES.map((l, i) => (
                <span key={l}>
                  {i > 0 && ' · '}
                  {l === locale ? <b>{l.toUpperCase()}</b> : l.toUpperCase()}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* STICKY SUBNAV (slot) */}
      {subnav ? (
        <div className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white">
          <div className="mx-auto flex max-w-[1280px] items-stretch overflow-x-auto px-6">
            {subnav}
          </div>
        </div>
      ) : null}

      {/* BREADCRUMB */}
      {breadcrumb ? (
        <div className="mx-auto max-w-[1280px] px-6 pt-3 text-[13px] text-[#6b7280]">
          {breadcrumb}
        </div>
      ) : null}

      {/* MAIN */}
      <main className="mx-auto max-w-[1280px] px-6 pb-16 pt-4">{children}</main>

      {/* FOOTER */}
      <footer
        data-testid="listing-footer"
        className="mt-10 bg-[#1a1a1a] py-10 text-[13px] text-[#cccccc]"
      >
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 font-bold text-white text-[18px]">{tenantName}</div>
              {legal?.legalName ? (
                <div className="text-[12px] text-[#aaa]">{legal.legalName}</div>
              ) : null}
              {legal?.legalAddress ? (
                <div className="mt-1 text-[12px] text-[#888]">{legal.legalAddress}</div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#888]">
                {legal?.vatNumber ? (
                  <span data-testid="footer-vat">P.IVA {legal.vatNumber}</span>
                ) : null}
                {legal?.reaNumber ? <span>REA {legal.reaNumber}</span> : null}
                {legal?.cinCode ? (
                  <span data-testid="footer-cin">CIN {legal.cinCode}</span>
                ) : null}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold text-white">Informazioni legali</div>
              <ul className="space-y-1 text-[12px]">
                <li>
                  <a href="/legal/privacy" className="hover:text-white">
                    Privacy policy
                  </a>
                </li>
                <li>
                  <a href="/legal/cookie-policy" className="hover:text-white">
                    Cookie policy
                  </a>
                </li>
                <li>
                  <a href="/legal/terms" className="hover:text-white">
                    Termini di servizio
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-semibold text-white">Esplora</div>
              <ul className="space-y-1 text-[12px]">
                <li>
                  <a href="/discover" className="hover:text-white">
                    Tutte le strutture
                  </a>
                </li>
                <li>
                  <a href="/sitemap_index.xml" className="hover:text-white">
                    Sitemap
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#333] pt-4 text-[12px] text-[#888]">
            <span>© {new Date().getFullYear()} {tenantName}. All rights reserved.</span>
            <span>
              Distribuito con <b className="text-white">TouraCore</b>
              {listingId ? ` · Listing ID ${listingId}` : ''}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
