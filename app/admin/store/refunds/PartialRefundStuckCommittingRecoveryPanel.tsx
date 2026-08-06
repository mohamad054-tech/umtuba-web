import { adminListInFlightCommittingPartialRefundAction } from "../../../actions/storePartialRefundInFlightCommittingVisibility";
import { adminRecoverStuckCommittingPartialRefundAction } from "../../../actions/storePartialRefundStuckCommittingRecovery";
import type { PartialRefundInFlightCommittingVisibilityRow } from "../../../../lib/store/partialRefundInFlightCommittingVisibility";

type Props = {
  path: string;
  flashOk: boolean;
  flashStatus: string | null;
  flashError: string | null;
  flashLedgerId: string | null;
  visOk: boolean;
  visStatus: string | null;
  visError: string | null;
  visCount: number | null;
  committingRows: readonly PartialRefundInFlightCommittingVisibilityRow[];
  visLoadError: string | null;
  prefillLedgerId: string | null;
  visStoreIdDefault: string;
  visCaptureIdDefault: string;
};

/**
 * Admin recovery for stuck in-flight (committing) partial-refund reservations.
 * Includes read-only discovery of committing rows — recovery remains explicit.
 */
export default function PartialRefundStuckCommittingRecoveryPanel({
  path,
  flashOk,
  flashStatus,
  flashError,
  flashLedgerId,
  visOk,
  visStatus,
  visError,
  visCount,
  committingRows,
  visLoadError,
  prefillLedgerId,
  visStoreIdDefault,
  visCaptureIdDefault,
}: Props) {
  const ledgerDefault = prefillLedgerId ?? flashLedgerId ?? "";

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

      <section
        className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4"
        data-testid="pr-vis-section"
      >
        <h3 className="text-sm font-black text-rose-50">
          In-flight committing reservations
        </h3>
        <p className="mt-1 text-xs text-white/50">
          Listing does not change state or release locks. Select a ledger id
          below, then submit recovery separately.
        </p>

        {visOk ? (
          <p
            role="status"
            className="mt-2 text-xs text-emerald-100"
            data-testid="pr-vis-flash"
          >
            Visibility refresh: {visStatus ?? "ok"}
            {visCount != null ? ` · ${visCount} row(s)` : ""}.
          </p>
        ) : null}
        {visError ? (
          <p role="alert" className="mt-2 text-xs text-red-100">
            {visStatus ? `[${visStatus}] ` : ""}
            {visError}
          </p>
        ) : null}
        {visLoadError ? (
          <p role="alert" className="mt-2 text-xs text-amber-100">
            {visLoadError}
          </p>
        ) : null}

        <form
          action={adminListInFlightCommittingPartialRefundAction}
          className="mt-3 grid gap-2 sm:grid-cols-3"
          data-testid="pr-vis-form"
        >
          <input type="hidden" name="returnTo" value={path} />
          <label className="block text-[10px] text-white/45 sm:col-span-1">
            Store id (optional)
            <input
              name="storeId"
              defaultValue={visStoreIdDefault}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
            />
          </label>
          <label className="block text-[10px] text-white/45 sm:col-span-1">
            Capture id (optional)
            <input
              name="captureEventId"
              defaultValue={visCaptureIdDefault}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5"
              data-testid="pr-vis-refresh"
            >
              Refresh list
            </button>
          </div>
        </form>

        {committingRows.length === 0 ? (
          <p
            className="mt-3 text-xs text-white/45"
            data-testid="pr-vis-empty"
          >
            No in-flight committing reservations found for this scope.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="pr-vis-list">
            {committingRows.map((row) => (
              <li
                key={row.ledgerId}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-white">
                    {row.ledgerId}
                  </span>
                  <span className="uppercase text-white/40">{row.status}</span>
                </div>
                <p className="mt-1 text-white/45">
                  {row.label} · store {row.storeId.slice(0, 8)}… · capture{" "}
                  {row.captureEventId.slice(0, 8)}… · v{row.accountingVersion} ·{" "}
                  {row.createdAtIso}
                </p>
                <a
                  href={`${path}?prRecPrefill=${encodeURIComponent(row.ledgerId)}`}
                  className="mt-2 inline-block text-[11px] font-bold text-rose-100 underline underline-offset-2"
                  data-testid={`pr-vis-use-${row.ledgerId}`}
                >
                  Use this ledger id in recovery form
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

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
            defaultValue={ledgerDefault}
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
