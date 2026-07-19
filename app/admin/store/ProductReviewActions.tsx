import { approveStoreProductAction } from "../../actions/storeAdmin";
import PendingSubmitButton from "./PendingSubmitButton";

type Props = {
  productId: string;
  status: string;
  moderationStatus: string;
  returnTo: string;
};

export default function ProductReviewActions({
  productId,
  status,
  moderationStatus,
  returnTo,
}: Props) {
  const awaiting =
    moderationStatus === "pending" &&
    (status === "in_review" || status === "pending_review");

  if (!awaiting) {
    return (
      <p className="mt-4 text-xs text-white/45">
        No moderation actions available for this product state. Product reject /
        return-for-revision is not shipped in this slice (no operator reject
        RPC or review-note column yet).
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-black">Review actions</h3>
      <p className="text-xs text-white/45">
        Approve publishes the product as active and approved. Reject /
        return-for-revision is deferred until a dedicated operator path exists.
      </p>
      <form action={approveStoreProductAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <PendingSubmitButton
          label="Approve product"
          pendingLabel="Approving…"
          className="watch-focus-ring rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-60"
        />
      </form>
    </div>
  );
}
