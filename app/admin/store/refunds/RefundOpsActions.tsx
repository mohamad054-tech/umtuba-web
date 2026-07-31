import {
  adminExecuteRefundOperationAction,
  adminTransitionRefundOperationAction,
} from "../../../actions/storeRefundOps";
import PendingSubmitButton from "../PendingSubmitButton";

type Props = {
  requestId: string;
  status: string;
  returnTo: string;
};

export default function RefundOpsActions({
  requestId,
  status,
  returnTo,
}: Props) {
  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
        Admin actions
      </p>

      {status === "requested" ? (
        <form action={adminTransitionRefundOperationAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="toStatus" value="under_review" />
          <PendingSubmitButton
            label="Start review"
            pendingLabel="Updating…"
            className="watch-focus-ring rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-60"
          />
        </form>
      ) : null}

      {status === "under_review" ? (
        <>
          <form action={adminTransitionRefundOperationAction}>
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="toStatus" value="approved" />
            <PendingSubmitButton
              label="Approve"
              pendingLabel="Approving…"
              className="watch-focus-ring rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black text-black disabled:opacity-60"
            />
          </form>
          <form action={adminTransitionRefundOperationAction} className="space-y-2">
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="toStatus" value="rejected" />
            <textarea
              name="note"
              required
              minLength={3}
              maxLength={1000}
              rows={2}
              placeholder="Rejection reason (safe, user-visible)…"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-2 text-xs outline-none focus:border-red-400/40"
            />
            <PendingSubmitButton
              label="Reject"
              pendingLabel="Rejecting…"
              className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-60"
            />
          </form>
        </>
      ) : null}

      {status === "approved" || status === "failed" ? (
        <form action={adminExecuteRefundOperationAction} className="space-y-2">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input
            type="hidden"
            name="executionIdempotencyKey"
            value={`refund-exec:${requestId}`}
          />
          <p className="text-[11px] text-white/45">
            Execute runs the existing full-order refund path only. No partial
            refund. No client amount.
          </p>
          <PendingSubmitButton
            label={status === "failed" ? "Retry execute" : "Execute full-order refund"}
            pendingLabel="Executing…"
            className="watch-focus-ring rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-black text-black disabled:opacity-60"
          />
        </form>
      ) : null}

      {status === "requested" ||
      status === "under_review" ||
      status === "approved" ? (
        <form action={adminTransitionRefundOperationAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="toStatus" value="cancelled" />
          <PendingSubmitButton
            label="Cancel request"
            pendingLabel="Cancelling…"
            className="watch-focus-ring rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/70 disabled:opacity-60"
          />
        </form>
      ) : null}

      {![
        "requested",
        "under_review",
        "approved",
        "failed",
      ].includes(status) ? (
        <p className="text-xs text-white/45">
          No workflow actions available for status <code>{status}</code>.
        </p>
      ) : null}
    </div>
  );
}
