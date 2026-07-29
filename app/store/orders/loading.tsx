import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";

export default function OrdersLoading() {
  return (
    <StoreShell title="My Orders" subtitle="Loading">
      <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading orders">
        <div className="h-40 animate-pulse rounded-[var(--sf-radius-lg)] bg-white/5" />
        <ProductGridSkeleton count={3} />
      </div>
    </StoreShell>
  );
}
