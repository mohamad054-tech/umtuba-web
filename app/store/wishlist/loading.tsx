import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";

export default function StoreWishlistLoading() {
  return (
    <StoreShell title="Wishlist" subtitle="Loading">
      <div className="mt-6">
        <ProductGridSkeleton count={6} />
      </div>
    </StoreShell>
  );
}
