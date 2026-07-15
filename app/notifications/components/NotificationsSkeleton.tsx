export default function NotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
        >
          <div className="h-11 w-11 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-[75%] rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
            <div className="h-2 w-16 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
