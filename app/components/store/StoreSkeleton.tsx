export function StoreHomeSkeleton() {
  return (
    <div
      className="mt-6 animate-pulse space-y-8"
      aria-busy="true"
      aria-label="Loading store"
    >
      <div className="h-56 rounded-[var(--sf-radius-lg)] bg-white/5 md:h-72 lg:h-96" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-[var(--sf-radius)] bg-white/5"
          />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 w-44 shrink-0 rounded-[1.25rem] bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-line)]"
        >
          <div className="aspect-[4/5] bg-white/5" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-white/5" />
            <div className="h-4 w-2/3 rounded bg-white/5" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
