export default function LiveRoomLoadingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.9fr)_minmax(260px,300px)]">
      <div className="space-y-4">
        <div className="aspect-video animate-pulse rounded-[24px] bg-white/5 sm:rounded-[28px]" />
        <div className="h-36 animate-pulse rounded-[24px] bg-white/5" />
      </div>
      <div className="min-h-[20rem] animate-pulse rounded-[24px] bg-white/5 sm:min-h-[28rem]" />
      <div className="hidden space-y-3 xl:block">
        <div className="h-40 animate-pulse rounded-[24px] bg-white/5" />
        <div className="h-40 animate-pulse rounded-[24px] bg-white/5" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white/5" />
      </div>
    </div>
  );
}
