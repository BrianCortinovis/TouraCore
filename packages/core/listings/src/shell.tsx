import type { FC, ReactNode } from 'react'

export type ListingLocale = 'it' | 'en' | 'de' | 'fr'

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
}

const LOCALES: ListingLocale[] = ['it', 'en', 'de', 'fr']

export const ListingShell: FC<ListingShellProps> = ({
  children,
  tenantName,
  locale = 'it',
  listingId,
  subnav,
  breadcrumb,
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
      <footer className="mt-10 bg-[#1a1a1a] py-10 text-[13px] text-[#cccccc]">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-4 font-bold text-white text-[20px]">{tenantName}</div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#333] pt-4 text-[12px] text-[#888]">
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
