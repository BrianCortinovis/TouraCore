import { ListingShell } from '@touracore/listings'
import Link from 'next/link'

export default function ListingNotFound() {
  return (
    <ListingShell
      tenantName="TouraCore"
      listingId={undefined}
      breadcrumb={<span>Scheda non trovata</span>}
    >
      <div className="mx-auto max-w-[580px] py-20 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#fde8ea] text-[#d70015]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h1 className="mb-2 text-[24px] font-bold">Scheda non trovata</h1>
        <p className="mb-6 text-[14px] text-[#6b7280]">
          La scheda che stai cercando non esiste o non è più disponibile al pubblico.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-[#003b95] px-5 py-3 text-[14px] font-bold text-white transition hover:bg-[#002468]"
        >
          Torna alla home
        </Link>
      </div>
    </ListingShell>
  )
}
