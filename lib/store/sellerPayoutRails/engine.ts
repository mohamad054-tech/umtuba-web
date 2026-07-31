import {
  PAYOUT_FAILURE_CONTRACTS,
  assertNoLivePayoutTransfer,
  getPayoutProviderContract,
} from "./providers";
import type {
  PayoutEligibility,
  PayoutFailureCode,
  SellerPayoutAccount,
  SellerPayoutBatch,
  SellerPayoutExecution,
  SellerPayoutHistoryEntry,
  SellerPayoutRequest,
} from "./types";
import { SELLER_PAYOUT_RAILS_VERSION } from "./types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export type RailsBalanceInput = {
  storeId: string;
  currency: string;
  availableMinor: number;
  blockedMinor?: number;
  pendingMinor?: number;
};

export class SellerPayoutRailsEngine {
  private accounts = new Map<string, SellerPayoutAccount>();
  private requests = new Map<string, SellerPayoutRequest>();
  private batches = new Map<string, SellerPayoutBatch>();
  private executions: SellerPayoutExecution[] = [];
  private history: SellerPayoutHistoryEntry[] = [];
  private requestByIdempotency = new Map<string, string>();
  private balances = new Map<string, RailsBalanceInput>();

  reset(): void {
    this.accounts.clear();
    this.requests.clear();
    this.batches.clear();
    this.executions = [];
    this.history = [];
    this.requestByIdempotency.clear();
    this.balances.clear();
  }

  setBalance(input: RailsBalanceInput): void {
    this.balances.set(`${input.storeId}:${input.currency}`, {
      ...input,
      blockedMinor: input.blockedMinor ?? 0,
      pendingMinor: input.pendingMinor ?? 0,
    });
  }

  registerAccount(
    input: Omit<SellerPayoutAccount, "accountId" | "createdAt" | "updatedAt"> & {
      accountId?: string;
    }
  ): SellerPayoutAccount {
    assertNoLivePayoutTransfer(input.providerId);
    const provider = getPayoutProviderContract(input.providerId);
    if (!provider?.enabled) {
      throw new Error(PAYOUT_FAILURE_CONTRACTS.provider_disabled.userSafeMessage);
    }
    const ts = nowIso();
    const account: SellerPayoutAccount = {
      accountId: input.accountId ?? newId("spa"),
      storeId: input.storeId,
      sellerUserId: input.sellerUserId,
      providerId: input.providerId,
      methodKind: input.methodKind,
      verificationState: input.verificationState,
      displayLabel: input.displayLabel,
      currency: input.currency.toUpperCase(),
      createdAt: ts,
      updatedAt: ts,
    };
    this.accounts.set(account.accountId, account);
    return account;
  }

  getAccount(accountId: string): SellerPayoutAccount | null {
    return this.accounts.get(accountId) ?? null;
  }

  listAccounts(storeId?: string): SellerPayoutAccount[] {
    const all = [...this.accounts.values()];
    return storeId ? all.filter((a) => a.storeId === storeId) : all;
  }

  evaluateEligibility(input: {
    storeId: string;
    currency: string;
    accountId?: string | null;
  }): PayoutEligibility {
    const currency = input.currency.toUpperCase();
    const bal = this.balances.get(`${input.storeId}:${currency}`);
    const availableMinor = bal?.availableMinor ?? 0;
    const blockedMinor = bal?.blockedMinor ?? 0;
    const pendingMinor = bal?.pendingMinor ?? 0;
    const account = input.accountId
      ? this.accounts.get(input.accountId) ?? null
      : this.listAccounts(input.storeId).find((a) => a.currency === currency) ??
        null;

    const reasons: string[] = ["bank_rails_disabled"];

    if (availableMinor <= 0) reasons.push("ineligible_balance");
    if (!account || account.verificationState !== "verified") {
      reasons.push("account_unverified");
    } else if (account.currency !== currency) {
      reasons.push("currency_mismatch");
    }

    // Mock request path may proceed when balance + verified account are ready.
    // Live bank rails remain disabled regardless.
    const mockEligible =
      availableMinor > 0 &&
      Boolean(account) &&
      account?.verificationState === "verified" &&
      account?.currency === currency;

    return {
      storeId: input.storeId,
      currency,
      availableMinor,
      blockedMinor,
      pendingMinor,
      eligible: mockEligible,
      bankRailsEnabled: false,
      reasons,
      accountId: account?.accountId ?? null,
      accountVerificationState: account?.verificationState ?? null,
    };
  }

  createPayoutRequest(input: {
    storeId: string;
    sellerUserId: string;
    accountId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }):
    | { ok: true; request: SellerPayoutRequest; replayed: boolean }
    | { ok: false; code: PayoutFailureCode; message: string } {
    const existingId = this.requestByIdempotency.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.requests.get(existingId);
      if (existing) {
        return { ok: true, request: existing, replayed: true };
      }
    }

    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      return {
        ok: false,
        code: "invalid_amount",
        message: PAYOUT_FAILURE_CONTRACTS.invalid_amount.userSafeMessage,
      };
    }

    const account = this.accounts.get(input.accountId);
    if (!account || account.storeId !== input.storeId) {
      return {
        ok: false,
        code: "account_unverified",
        message: PAYOUT_FAILURE_CONTRACTS.account_unverified.userSafeMessage,
      };
    }
    if (account.verificationState !== "verified") {
      return {
        ok: false,
        code: "account_unverified",
        message: PAYOUT_FAILURE_CONTRACTS.account_unverified.userSafeMessage,
      };
    }

    const currency = input.currency.toUpperCase();
    if (account.currency !== currency) {
      return {
        ok: false,
        code: "currency_mismatch",
        message: PAYOUT_FAILURE_CONTRACTS.currency_mismatch.userSafeMessage,
      };
    }

    const eligibility = this.evaluateEligibility({
      storeId: input.storeId,
      currency,
      accountId: account.accountId,
    });
    if (!eligibility.eligible || eligibility.availableMinor < input.amountMinor) {
      return {
        ok: false,
        code: "ineligible_balance",
        message: PAYOUT_FAILURE_CONTRACTS.ineligible_balance.userSafeMessage,
      };
    }

    assertNoLivePayoutTransfer(account.providerId);

    const ts = nowIso();
    const request: SellerPayoutRequest = {
      requestId: newId("spr"),
      storeId: input.storeId,
      sellerUserId: input.sellerUserId,
      accountId: account.accountId,
      currency,
      amountMinor: input.amountMinor,
      status: "submitted",
      batchId: null,
      failureCode: null,
      idempotencyKey: input.idempotencyKey,
      createdAt: ts,
      updatedAt: ts,
      approvedAt: null,
      approvedBy: null,
    };
    this.requests.set(request.requestId, request);
    this.requestByIdempotency.set(input.idempotencyKey, request.requestId);
    this.pushHistory({
      storeId: request.storeId,
      requestId: request.requestId,
      batchId: null,
      executionId: null,
      currency: request.currency,
      amountMinor: request.amountMinor,
      status: request.status,
      summary: "Payout request submitted (rails mock).",
    });
    return { ok: true, request, replayed: false };
  }

  approvePayoutRequest(input: {
    requestId: string;
    approvedBy: string;
  }):
    | { ok: true; request: SellerPayoutRequest }
    | { ok: false; code: PayoutFailureCode; message: string } {
    const request = this.requests.get(input.requestId);
    if (!request) {
      return {
        ok: false,
        code: "invalid_amount",
        message: "Unknown payout request.",
      };
    }
    if (request.status !== "submitted") {
      return {
        ok: false,
        code: "duplicate_request",
        message: "Request is not awaiting approval.",
      };
    }
    const ts = nowIso();
    const next: SellerPayoutRequest = {
      ...request,
      status: "approved",
      approvedAt: ts,
      approvedBy: input.approvedBy,
      updatedAt: ts,
    };
    this.requests.set(next.requestId, next);
    this.pushHistory({
      storeId: next.storeId,
      requestId: next.requestId,
      batchId: null,
      executionId: null,
      currency: next.currency,
      amountMinor: next.amountMinor,
      status: next.status,
      summary: "Payout request approved (no live transfer).",
    });
    return { ok: true, request: next };
  }

  createPayoutBatch(input: {
    providerId: SellerPayoutBatch["providerId"];
    currency: string;
    requestIds: string[];
  }):
    | { ok: true; batch: SellerPayoutBatch }
    | { ok: false; code: PayoutFailureCode; message: string } {
    assertNoLivePayoutTransfer(input.providerId);
    const currency = input.currency.toUpperCase();
    const selected: SellerPayoutRequest[] = [];
    for (const id of input.requestIds) {
      const req = this.requests.get(id);
      if (!req || req.status !== "approved" || req.currency !== currency) {
        return {
          ok: false,
          code: "invalid_amount",
          message: "Batch requires approved same-currency requests.",
        };
      }
      if (req.batchId) {
        return {
          ok: false,
          code: "batch_locked",
          message: PAYOUT_FAILURE_CONTRACTS.batch_locked.userSafeMessage,
        };
      }
      selected.push(req);
    }
    if (selected.length === 0) {
      return {
        ok: false,
        code: "invalid_amount",
        message: "Batch requires at least one request.",
      };
    }

    const ts = nowIso();
    const batch: SellerPayoutBatch = {
      batchId: newId("spb"),
      providerId: input.providerId,
      currency,
      status: "open",
      requestIds: selected.map((r) => r.requestId),
      totalAmountMinor: selected.reduce((sum, r) => sum + r.amountMinor, 0),
      createdAt: ts,
      updatedAt: ts,
      lockedAt: null,
    };
    this.batches.set(batch.batchId, batch);
    for (const req of selected) {
      const next: SellerPayoutRequest = {
        ...req,
        status: "batched",
        batchId: batch.batchId,
        updatedAt: ts,
      };
      this.requests.set(next.requestId, next);
    }
    return { ok: true, batch };
  }

  /**
   * Mock execution only — never calls external networks or bank APIs.
   */
  executePayoutBatchMock(input: {
    batchId: string;
    forceFail?: boolean;
  }):
    | {
        ok: true;
        batch: SellerPayoutBatch;
        executions: SellerPayoutExecution[];
      }
    | { ok: false; code: PayoutFailureCode; message: string } {
    const batch = this.batches.get(input.batchId);
    if (!batch) {
      return {
        ok: false,
        code: "invalid_amount",
        message: "Unknown payout batch.",
      };
    }
    if (batch.status === "completed" || batch.status === "executing") {
      return {
        ok: false,
        code: "batch_locked",
        message: PAYOUT_FAILURE_CONTRACTS.batch_locked.userSafeMessage,
      };
    }

    assertNoLivePayoutTransfer(batch.providerId);
    const ts = nowIso();
    const locked: SellerPayoutBatch = {
      ...batch,
      status: "executing",
      lockedAt: ts,
      updatedAt: ts,
    };
    this.batches.set(locked.batchId, locked);

    const executions: SellerPayoutExecution[] = [];
    let anyFail = false;

    for (const requestId of locked.requestIds) {
      const req = this.requests.get(requestId);
      if (!req) continue;
      const fail = Boolean(input.forceFail);
      const execution: SellerPayoutExecution = {
        executionId: newId("spe"),
        batchId: locked.batchId,
        requestId,
        providerId: locked.providerId,
        status: fail ? "mock_failed" : "mock_succeeded",
        mockProviderReference: `mock_${locked.providerId}_${requestId}`,
        failureCode: fail ? "mock_provider_rejected" : null,
        executedAt: ts,
        note: fail
          ? "Mock provider rejected execution. No funds moved."
          : "Mock execution recorded. No funds moved. Bank rails remain disabled.",
      };
      executions.push(execution);
      this.executions.push(execution);

      const nextReq: SellerPayoutRequest = {
        ...req,
        status: fail ? "failed" : "completed",
        failureCode: fail ? "mock_provider_rejected" : null,
        updatedAt: ts,
      };
      this.requests.set(nextReq.requestId, nextReq);
      if (fail) anyFail = true;

      this.pushHistory({
        storeId: nextReq.storeId,
        requestId: nextReq.requestId,
        batchId: locked.batchId,
        executionId: execution.executionId,
        currency: nextReq.currency,
        amountMinor: nextReq.amountMinor,
        status: execution.status,
        summary: execution.note,
      });
    }

    const finished: SellerPayoutBatch = {
      ...locked,
      status: anyFail ? "failed" : "completed",
      updatedAt: nowIso(),
    };
    this.batches.set(finished.batchId, finished);
    return { ok: true, batch: finished, executions };
  }

  listRequests(storeId?: string): SellerPayoutRequest[] {
    const all = [...this.requests.values()];
    return storeId ? all.filter((r) => r.storeId === storeId) : all;
  }

  listBatches(): SellerPayoutBatch[] {
    return [...this.batches.values()];
  }

  listExecutions(): SellerPayoutExecution[] {
    return [...this.executions];
  }

  listHistory(storeId?: string, limit = 50): SellerPayoutHistoryEntry[] {
    const rows = storeId
      ? this.history.filter((h) => h.storeId === storeId)
      : this.history;
    return rows.slice(-limit);
  }

  private pushHistory(
    input: Omit<SellerPayoutHistoryEntry, "historyId" | "occurredAt">
  ): void {
    this.history.push({
      historyId: newId("sph"),
      occurredAt: nowIso(),
      ...input,
    });
  }
}

export const sellerPayoutRailsEngine = new SellerPayoutRailsEngine();

export function resetSellerPayoutRails(): void {
  sellerPayoutRailsEngine.reset();
}

export function getSellerPayoutRailsVersion(): string {
  return SELLER_PAYOUT_RAILS_VERSION;
}
