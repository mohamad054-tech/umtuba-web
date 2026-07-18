import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";

export default function CartLoading() {
  return (
    <StoreShell title="Cart" subtitle="Loading">
      <div className="mt-6">
        <ProductGridSkeleton count={2} />
      </div>
    </StoreShell>
  );
}
