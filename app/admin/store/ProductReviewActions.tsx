import {
  approveStoreProductAction,
  rejectStoreProductAction,
  returnStoreProductForRevisionAction,
} from "../../actions/storeAdmin";
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
        No moderation actions available for this product state.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-black">Review actions</h3>
      <p className="text-xs text-white/45">
        Approve publishes the product. Reject ends the review. Return for
        revision sends the product back to draft with a required note.
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

      <form action={rejectStoreProductAction} className="space-y-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Reject reason
          </span>
          <textarea
            name="note"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 outline-none focus:border-red-400/40"
            placeholder="Explain the rejection for the seller…"
          />
        </label>
        <PendingSubmitButton
          label="Reject product"
          pendingLabel="Rejecting…"
          className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </form>

      <form action={returnStoreProductForRevisionAction} className="space-y-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            Revision note
          </span>
          <textarea
            name="note"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 outline-none focus:border-amber-400/40"
            placeholder="Tell the seller what to change…"
          />
        </label>
        <PendingSubmitButton
          label="Return for revision"
          pendingLabel="Returning…"
          className="watch-focus-ring rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </form>
    </div>
  );
}
