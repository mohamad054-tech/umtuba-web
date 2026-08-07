/**
 * In-memory execution repository for unit tests (no network / no SQL).
 */

import { canTransitionPartialRefundProviderExecution } from "./stateMachine";
import type {
  ClaimPartialRefundProviderExecutionInput,
  PartialRefundProviderExecutionRepository,
  UpdatePartialRefundProviderExecutionInput,
} from "./repository";
import type { PartialRefundProviderExecutionRecord } from "./types";
import { normalizeCurrency } from "./validate";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export function createMemoryPartialRefundProviderExecutionRepository(): PartialRefundProviderExecutionRepository {
  const byId = new Map<string, PartialRefundProviderExecutionRecord>();

  function list(): PartialRefundProviderExecutionRecord[] {
    return [...byId.values()];
  }

  return {
    async claim(input: ClaimPartialRefundProviderExecutionInput) {
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
        return {
          ok: false,
          code: "currency_mismatch",
          message: "Currency mismatch.",
        };
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

      const byKey = list().find(
        (e) =>
          e.storeId === input.storeId &&
          e.idempotencyKey === input.idempotencyKey
      );
      if (byKey) {
        if (
          byKey.ledgerId !== input.ledgerId ||
          byKey.trustedAmountMinor !== input.trustedAmountMinor ||
          byKey.currency !== currency
        ) {
          return {
            ok: false,
            code: "duplicate_idempotency_key",
            message: "Idempotency key reuse with different payload.",
          };
        }
        return { ok: true, execution: byKey, replayed: true };
      }

      const open = list().find(
        (e) =>
          e.ledgerId === input.ledgerId &&
          (e.status === "planned" ||
            e.status === "executing" ||
            e.status === "uncertain" ||
            e.status === "succeeded")
      );
      if (open) {
        return { ok: true, execution: open, replayed: true };
      }

      const iso = nowIso();
      const row: PartialRefundProviderExecutionRecord = {
        executionId: newId(),
        storeId: input.storeId,
        ledgerId: input.ledgerId,
        orderId: input.orderId,
        paymentAttemptId: input.paymentAttemptId,
        captureEventId: input.captureEventId,
        providerKind: "stripe",
        providerPaymentRef: input.providerPaymentRef,
        trustedAmountMinor: input.trustedAmountMinor,
        currency,
        idempotencyKey: input.idempotencyKey,
        status: "planned",
        providerRefundId: null,
        providerStatusSafe: null,
        failureCode: null,
        failureMessageSafe: null,
        operatorUserId: input.operatorUserId ?? null,
        operatorReasonSafe: input.operatorReasonSafe ?? null,
        startedAtIso: null,
        completedAtIso: null,
        lastLookupAtIso: null,
        createdAtIso: iso,
        updatedAtIso: iso,
      };
      byId.set(row.executionId, row);
      return { ok: true, execution: row, replayed: false };
    },

    async update(input: UpdatePartialRefundProviderExecutionInput) {
      const row = byId.get(input.executionId);
      if (!row) {
        return {
          ok: false,
          code: "unknown_execution",
          message: "Execution not found.",
        };
      }
      if (row.status === "succeeded" && input.toStatus !== "succeeded") {
        return {
          ok: false,
          code: "unsupported_transition",
          message: "Terminal succeeded execution cannot be downgraded.",
        };
      }
      if (
        !canTransitionPartialRefundProviderExecution(row.status, input.toStatus)
      ) {
        return {
          ok: false,
          code: "unsupported_transition",
          message: `Illegal transition ${row.status} → ${input.toStatus}.`,
        };
      }
      const iso = nowIso();
      const next: PartialRefundProviderExecutionRecord = {
        ...row,
        status: input.toStatus,
        providerRefundId:
          input.providerRefundId !== undefined && input.providerRefundId !== null
            ? input.providerRefundId
            : row.providerRefundId,
        providerStatusSafe:
          input.providerStatusSafe !== undefined &&
          input.providerStatusSafe !== null
            ? input.providerStatusSafe
            : row.providerStatusSafe,
        failureCode:
          input.toStatus === "succeeded"
            ? null
            : input.failureCode !== undefined && input.failureCode !== null
              ? input.failureCode
              : row.failureCode,
        failureMessageSafe:
          input.toStatus === "succeeded"
            ? null
            : input.failureMessageSafe !== undefined &&
                input.failureMessageSafe !== null
              ? input.failureMessageSafe
              : row.failureMessageSafe,
        providerPaymentRef:
          input.providerPaymentRef !== undefined &&
          input.providerPaymentRef !== null
            ? input.providerPaymentRef
            : row.providerPaymentRef,
        startedAtIso:
          input.toStatus === "executing" && !row.startedAtIso
            ? iso
            : row.startedAtIso,
        completedAtIso:
          input.toStatus === "succeeded" || input.toStatus === "failed"
            ? row.completedAtIso ?? iso
            : row.completedAtIso,
        lastLookupAtIso: input.touchLookup ? iso : row.lastLookupAtIso,
        updatedAtIso: iso,
      };
      byId.set(next.executionId, next);
      return { ok: true, execution: next };
    },

    async getByLedger(ledgerId: string) {
      const rows = list()
        .filter((e) => e.ledgerId === ledgerId)
        .sort((a, b) => {
          const rank = (s: string) =>
            s === "succeeded"
              ? 0
              : s === "executing"
                ? 1
                : s === "uncertain"
                  ? 2
                  : s === "planned"
                    ? 3
                    : 4;
          return rank(a.status) - rank(b.status);
        });
      return rows[0] ?? null;
    },

    async getByIdempotency(storeId: string, idempotencyKey: string) {
      return (
        list().find(
          (e) => e.storeId === storeId && e.idempotencyKey === idempotencyKey
        ) ?? null
      );
    },

    async getById(executionId: string) {
      return byId.get(executionId) ?? null;
    },

    async list(input?: {
      storeId?: string | null;
      status?: string | null;
      limit?: number;
    }) {
      let rows = list();
      if (input?.storeId) {
        rows = rows.filter((e) => e.storeId === input.storeId);
      }
      if (input?.status) {
        rows = rows.filter((e) => e.status === input.status);
      }
      rows.sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
      const limit = Math.max(1, Math.min(input?.limit ?? 50, 100));
      return { ok: true as const, executions: rows.slice(0, limit) };
    },
  };
}
