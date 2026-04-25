export default function DiscoverLoading() {
  return (
    <div data-testid="discover-skeleton" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 h-10 w-2/3 max-w-md animate-pulse rounded bg-gray-200" />
      <div className="mb-8 flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded-full bg-gray-200" />
        <div className="h-9 w-24 animate-pulse rounded-full bg-gray-200" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
