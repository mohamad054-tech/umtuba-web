import StoreShell from "../../components/store/StoreShell";
import { StoreHomeSkeleton } from "../../components/store/StoreSkeleton";

export default function StoreCheckoutLoading() {
  return (
    <StoreShell title="Checkout" subtitle="Loading">
      <StoreHomeSkeleton />
    </StoreShell>
  );
}
