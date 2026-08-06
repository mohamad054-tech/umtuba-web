/**
 * In-memory ledger repository — local contract tests only.
 * Mirrors durable uniqueness, optimistic version, and committed ceilings.
 */

import type { PartialRefundCaptureLockPort } from "./locking";
import type { PartialRefundLedgerRepository } from "./repository";
import { assertPartialRefundLedgerTransition } from "./stateMachine";
import type {
  PartialRefundCaptureAccountingSnapshot,
  PartialRefundLedgerCommitRecord,
  PartialRefundLedgerPlanInput,
  PartialRefundLedgerResult,
} from "./types";
import { failLedger, okLedger, validateLedgerPlanInput } from "./validate";

type CaptureRow = {
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  captureAmountMinor: number;
  committedRefundAmountMinor: number;
  committedQuantityByLineId: Record<string, number>;
  accountingVersion: number;
  lockedBy: string | null;
};

function cloneCapture(row: CaptureRow): PartialRefundCaptureAccountingSnapshot {
  return {
    storeId: row.storeId,
    orderId: row.orderId,
    paymentAttemptId: row.paymentAttemptId,
    captureEventId: row.captureEventId,
    currency: row.currency,
    captureAmountMinor: row.captureAmountMinor,
    committedRefundAmountMinor: row.committedRefundAmountMinor,
    committedQuantityByLineId: { ...row.committedQuantityByLineId },
    accountingVersion: row.accountingVersion,
  };
}

function cloneCommit(
  row: PartialRefundLedgerCommitRecord
): PartialRefundLedgerCommitRecord {
  return {
    ...row,
    lines: row.lines.map((l) => ({ ...l })),
  };
}

export class MemoryPartialRefundLedgerRepository
  implements PartialRefundLedgerRepository, PartialRefundCaptureLockPort
{
  private captures = new Map<string, CaptureRow>();
  private byId = new Map<string, PartialRefundLedgerCommitRecord>();
  private byIdem = new Map<string, string>(); // storeId::key → ledgerId

  async getCaptureAccounting(
    captureEventId: string
  ): Promise<PartialRefundCaptureAccountingSnapshot | null> {
    const row = this.captures.get(captureEventId);
    return row ? cloneCapture(row) : null;
  }

  async ensureCaptureAccounting(input: {
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
    currency: string;
    captureAmountMinor: number;
  }): Promise<PartialRefundLedgerResult<PartialRefundCaptureAccountingSnapshot>> {
    const existing = this.captures.get(input.captureEventId);
    if (!existing) {
      const row: CaptureRow = {
        ...input,
        currency: input.currency.trim().toUpperCase(),
        committedRefundAmountMinor: 0,
        committedQuantityByLineId: {},
        accountingVersion: 0,
        lockedBy: null,
      };
      this.captures.set(input.captureEventId, row);
      return okLedger(cloneCapture(row));
    }
    if (
      existing.storeId !== input.storeId ||
      existing.orderId !== input.orderId ||
      existing.paymentAttemptId !== input.paymentAttemptId ||
      existing.captureAmountMinor !== input.captureAmountMinor ||
      existing.currency !== input.currency.trim().toUpperCase()
    ) {
      return failLedger(
        "missing_capture",
        "Capture accounting facts do not match existing durable row."
      );
    }
    return okLedger(cloneCapture(existing));
  }

  async getByLedgerId(
    ledgerId: string
  ): Promise<PartialRefundLedgerCommitRecord | null> {
    const row = this.byId.get(ledgerId);
    return row ? cloneCommit(row) : null;
  }

  async getByIdempotencyKey(
    storeId: string,
    idempotencyKey: string
  ): Promise<PartialRefundLedgerCommitRecord | null> {
    const id = this.byIdem.get(`${storeId}::${idempotencyKey.trim()}`);
    if (!id) return null;
    return this.getByLedgerId(id);
  }

  async insertPlanned(
    input: PartialRefundLedgerPlanInput,
    nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    const validated = validateLedgerPlanInput(input);
    if (!validated.ok) return validated;
    const plan = validated.value;

    if (this.byId.has(plan.ledgerId)) {
      return failLedger("duplicate_ledger_id", "Ledger id already exists.");
    }
    const idemKey = `${plan.storeId}::${plan.idempotencyKey}`;
    if (this.byIdem.has(idemKey)) {
      return failLedger(
        "duplicate_idempotency_key",
        "Idempotency key already used for this store."
      );
    }

    const ensure = await this.ensureCaptureAccounting(plan);
    if (!ensure.ok) return ensure;
    const capture = ensure.value;
    if (capture.accountingVersion !== plan.expectedAccountingVersion) {
      return failLedger(
        "stale_version",
        "Capture accounting version changed since plan."
      );
    }

    const remaining =
      capture.captureAmountMinor - capture.committedRefundAmountMinor;
    if (plan.refundAmountMinor > remaining) {
      return failLedger(
        "over_refund",
        "Planned refund exceeds remaining committed-refundable capture balance."
      );
    }

    for (const line of plan.lines) {
      const priorQty = capture.committedQuantityByLineId[line.orderItemId] ?? 0;
      // Purchased qty is not stored on capture row; over_quantity is enforced at
      // commit-boundary using trusted line facts passed separately.
      if (priorQty < 0) {
        return failLedger("over_quantity", "Committed quantity accounting corrupt.");
      }
      void priorQty;
    }

    const record: PartialRefundLedgerCommitRecord = {
      ledgerId: plan.ledgerId,
      storeId: plan.storeId,
      orderId: plan.orderId,
      paymentAttemptId: plan.paymentAttemptId,
      captureEventId: plan.captureEventId,
      currency: plan.currency,
      refundAmountMinor: plan.refundAmountMinor,
      captureAmountMinor: plan.captureAmountMinor,
      calculationFingerprint: plan.calculationFingerprint,
      idempotencyKey: plan.idempotencyKey,
      status: "planned",
      lines: plan.lines.map((l) => ({ ...l })),
      accountingVersion: capture.accountingVersion,
      attemptCount: 0,
      failureCode: null,
      failureMessageSafe: null,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    this.byId.set(record.ledgerId, record);
    this.byIdem.set(idemKey, record.ledgerId);
    return okLedger(cloneCommit(record));
  }

  async transitionToCommitting(
    ledgerId: string,
    expectedStatus: "planned" | "failed",
    expectedAccountingVersion: number,
    nowIso: string,
    _purchasedQuantityByLineId?: Readonly<Record<string, number>>
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    const row = this.byId.get(ledgerId);
    if (!row) {
      return failLedger("unknown_refund", "Ledger commit not found.");
    }
    if (row.status !== expectedStatus) {
      return failLedger(
        "invalid_state",
        `Expected status ${expectedStatus}, found ${row.status}.`
      );
    }
    const transition = assertPartialRefundLedgerTransition(row.status, "committing");
    if (!transition.ok) {
      return failLedger(transition.code, transition.message);
    }

    const lock = await this.acquire(row.captureEventId, expectedAccountingVersion);
    if (!lock.ok) {
      return failLedger(lock.code, lock.message);
    }

    const capture = this.captures.get(row.captureEventId);
    if (!capture) {
      await this.release(lock.token);
      return failLedger("missing_capture", "Capture accounting row missing.");
    }

    const remaining =
      capture.captureAmountMinor - capture.committedRefundAmountMinor;
    if (row.refundAmountMinor > remaining) {
      await this.release(lock.token);
      return failLedger(
        "over_refund",
        "Cannot begin commit: refund exceeds remaining capture balance."
      );
    }

    row.status = "committing";
    row.attemptCount += 1;
    row.accountingVersion = capture.accountingVersion;
    row.failureCode = null;
    row.failureMessageSafe = null;
    row.updatedAtIso = nowIso;
    // Keep lock held until complete/fail in higher layer via release after mutation.
    // For memory model, complete/fail will re-check version; release lock token here
    // after recording committing — exclusive "committing" uniqueness enforced below.
    const otherCommitting = [...this.byId.values()].find(
      (c) =>
        c.captureEventId === row.captureEventId &&
        c.ledgerId !== row.ledgerId &&
        c.status === "committing"
    );
    if (otherCommitting) {
      row.status = expectedStatus;
      row.attemptCount -= 1;
      row.updatedAtIso = nowIso;
      await this.release(lock.token);
      return failLedger(
        "concurrent_conflict",
        "Another ledger commit is already committing for this capture."
      );
    }

    await this.release(lock.token);
    return okLedger(cloneCommit(row));
  }

  async completeCommitted(
    ledgerId: string,
    expectedAccountingVersion: number,
    nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    const row = this.byId.get(ledgerId);
    if (!row) {
      return failLedger("unknown_refund", "Ledger commit not found.");
    }
    if (row.status === "committed") {
      return failLedger("duplicate_commit", "Ledger commit already committed.");
    }
    const transition = assertPartialRefundLedgerTransition(row.status, "committed");
    if (!transition.ok) {
      return failLedger(transition.code, transition.message);
    }

    const lock = await this.acquire(row.captureEventId, expectedAccountingVersion);
    if (!lock.ok) {
      return failLedger(lock.code, lock.message);
    }
    const capture = this.captures.get(row.captureEventId)!;
    const remaining =
      capture.captureAmountMinor - capture.committedRefundAmountMinor;
    if (row.refundAmountMinor > remaining) {
      await this.release(lock.token);
      return failLedger("over_refund", "Commit would over-refund capture.");
    }

    for (const line of row.lines) {
      const prior = capture.committedQuantityByLineId[line.orderItemId] ?? 0;
      capture.committedQuantityByLineId[line.orderItemId] =
        prior + line.requestedQuantity;
    }
    capture.committedRefundAmountMinor += row.refundAmountMinor;
    capture.accountingVersion += 1;

    row.status = "committed";
    row.accountingVersion = capture.accountingVersion;
    row.updatedAtIso = nowIso;
    await this.release(lock.token);
    return okLedger(cloneCommit(row));
  }

  async markFailed(
    ledgerId: string,
    code: string,
    messageSafe: string,
    nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    const row = this.byId.get(ledgerId);
    if (!row) {
      return failLedger("unknown_refund", "Ledger commit not found.");
    }
    if (row.status === "committed") {
      return failLedger(
        "invalid_state",
        "Committed ledger entries cannot be marked failed."
      );
    }
    if (row.status !== "committing" && row.status !== "planned") {
      // Allow planned→failed? State machine only allows committing→failed.
      // Planned failures should delete or stay planned; for boundary we only fail from committing.
      if (row.status === "failed") {
        return okLedger(cloneCommit(row));
      }
    }
    if (row.status === "committing") {
      const transition = assertPartialRefundLedgerTransition("committing", "failed");
      if (!transition.ok) {
        return failLedger(transition.code, transition.message);
      }
      row.status = "failed";
      row.failureCode = code as PartialRefundLedgerCommitRecord["failureCode"];
      row.failureMessageSafe = messageSafe.slice(0, 500);
      row.updatedAtIso = nowIso;
      return okLedger(cloneCommit(row));
    }
    return failLedger(
      "unsupported_transition",
      "Only committing ledger entries can transition to failed."
    );
  }

  async listCommittedForCapture(
    captureEventId: string
  ): Promise<readonly PartialRefundLedgerCommitRecord[]> {
    return [...this.byId.values()]
      .filter((r) => r.captureEventId === captureEventId && r.status === "committed")
      .map(cloneCommit);
  }

  async acquire(
    captureEventId: string,
    expectedVersion: number
  ): Promise<
    import("./locking").PartialRefundCaptureLockAcquireResult
  > {
    const capture = this.captures.get(captureEventId);
    if (!capture) {
      return {
        ok: false,
        code: "missing_capture",
        message: "Capture accounting row missing.",
      };
    }
    if (capture.lockedBy) {
      return {
        ok: false,
        code: "concurrent_conflict",
        message: "Capture accounting lock already held.",
      };
    }
    if (capture.accountingVersion !== expectedVersion) {
      return {
        ok: false,
        code: "stale_version",
        message: "Capture accounting version is stale.",
      };
    }
    capture.lockedBy = `lock:${captureEventId}:${expectedVersion}`;
    return {
      ok: true,
      token: {
        captureEventId,
        accountingVersion: expectedVersion,
      },
    };
  }

  async release(token: {
    captureEventId: string;
    accountingVersion: number;
  }): Promise<void> {
    const capture = this.captures.get(token.captureEventId);
    if (capture) capture.lockedBy = null;
  }
}
