import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import {
  createPartialRefundReservationServiceRole,
  listPartialRefundReservationsForPaymentAttempt,
  loadTrustedPartialRefundReservationFacts,
  type PartialRefundReservationSafeCommitView,
  type TrustedPartialRefundFactLoadResult,
} from "../../../../lib/store/partialRefundReservation";
import {
  buildPartialRefundProviderMoneyReadinessReport,
  buildProviderMoneyExecuteCandidate,
  createPartialRefundProviderMoneyServiceRole,
  resolveTrustedStripePaymentIntentRef,
  type PartialRefundProviderExecutionRecord,
  type ProviderMoneyExecuteCandidateModel,
} from "../../../../lib/store/partialRefundProviderMoneyExecution";
import {
  loadPartialRefundCaptureAccountingReview,
  type PartialRefundAccountingReviewModel,
} from "../../../../lib/store/partialRefundReservationAccounting";
import { listInFlightCommittingPartialRefundReservations } from "../../../../lib/store/partialRefundInFlightCommittingVisibility";
import type { PartialRefundInFlightCommittingVisibilityRow } from "../../../../lib/store/partialRefundInFlightCommittingVisibility";
import { loadAdminRefundOperations } from "../../../../lib/store/refundOperations";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { StatusChip } from "../AdminStoreShell";
import PartialRefundAccountingReviewPanel from "./PartialRefundAccountingReviewPanel";
import PartialRefundReservationPanel from "./PartialRefundReservationPanel";
import PartialRefundStuckCommittingRecoveryPanel from "./PartialRefundStuckCommittingRecoveryPanel";
import PartialRefundProviderMoneyExecutePanel from "./PartialRefundProviderMoneyExecutePanel";
import PartialRefundProviderMoneyReadinessPanel from "./PartialRefundProviderMoneyReadinessPanel";
import PartialRefundProviderMoneyRecoveryPanel from "./PartialRefundProviderMoneyRecoveryPanel";
import RefundOpsActions from "./RefundOpsActions";

export const metadata = {
  title: "Store refunds | UMTUBA Admin",
};

const PATH = APP_ROUTES.adminStoreRefunds;

export default async function AdminStoreRefundsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const sp = (await Promise.resolve(searchParams)) ?? {};
  const error =
    typeof sp.error === "string" ? sp.error : null;
  const flash =
    sp.created === "1"
      ? "Refund request created."
      : sp.updated === "1"
        ? "Refund request updated."
        : sp.executed === "1"
          ? "Refund execution finished."
          : null;

  const prStoreId =
    typeof sp.prStoreId === "string" ? sp.prStoreId.trim() : "";
  const prPaymentAttemptId =
    typeof sp.prPaymentAttemptId === "string"
      ? sp.prPaymentAttemptId.trim()
      : "";
  const prError = typeof sp.prError === "string" ? sp.prError : null;
  const prStatus = typeof sp.prStatus === "string" ? sp.prStatus : null;
  const prOk = sp.prOk === "1";
  const prLedgerId =
    typeof sp.prLedgerId === "string" ? sp.prLedgerId : null;

  const prRecOk = sp.prRecOk === "1";
  const prRecStatus =
    typeof sp.prRecStatus === "string" ? sp.prRecStatus : null;
  const prRecError =
    typeof sp.prRecError === "string" ? sp.prRecError : null;
  const prRecLedgerId =
    typeof sp.prRecLedgerId === "string" ? sp.prRecLedgerId : null;
  const prRecPrefill =
    typeof sp.prRecPrefill === "string" ? sp.prRecPrefill : null;

  const prVisOk = sp.prVisOk === "1";
  const prVisStatus =
    typeof sp.prVisStatus === "string" ? sp.prVisStatus : null;
  const prVisError =
    typeof sp.prVisError === "string" ? sp.prVisError : null;
  const prVisCount =
    typeof sp.prVisCount === "string" && /^\d+$/.test(sp.prVisCount)
      ? Number(sp.prVisCount)
      : null;
  const prVisStoreId =
    typeof sp.prVisStoreId === "string" ? sp.prVisStoreId.trim() : "";
  const prVisCaptureId =
    typeof sp.prVisCaptureId === "string" ? sp.prVisCaptureId.trim() : "";

  let prFacts: TrustedPartialRefundFactLoadResult | null = null;
  let prReservations: readonly PartialRefundReservationSafeCommitView[] = [];

  if (prStoreId && prPaymentAttemptId) {
    const boot = createPartialRefundReservationServiceRole();
    if (boot.ok) {
      prFacts = await loadTrustedPartialRefundReservationFacts(boot.supabase, {
        storeId: prStoreId,
        paymentAttemptId: prPaymentAttemptId,
      });
      const listed = await listPartialRefundReservationsForPaymentAttempt(
        { factClient: boot.supabase, repository: boot.repository },
        { storeId: prStoreId, paymentAttemptId: prPaymentAttemptId }
      );
      if (listed.ok) {
        prReservations = listed.reservations;
      }
    }
  }

  let committingRows: readonly PartialRefundInFlightCommittingVisibilityRow[] =
    [];
  let visLoadError: string | null = null;
  {
    const boot = createPartialRefundReservationServiceRole();
    if (!boot.ok) {
      visLoadError = boot.message;
    } else {
      const listed = await listInFlightCommittingPartialRefundReservations(
        { repository: boot.repository },
        {
          storeId: prVisStoreId || null,
          captureEventId: prVisCaptureId || null,
        }
      );
      if (!listed.ok) {
        visLoadError = listed.message;
      } else {
        committingRows = listed.rows;
      }
    }
  }

  const prAcctStoreId =
    typeof sp.prAcctStoreId === "string" ? sp.prAcctStoreId.trim() : "";
  const prAcctPaymentAttemptId =
    typeof sp.prAcctPaymentAttemptId === "string"
      ? sp.prAcctPaymentAttemptId.trim()
      : "";

  const prCompOk = sp.prCompOk === "1";
  const prCompStatus =
    typeof sp.prCompStatus === "string" ? sp.prCompStatus : null;
  const prCompError =
    typeof sp.prCompError === "string" ? sp.prCompError : null;
  const prCompLedgerId =
    typeof sp.prCompLedgerId === "string" ? sp.prCompLedgerId : null;
  const prCompRestored =
    typeof sp.prCompRestored === "string" ? sp.prCompRestored : null;
  const prCompPrefill =
    typeof sp.prCompPrefill === "string" ? sp.prCompPrefill : null;
  const prProvErr =
    typeof sp.prProvErr === "string" ? sp.prProvErr : null;
  const prProvStoreId =
    typeof sp.prProvStoreId === "string" ? sp.prProvStoreId.trim() : "";
  const prProvRecOk = sp.prProvRecOk === "1";
  const prProvRecStatus =
    typeof sp.prProvRecStatus === "string" ? sp.prProvRecStatus : null;
  const prProvRecError =
    typeof sp.prProvRecError === "string" ? sp.prProvRecError : null;
  const prProvRecLedgerId =
    typeof sp.prProvRecLedgerId === "string" ? sp.prProvRecLedgerId : null;
  const prProvRecExecutionId =
    typeof sp.prProvRecExecutionId === "string"
      ? sp.prProvRecExecutionId
      : null;
  const prProvExecOk = sp.prProvExecOk === "1";
  const prProvExecStatus =
    typeof sp.prProvExecStatus === "string" ? sp.prProvExecStatus : null;
  const prProvExecError =
    typeof sp.prProvExecError === "string" ? sp.prProvExecError : null;
  const prProvExecLedgerId =
    typeof sp.prProvExecLedgerId === "string"
      ? sp.prProvExecLedgerId.trim()
      : "";
  const prProvExecExecutionId =
    typeof sp.prProvExecExecutionId === "string"
      ? sp.prProvExecExecutionId
      : null;
  const prProvExecSubmit =
    typeof sp.prProvExecSubmit === "string" ? sp.prProvExecSubmit : null;

  let prAcctReview: PartialRefundAccountingReviewModel | null = null;
  let prAcctError: string | null = null;
  if (prAcctStoreId && prAcctPaymentAttemptId) {
    const boot = createPartialRefundReservationServiceRole();
    if (!boot.ok) {
      prAcctError = boot.message;
    } else {
      const acct = await loadPartialRefundCaptureAccountingReview(
        { factClient: boot.supabase, repository: boot.repository },
        { storeId: prAcctStoreId, paymentAttemptId: prAcctPaymentAttemptId }
      );
      if (acct.ok) {
        prAcctReview = acct.review;
      } else {
        prAcctError = acct.message;
      }
    }
  }

  let prProvExecutions: readonly PartialRefundProviderExecutionRecord[] = [];
  let prProvLoadError: string | null = null;
  let prProvExecCandidates: ProviderMoneyExecuteCandidateModel[] = [];
  let prProvExecLoadError: string | null = null;
  const prProvReadiness = buildPartialRefundProviderMoneyReadinessReport(
    process.env
  );

  if (prProvStoreId) {
    const boot = createPartialRefundProviderMoneyServiceRole();
    if (!boot.ok) {
      prProvLoadError = boot.message;
      prProvExecLoadError = boot.message;
    } else {
      const listed = await boot.repository.list({
        storeId: prProvStoreId,
        limit: 50,
      });
      if (!listed.ok) {
        prProvLoadError = listed.message;
      } else {
        prProvExecutions = listed.executions;
      }

      const ledgerBoot = createPartialRefundReservationServiceRole();
      if (!ledgerBoot.ok) {
        prProvExecLoadError = ledgerBoot.message;
      } else {
        const candidateLedgers: Array<{
          ledgerId: string;
          storeId: string;
          orderId: string;
          paymentAttemptId: string;
          captureEventId: string;
          refundAmountMinor: number;
          currency: string;
          status: string;
        }> = [];

        if (prProvExecLedgerId) {
          const row = await ledgerBoot.repository.getByLedgerId(
            prProvExecLedgerId
          );
          if (row && row.storeId === prProvStoreId) {
            candidateLedgers.push(row);
          } else if (row && row.storeId !== prProvStoreId) {
            prProvExecLoadError = "Ledger does not belong to store.";
          } else {
            prProvExecLoadError = "Ledger not found.";
          }
        } else if (prAcctReview) {
          for (const c of prAcctReview.committedReservations) {
            const row = await ledgerBoot.repository.getByLedgerId(c.ledgerId);
            if (row && row.storeId === prProvStoreId) {
              candidateLedgers.push(row);
            }
          }
        }

        for (const ledger of candidateLedgers) {
          const existing =
            (await boot.repository.getByLedger(ledger.ledgerId)) ?? null;
          let trustedPi: string | null = null;
          if (ledger.status === "committed") {
            const resolved = await resolveTrustedStripePaymentIntentRef(
              ledgerBoot.supabase,
              {
                storeId: ledger.storeId,
                orderId: ledger.orderId,
                paymentAttemptId: ledger.paymentAttemptId,
                captureEventId: ledger.captureEventId,
              }
            );
            if (resolved.ok) {
              trustedPi = resolved.paymentIntentId;
            }
          }
          prProvExecCandidates.push(
            buildProviderMoneyExecuteCandidate({
              ledger: {
                ledgerId: ledger.ledgerId,
                storeId: ledger.storeId,
                orderId: ledger.orderId,
                paymentAttemptId: ledger.paymentAttemptId,
                refundAmountMinor: ledger.refundAmountMinor,
                currency: ledger.currency,
                status: ledger.status as
                  | "planned"
                  | "committing"
                  | "committed"
                  | "failed"
                  | "compensated",
              },
              existingExecution: existing,
              trustedPaymentIntentId: trustedPi,
              env: process.env,
            })
          );
        }
      }
    }
  }

  const loaded = await loadAdminRefundOperations(supabase, { limit: 50 });
  const requests = "requests" in loaded ? loaded.requests : [];
  const loadError =
    "code" in loaded && !("requests" in loaded) ? loaded.message : null;

  return (
    <AdminStoreShell title="Refund operations">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            Refund Operations V1
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Full-order workflow only. Approve/reject/execute are server-side and
            fail-closed. Execute uses the existing full-order refund path — no
            partial refunds and no client money fields. Partial ledger
            reservation is a separate panel below and never executes money.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Requests" value={String(requests.length)} />
            <Stat
              label="Open"
              value={String(
                requests.filter((r) =>
                  ["requested", "under_review", "approved", "processing"].includes(
                    r.status
                  )
                ).length
              )}
            />
            <Stat
              label="Completed"
              value={String(
                requests.filter((r) => r.status === "completed").length
              )}
            />
          </dl>
        </div>

        {flash ? (
          <p
            role="status"
            className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            {flash}
          </p>
        ) : null}
        {error || loadError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {error ?? loadError}
          </p>
        ) : null}

        <PartialRefundAccountingReviewPanel
          path={PATH}
          storeIdDefault={prAcctStoreId}
          paymentAttemptIdDefault={prAcctPaymentAttemptId}
          review={prAcctReview}
          loadError={prAcctError}
          flashOk={prCompOk}
          flashStatus={prCompStatus}
          flashError={prCompError}
          flashLedgerId={prCompLedgerId}
          flashRestored={prCompRestored}
          prefillLedgerId={prCompPrefill}
        />

        <PartialRefundReservationPanel
          path={PATH}
          storeIdDefault={prStoreId}
          paymentAttemptIdDefault={prPaymentAttemptId}
          facts={prFacts}
          reservations={prReservations}
          flashStatus={prStatus}
          flashError={prError}
          flashOk={prOk}
          flashLedgerId={prLedgerId}
        />

        <PartialRefundStuckCommittingRecoveryPanel
          path={PATH}
          flashOk={prRecOk}
          flashStatus={prRecStatus}
          flashError={prRecError}
          flashLedgerId={prRecLedgerId}
          visOk={prVisOk}
          visStatus={prVisStatus}
          visError={prVisError}
          visCount={prVisCount}
          committingRows={committingRows}
          visLoadError={visLoadError}
          prefillLedgerId={prRecPrefill}
          visStoreIdDefault={prVisStoreId}
          visCaptureIdDefault={prVisCaptureId}
        />

        <PartialRefundProviderMoneyReadinessPanel flashError={prProvErr} />

        <PartialRefundProviderMoneyExecutePanel
          path={PATH}
          storeIdDefault={prProvStoreId}
          ledgerIdDefault={prProvExecLedgerId}
          candidates={prProvExecCandidates}
          loadError={prProvExecLoadError}
          firstTimeSubmitAllowed={prProvReadiness.firstTimeSubmitAllowed}
          executionMode={prProvReadiness.executionMode}
          flashOk={prProvExecOk}
          flashStatus={prProvExecStatus}
          flashError={prProvExecError}
          flashLedgerId={prProvExecLedgerId || null}
          flashExecutionId={prProvExecExecutionId}
          flashSubmit={prProvExecSubmit}
        />

        <PartialRefundProviderMoneyRecoveryPanel
          path={PATH}
          storeIdDefault={prProvStoreId}
          executions={prProvExecutions}
          loadError={prProvLoadError}
          flashOk={prProvRecOk}
          flashStatus={prProvRecStatus}
          flashError={prProvRecError}
          flashLedgerId={prProvRecLedgerId}
          flashExecutionId={prProvRecExecutionId}
        />

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Refund requests</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {requests.length === 0 ? (
              <li className="text-white/45">
                No durable refund requests yet. Create via seller/admin RPC when
                an order is paid and captured.
              </li>
            ) : (
              requests.map((req) => (
                <li
                  key={req.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">
                      {req.trustedAmountMinor} {req.currency}
                    </span>
                    <StatusChip status={req.status} />
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    order {req.orderId} · payment {req.paymentAttemptId} · store{" "}
                    {req.storeId}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    buyer {req.buyerUserId} · seller {req.sellerUserId}
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    Reason: {req.reason}
                  </p>
                  {req.rejectionReason ? (
                    <p className="mt-1 text-xs text-red-200/80">
                      Rejection: {req.rejectionReason}
                    </p>
                  ) : null}
                  {req.failureMessageSafe ? (
                    <p className="mt-1 text-xs text-amber-100/80">
                      Failure: {req.failureMessageSafe}
                      {req.failureCode ? ` (${req.failureCode})` : ""}
                    </p>
                  ) : null}
                  <RefundOpsActions
                    requestId={req.id}
                    status={req.status}
                    returnTo={PATH}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </AdminStoreShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white/90">{value}</dd>
    </div>
  );
}
