import { adminRecoverStuckCommittingPartialRefundAction } from "../../../actions/storePartialRefundStuckCommittingRecovery";

type Props = {
  path: string;
  flashOk: boolean;
  flashStatus: string | null;
  flashError: string | null;
  flashLedgerId: string | null;
};

/**
 * Admin recovery for stuck in-flight (committing) partial-refund reservations.
 * Lock release only — not money refund or committed compensation.
 */
export default function PartialRefundStuckCommittingRecoveryPanel({
  path,
  flashOk,
  flashStatus,
  flashError,
  flashLedgerId,
}: Props) {
  return (
    <div
      className="rounded-[28px] border border-rose-400/25 bg-[#080816]/80 p-5"
      data-testid="partial-refund-stuck-committing-recovery-panel"
    >
      <h2 className="text-lg font-black text-rose-50">
        Recover stuck in-flight reservation
      </h2>
      <p className="mt-2 text-sm text-white/55">
        This only releases a committing ledger lock. It does not refund money,
        cancel a committed reservation, or perform compensation.
      </p>

      {flashOk ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          data-testid="pr-rec-success"
        >
          In-flight committing lock released
          {flashLedgerId ? ` (${flashLedgerId})` : ""}. Status:{" "}
          {flashStatus ?? "recovered"}. Money moved: no. Compensation: no.
        </p>
      ) : null}
      {flashError ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          data-testid="pr-rec-error"
        >
          {flashStatus ? `[${flashStatus}] ` : ""}
          {flashError}
        </p>
      ) : null}

      <form
        action={adminRecoverStuckCommittingPartialRefundAction}
        className="mt-4 space-y-3"
        data-testid="pr-rec-form"
      >
        <input type="hidden" name="returnTo" value={path} />
        <label className="block text-xs text-white/50">
          Ledger / commit id
          <input
            name="ledgerId"
            required
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            data-testid="pr-rec-ledger-id"
          />
        </label>
        <label className="block text-xs text-white/50">
          Expected store id (optional scope check)
          <input
            name="expectedStoreId"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-white/50">
          Operator reason (optional)
          <textarea
            name="operatorReason"
            rows={2}
            maxLength={500}
            placeholder="Describe why the committing lock is being released"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            data-testid="pr-rec-reason"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-2 text-sm font-bold text-rose-50 hover:bg-rose-500/25"
          data-testid="pr-rec-submit"
        >
          Release committing lock
        </button>
      </form>
    </div>
  );
}
