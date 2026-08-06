/**
 * Capture-scoped optimistic locking for partial refund ledger accounting.
 * Concrete stores may map this to FOR UPDATE + accounting_version columns.
 */

export type PartialRefundCaptureLockToken = {
  captureEventId: string;
  accountingVersion: number;
};

export type PartialRefundCaptureLockAcquireResult =
  | { ok: true; token: PartialRefundCaptureLockToken }
  | {
      ok: false;
      code: "concurrent_conflict" | "stale_version" | "missing_capture";
      message: string;
    };

/**
 * Repository-facing lock port. Implementations must serialize mutations per capture.
 */
export type PartialRefundCaptureLockPort = {
  /**
   * Acquire exclusive mutation rights for the capture accounting row.
   * `expectedVersion` enforces optimistic concurrency (stale_version on mismatch).
   */
  acquire(
    captureEventId: string,
    expectedVersion: number
  ): Promise<PartialRefundCaptureLockAcquireResult>;

  /** Release after successful mutation or failure handling. */
  release(token: PartialRefundCaptureLockToken): Promise<void>;
};
