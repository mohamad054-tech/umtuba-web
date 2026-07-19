import {
  approveSellerApplicationAction,
  rejectSellerApplicationAction,
  suspendSellerApplicationAction,
} from "../../actions/storeAdmin";
import PendingSubmitButton from "./PendingSubmitButton";

type Props = {
  applicationId: string;
  status: string;
  returnTo: string;
};

export default function SellerReviewActions({
  applicationId,
  status,
  returnTo,
}: Props) {
  const pending = status === "pending";
  const canSuspend = status === "pending" || status === "approved";

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-black">Review actions</h3>
      <p className="text-xs text-white/45">
        Reviewer identity comes from your signed-in admin session — never from
        the form.
      </p>

      {pending ? (
        <form action={approveSellerApplicationAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <PendingSubmitButton
            label="Approve"
            pendingLabel="Approving…"
            className="watch-focus-ring rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      ) : null}

      {pending ? (
        <form action={rejectSellerApplicationAction} className="space-y-2">
          <input type="hidden" name="applicationId" value={applicationId} />
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
              placeholder="Explain the rejection for the applicant…"
            />
          </label>
          <PendingSubmitButton
            label="Reject"
            pendingLabel="Rejecting…"
            className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      ) : null}

      {canSuspend ? (
        <form action={suspendSellerApplicationAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <PendingSubmitButton
            label="Suspend"
            pendingLabel="Suspending…"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      ) : null}
    </div>
  );
}
