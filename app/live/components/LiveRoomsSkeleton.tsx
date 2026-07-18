export default function LiveRoomsSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Loading live rooms"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]"
        >
          <div className="product-skeleton-pulse aspect-[16/10] bg-white/5" />
          <div className="space-y-3 p-3.5">
            <div className="product-skeleton-pulse h-4 w-4/5 rounded-full bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="product-skeleton-pulse h-7 w-7 rounded-full bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <div className="product-skeleton-pulse h-3 w-1/2 rounded-full bg-white/10" />
                <div className="product-skeleton-pulse h-2.5 w-3/4 rounded-full bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
