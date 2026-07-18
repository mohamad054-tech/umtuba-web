import StoreShell from "../components/store/StoreShell";
import { StoreHomeSkeleton } from "../components/store/StoreSkeleton";

export default function StoreLoading() {
  return (
    <StoreShell title="Store" subtitle="Loading">
      <StoreHomeSkeleton />
    </StoreShell>
  );
}
