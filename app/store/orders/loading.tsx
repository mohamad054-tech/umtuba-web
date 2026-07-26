import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";

export default function StoreOrdersLoading() {
  return (
    <StoreShell title="Orders" subtitle="Loading">
      <div className="mt-6">
        <ProductGridSkeleton count={4} />
      </div>
    </StoreShell>
  );
}
