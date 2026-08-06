/**
 * Service-role PartialRefundLedgerRepository adapter.
 * Calls only privileged 20260900 RPCs via an injected PartialRefundLedgerRpcPort.
 * Reservation accounting only — never Stripe/Sync/provider refund or money movement.
 */

import { assertNotBrowser } from "./rpcClient";
import type { PartialRefundLedgerRpcPort } from "./rpcContracts";
import {
  mapPartialRefundRpcErrorMessage,
  safeRpcErrorMessage,
} from "./errors";
import {
  parseCaptureAccountingRpc,
  parseCommitEnvelope,
  parseCommittedList,
} from "./rpcParse";
import type { PartialRefundLedgerRepository } from "./repository";
import type {
  PartialRefundCaptureAccountingSnapshot,
  PartialRefundLedgerCommitRecord,
  PartialRefundLedgerPlanInput,
  PartialRefundLedgerResult,
} from "./types";
import { failLedger, okLedger, validateLedgerPlanInput } from "./validate";
import {
  validateBeginRpcArgs,
  validateFailRpcArgs,
  validatePlanRpcArgs,
} from "./rpcValidate";

export class ServiceRolePartialRefundLedgerRepository
  implements PartialRefundLedgerRepository
{
  constructor(private readonly rpc: PartialRefundLedgerRpcPort) {
    assertNotBrowser();
    if (!rpc) {
      throw new Error("service_role_required");
    }
  }

  async getCaptureAccounting(
    captureEventId: string
  ): Promise<PartialRefundCaptureAccountingSnapshot | null> {
    try {
      const raw = await this.rpc.getCaptureAccounting(captureEventId);
      const parsed = parseCaptureAccountingRpc(raw);
      if (!parsed.ok) {
        return null;
      }
      return parsed.found ? parsed.value : null;
    } catch (e) {
      // Read path: treat transport as miss only when malformed; rethrow mapped via null
      void e;
      return null;
    }
  }

  async ensureCaptureAccounting(input: {
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
    currency: string;
    captureAmountMinor: number;
  }): Promise<PartialRefundLedgerResult<PartialRefundCaptureAccountingSnapshot>> {
    try {
      const raw = await this.rpc.ensureCaptureAccounting(input);
      const ensured = parseCaptureAccountingRpc(raw);
      if (!ensured.ok || !ensured.found) {
        return failLedger(
          "malformed_id",
          safeRpcErrorMessage("malformed_rpc_response", "Ensure capture failed.")
        );
      }
      // Prefer full snapshot (qty map) from get when available.
      const full = await this.getCaptureAccounting(input.captureEventId);
      return okLedger(full ?? ensured.value);
    } catch (e) {
      return this.mapThrown(e, "Ensure capture accounting failed.");
    }
  }

  async getByLedgerId(
    ledgerId: string
  ): Promise<PartialRefundLedgerCommitRecord | null> {
    try {
      const raw = await this.rpc.getCommit(ledgerId);
      const parsed = parseCommitEnvelope(raw);
      if (!parsed.ok) return null;
      return parsed.found ? parsed.commit : null;
    } catch {
      return null;
    }
  }

  /**
   * No dedicated idempotency-key read RPC — DB plan RPC owns fingerprint replay.
   * Application-layer planPartialRefundLedgerCommit falls through to insertPlanned.
   */
  async getByIdempotencyKey(
    _storeId: string,
    _idempotencyKey: string
  ): Promise<PartialRefundLedgerCommitRecord | null> {
    return null;
  }

  async insertPlanned(
    input: PartialRefundLedgerPlanInput,
    _nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    const validated = validateLedgerPlanInput(input);
    if (!validated.ok) return validated;

    const planArgs = {
      ledgerId: validated.value.ledgerId,
      storeId: validated.value.storeId,
      orderId: validated.value.orderId,
      paymentAttemptId: validated.value.paymentAttemptId,
      captureEventId: validated.value.captureEventId,
      currency: validated.value.currency,
      captureAmountMinor: validated.value.captureAmountMinor,
      refundAmountMinor: validated.value.refundAmountMinor,
      calculationFingerprint: validated.value.calculationFingerprint,
      idempotencyKey: validated.value.idempotencyKey,
      expectedAccountingVersion: validated.value.expectedAccountingVersion,
      lines: validated.value.lines.map((l) => ({
        orderItemId: l.orderItemId,
        requestedQuantity: l.requestedQuantity,
        refundAmountMinor: l.refundAmountMinor,
      })),
    };
    const argCheck = validatePlanRpcArgs(planArgs);
    if (!argCheck.ok) {
      const code =
        argCheck.code === "empty_lines" ||
        argCheck.code === "inconsistent_line_math" ||
        argCheck.code === "zero_amount" ||
        argCheck.code === "negative_amount" ||
        argCheck.code === "currency_mismatch" ||
        argCheck.code === "malformed_id" ||
        argCheck.code === "malformed_idempotency_key"
          ? argCheck.code
          : "malformed_id";
      return failLedger(code, argCheck.message);
    }

    try {
      const raw = await this.rpc.plan(planArgs);
      const parsed = parseCommitEnvelope(raw);
      if (!parsed.ok || !parsed.found) {
        return failLedger(
          "malformed_id",
          safeRpcErrorMessage("malformed_rpc_response", "Plan RPC malformed.")
        );
      }
      return okLedger(parsed.commit);
    } catch (e) {
      return this.mapThrown(e, "Plan ledger RPC failed.");
    }
  }

  async transitionToCommitting(
    ledgerId: string,
    _expectedStatus: "planned" | "failed",
    _expectedAccountingVersion: number,
    _nowIso: string,
    purchasedQuantityByLineId?: Readonly<Record<string, number>>
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    if (
      !purchasedQuantityByLineId ||
      Object.keys(purchasedQuantityByLineId).length === 0
    ) {
      return failLedger(
        "missing_order_item",
        "Service-role begin requires purchasedQuantityByLineId."
      );
    }
    const args = { ledgerId, purchasedQuantityByLineId };
    const argCheck = validateBeginRpcArgs(args);
    if (!argCheck.ok) {
      return failLedger(
        argCheck.code === "malformed_quantity" ? "over_quantity" : "malformed_id",
        argCheck.message
      );
    }

    try {
      const raw = await this.rpc.begin(args);
      const parsed = parseCommitEnvelope(raw);
      if (!parsed.ok || !parsed.found) {
        return failLedger(
          "malformed_id",
          safeRpcErrorMessage("malformed_rpc_response", "Begin RPC malformed.")
        );
      }
      return okLedger(parsed.commit);
    } catch (e) {
      return this.mapThrown(e, "Begin ledger RPC failed.");
    }
  }

  async completeCommitted(
    ledgerId: string,
    _expectedAccountingVersion: number,
    _nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    try {
      const raw = await this.rpc.complete(ledgerId);
      const parsed = parseCommitEnvelope(raw);
      if (!parsed.ok || !parsed.found) {
        return failLedger(
          "malformed_id",
          safeRpcErrorMessage(
            "malformed_rpc_response",
            "Complete RPC malformed."
          )
        );
      }
      return okLedger(parsed.commit);
    } catch (e) {
      return this.mapThrown(e, "Complete ledger RPC failed.");
    }
  }

  async markFailed(
    ledgerId: string,
    code: string,
    messageSafe: string,
    _nowIso: string
  ): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
    const args = {
      ledgerId,
      failureCode: code,
      failureMessageSafe: messageSafe,
    };
    const argCheck = validateFailRpcArgs(args);
    if (!argCheck.ok) {
      return failLedger("malformed_idempotency_key", argCheck.message);
    }
    try {
      const raw = await this.rpc.fail(args);
      const parsed = parseCommitEnvelope(raw);
      if (!parsed.ok || !parsed.found) {
        return failLedger(
          "malformed_id",
          safeRpcErrorMessage("malformed_rpc_response", "Fail RPC malformed.")
        );
      }
      return okLedger(parsed.commit);
    } catch (e) {
      return this.mapThrown(e, "Fail ledger RPC failed.");
    }
  }

  async listCommittedForCapture(
    captureEventId: string
  ): Promise<readonly PartialRefundLedgerCommitRecord[]> {
    try {
      const raw = await this.rpc.listCommitted(captureEventId);
      return parseCommittedList(raw) ?? [];
    } catch {
      return [];
    }
  }

  private mapThrown<T>(
    e: unknown,
    fallback: string
  ): PartialRefundLedgerResult<T> {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : fallback;
    if (message === "browser_forbidden") {
      return failLedger(
        "unsupported_runtime",
        safeRpcErrorMessage("browser_forbidden", fallback)
      );
    }
    const code = mapPartialRefundRpcErrorMessage(message);
    return failLedger(
      code === "rpc_failed" ? "unsupported_runtime" : code,
      safeRpcErrorMessage(code, fallback)
    );
  }
}
