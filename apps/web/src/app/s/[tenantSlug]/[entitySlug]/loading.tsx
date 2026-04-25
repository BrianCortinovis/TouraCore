export default function ListingLoading() {
  return (
    <div data-testid="listing-skeleton" className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-3 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mb-5 aspect-[16/9] w-full animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="h-9 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-32 w-full animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  )
}
