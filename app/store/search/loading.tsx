import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";

export default function StoreSearchLoading() {
  return (
    <StoreShell title="Search" subtitle="Loading">
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="h-72 animate-pulse rounded-[24px] bg-white/5" />
        <ProductGridSkeleton count={6} />
      </div>
    </StoreShell>
  );
}
