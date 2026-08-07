/**
 * Service-role adapter for store_partial_refund_provider_executions RPCs.
 * Fail-closed on malformed responses. Never creates browser clients.
 */

import {
  assertNotBrowserProviderMoney,
  mapProviderExecutionRpcError,
  type PartialRefundProviderExecutionRpcPort,
} from "./rpcContracts";
import {
  parseClaimEnvelope,
  parseGetEnvelope,
  parseListEnvelope,
  parseUpdateEnvelope,
} from "./rpcParse";
import type {
  ClaimPartialRefundProviderExecutionInput,
  PartialRefundProviderExecutionRepository,
  UpdatePartialRefundProviderExecutionInput,
} from "./repository";
import type { PartialRefundProviderExecutionRecord } from "./types";
import { canTransitionPartialRefundProviderExecution } from "./stateMachine";
import { normalizeCurrency } from "./validate";

export class ServiceRolePartialRefundProviderExecutionRepository
  implements PartialRefundProviderExecutionRepository
{
  constructor(private readonly rpc: PartialRefundProviderExecutionRpcPort) {
    assertNotBrowserProviderMoney();
    if (!rpc) {
      throw new Error("service_role_required");
    }
  }

  async claim(
    input: ClaimPartialRefundProviderExecutionInput
  ): Promise<
    | { ok: true; execution: PartialRefundProviderExecutionRecord; replayed: boolean }
    | { ok: false; code: string; message: string }
  > {
    if (input.ledgerStatus !== "committed") {
      return {
        ok: false,
        code: "invalid_state",
        message: "Ledger must be committed before provider execution.",
      };
    }
    const currency = normalizeCurrency(input.currency);
    const ledgerCurrency = normalizeCurrency(input.ledgerCurrency);
    if (!currency || !ledgerCurrency || currency !== ledgerCurrency) {
      return { ok: false, code: "currency_mismatch", message: "Currency mismatch." };
    }
    if (
      !Number.isInteger(input.trustedAmountMinor) ||
      input.trustedAmountMinor <= 0 ||
      input.trustedAmountMinor !== input.ledgerRefundAmountMinor
    ) {
      return {
        ok: false,
        code: "amount_mismatch",
        message: "Amount must match committed ledger refund amount.",
      };
    }

    try {
      const raw = await this.rpc.claim({
        p_store_id: input.storeId,
        p_ledger_id: input.ledgerId,
        p_order_id: input.orderId,
        p_payment_attempt_id: input.paymentAttemptId,
        p_capture_event_id: input.captureEventId,
        p_provider_kind: input.providerKind,
        p_provider_payment_ref: input.providerPaymentRef,
        p_trusted_amount_minor: input.trustedAmountMinor,
        p_currency: currency,
        p_idempotency_key: input.idempotencyKey,
        p_operator_user_id: input.operatorUserId ?? null,
        p_operator_reason_safe: input.operatorReasonSafe ?? null,
      });
      const parsed = parseClaimEnvelope(raw);
      if (!parsed.ok) {
        return {
          ok: false,
          code: parsed.code,
          message: parsed.message,
        };
      }
      return {
        ok: true,
        execution: parsed.execution,
        replayed: parsed.replayed,
      };
    } catch (e) {
      const mapped = mapProviderExecutionRpcError(
        e instanceof Error ? e.message : "Claim RPC failed."
      );
      return { ok: false, code: mapped.code, message: mapped.message };
    }
  }

  async update(
    input: UpdatePartialRefundProviderExecutionInput
  ): Promise<
    | { ok: true; execution: PartialRefundProviderExecutionRecord }
    | { ok: false; code: string; message: string }
  > {
    // Client-side guard; SQL also enforces.
    if (
      input.fromStatus != null &&
      !canTransitionPartialRefundProviderExecution(
        input.fromStatus,
        input.toStatus
      )
    ) {
      return {
        ok: false,
        code: "unsupported_transition",
        message: `Illegal transition ${input.fromStatus} → ${input.toStatus}.`,
      };
    }
    if (input.fromStatus === "succeeded" && input.toStatus !== "succeeded") {
      return {
        ok: false,
        code: "unsupported_transition",
        message: "Terminal succeeded execution cannot be downgraded.",
      };
    }

    try {
      const raw = await this.rpc.update({
        p_execution_id: input.executionId,
        p_to_status: input.toStatus,
        p_provider_refund_id: input.providerRefundId ?? null,
        p_provider_status_safe: input.providerStatusSafe ?? null,
        p_failure_code: input.failureCode ?? null,
        p_failure_message_safe: input.failureMessageSafe ?? null,
        p_provider_payment_ref: input.providerPaymentRef ?? null,
        p_touch_lookup: Boolean(input.touchLookup),
      });
      const parsed = parseUpdateEnvelope(raw);
      if (!parsed.ok) {
        return { ok: false, code: parsed.code, message: parsed.message };
      }
      return { ok: true, execution: parsed.execution };
    } catch (e) {
      const mapped = mapProviderExecutionRpcError(
        e instanceof Error ? e.message : "Update RPC failed."
      );
      return { ok: false, code: mapped.code, message: mapped.message };
    }
  }

  async getByLedger(
    ledgerId: string
  ): Promise<PartialRefundProviderExecutionRecord | null> {
    try {
      const raw = await this.rpc.getByLedger(ledgerId);
      const parsed = parseGetEnvelope(raw);
      if (!parsed.ok) return null;
      return parsed.execution;
    } catch {
      return null;
    }
  }

  async getByIdempotency(
    storeId: string,
    idempotencyKey: string
  ): Promise<PartialRefundProviderExecutionRecord | null> {
    try {
      const raw = await this.rpc.getByIdempotency(storeId, idempotencyKey);
      const parsed = parseGetEnvelope(raw);
      if (!parsed.ok) return null;
      return parsed.execution;
    } catch {
      return null;
    }
  }

  async getById(
    executionId: string
  ): Promise<PartialRefundProviderExecutionRecord | null> {
    try {
      const raw = await this.rpc.getById(executionId);
      const parsed = parseGetEnvelope(raw);
      if (!parsed.ok) return null;
      return parsed.execution;
    } catch {
      return null;
    }
  }

  async list(input?: {
    storeId?: string | null;
    status?: string | null;
    limit?: number;
  }): Promise<
    | { ok: true; executions: PartialRefundProviderExecutionRecord[] }
    | { ok: false; code: string; message: string }
  > {
    try {
      const raw = await this.rpc.list({
        storeId: input?.storeId ?? null,
        status: input?.status ?? null,
        limit: input?.limit ?? 50,
      });
      const parsed = parseListEnvelope(raw);
      if (!parsed.ok) {
        return { ok: false, code: parsed.code, message: parsed.message };
      }
      return { ok: true, executions: parsed.executions };
    } catch (e) {
      const mapped = mapProviderExecutionRpcError(
        e instanceof Error ? e.message : "List RPC failed."
      );
      return { ok: false, code: mapped.code, message: mapped.message };
    }
  }
}
