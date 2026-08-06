/**
 * Repository port for durable partial refund ledger.
 * SQL migration drafts the Postgres shape; memory repo proves contracts in tests.
 */

import type {
  PartialRefundCaptureAccountingSnapshot,
  PartialRefundLedgerCommitRecord,
  PartialRefundLedgerPlanInput,
  PartialRefundLedgerResult,
} from "./types";

export type PartialRefundLedgerRepository = {
  getCaptureAccounting(
    captureEventId: string
  ): Promise<PartialRefundCaptureAccountingSnapshot | null>;

  /**
   * Ensure capture accounting row exists (fail-closed if facts mismatch existing).
   */
  ensureCaptureAccounting(input: {
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
    currency: string;
    captureAmountMinor: number;
  }): Promise<PartialRefundLedgerResult<PartialRefundCaptureAccountingSnapshot>>;

  getByLedgerId(
    ledgerId: string
  ): Promise<PartialRefundLedgerCommitRecord | null>;

  getByIdempotencyKey(
    storeId: string,
    idempotencyKey: string
  ): Promise<PartialRefundLedgerCommitRecord | null>;

  insertPlanned(
    input: PartialRefundLedgerPlanInput,
    nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>>;

  /**
   * planned|failed → committing.
   * Service-role adapter requires purchasedQuantityByLineId (begin RPC quantity guard).
   * Memory repository may ignore the optional guard (app layer already validated).
   */
  transitionToCommitting(
    ledgerId: string,
    expectedStatus: "planned" | "failed",
    expectedAccountingVersion: number,
    nowIso: string,
    purchasedQuantityByLineId?: Readonly<Record<string, number>>
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>>;

  completeCommitted(
    ledgerId: string,
    expectedAccountingVersion: number,
    nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>>;

  markFailed(
    ledgerId: string,
    code: string,
    messageSafe: string,
    nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>>;

  listCommittedForCapture(
    captureEventId: string
  ): Promise<readonly PartialRefundLedgerCommitRecord[]>;

  /**
   * Read-only list of status=committing rows (privileged RPC).
   * Does not mutate ledger state.
   */
  listCommitting(input?: {
    storeId?: string | null;
    captureEventId?: string | null;
    limit?: number | null;
  }): Promise<readonly PartialRefundInFlightCommittingRow[]>;
};

/** Operator-safe in-flight committing discovery row (no amounts/lines). */
export type PartialRefundInFlightCommittingRow = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  captureEventId: string;
  status: "committing";
  accountingVersion: number;
  createdAtIso: string;
  updatedAtIso: string;
};
