import StoreShell from "../../components/store/StoreShell";
import { StoreHomeSkeleton } from "../../components/store/StoreSkeleton";

export default function StoreProfileLoading() {
  return (
    <StoreShell title="Store" subtitle="Loading">
      <StoreHomeSkeleton />
    </StoreShell>
  );
}
