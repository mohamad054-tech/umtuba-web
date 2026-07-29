export default function SellerStoreLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
      <div className="mt-6 space-y-4">
        <div className="h-40 animate-pulse rounded-[28px] bg-white/5" />
        <div className="h-56 animate-pulse rounded-[28px] bg-white/5" />
      </div>
      <p className="sr-only">Loading seller store workspace</p>
    </div>
  );
}
