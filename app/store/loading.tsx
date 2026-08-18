import StoreLocalizedLoading from "../components/store/StoreLocalizedLoading";
import { StoreHomeSkeleton } from "../components/store/StoreSkeleton";

export default function StoreLoading() {
  return (
    <StoreLocalizedLoading>
      <StoreHomeSkeleton />
    </StoreLocalizedLoading>
  );
}
