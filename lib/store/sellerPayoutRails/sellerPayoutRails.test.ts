import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PAYOUT_FAILURE_CONTRACTS,
  PAYOUT_METHOD_CONTRACTS,
  PAYOUT_PROVIDER_CONTRACTS,
  assertNoLivePayoutTransfer,
  buildAdminPayoutRailsDiagnostics,
  buildSellerPayoutRailsReadModel,
  resetSellerPayoutRails,
  sellerPayoutRailsEngine,
} from "./index";

const ROOT = join(__dirname, "../../..");
const STORE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SELLER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

afterEach(() => {
  resetSellerPayoutRails();
});

describe("Commerce Seller Payout Rails V1", () => {
  it("exposes provider / method / failure contracts without live transfer", () => {
    expect(PAYOUT_PROVIDER_CONTRACTS.length).toBeGreaterThan(0);
    expect(
      PAYOUT_PROVIDER_CONTRACTS.every((p) => p.supportsLiveTransfer === false)
    ).toBe(true);
    expect(PAYOUT_METHOD_CONTRACTS.every((m) => m.mockOnly && !m.liveTransferEnabled)).toBe(
      true
    );
    expect(PAYOUT_FAILURE_CONTRACTS.bank_rails_disabled.retryable).toBe(false);
    expect(() => assertNoLivePayoutTransfer("mock_clearing")).not.toThrow();
    expect(() => assertNoLivePayoutTransfer("stripe_connect")).toThrow();
  });

  it("evaluates eligibility with bank rails disabled", () => {
    sellerPayoutRailsEngine.setBalance({
      storeId: STORE,
      currency: "USD",
      availableMinor: 5000,
      blockedMinor: 1000,
      pendingMinor: 250,
    });
    const account = sellerPayoutRailsEngine.registerAccount({
      storeId: STORE,
      sellerUserId: SELLER,
      providerId: "mock_clearing",
      methodKind: "mock_wallet",
      verificationState: "verified",
      displayLabel: "Mock ••1234",
      currency: "USD",
    });
    const elig = sellerPayoutRailsEngine.evaluateEligibility({
      storeId: STORE,
      currency: "USD",
      accountId: account.accountId,
    });
    expect(elig.bankRailsEnabled).toBe(false);
    expect(elig.eligible).toBe(true);
    expect(elig.availableMinor).toBe(5000);
    expect(elig.blockedMinor).toBe(1000);
    expect(elig.reasons).toContain("bank_rails_disabled");

    const unverified = sellerPayoutRailsEngine.evaluateEligibility({
      storeId: STORE,
      currency: "USD",
      accountId: sellerPayoutRailsEngine.registerAccount({
        storeId: STORE,
        sellerUserId: SELLER,
        providerId: "mock_clearing",
        methodKind: "mock_wallet",
        verificationState: "unverified",
        displayLabel: "Mock unverified",
        currency: "USD",
      }).accountId,
    });
    expect(unverified.eligible).toBe(false);
    expect(unverified.reasons).toContain("account_unverified");
  });

  it("creates payout request with idempotency", () => {
    sellerPayoutRailsEngine.setBalance({
      storeId: STORE,
      currency: "USD",
      availableMinor: 10_000,
    });
    const account = sellerPayoutRailsEngine.registerAccount({
      storeId: STORE,
      sellerUserId: SELLER,
      providerId: "mock_clearing",
      methodKind: "mock_wallet",
      verificationState: "verified",
      displayLabel: "Mock ••99",
      currency: "USD",
    });
    const first = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: account.accountId,
      amountMinor: 2500,
      currency: "USD",
      idempotencyKey: "payout-req-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: account.accountId,
      amountMinor: 2500,
      currency: "USD",
      idempotencyKey: "payout-req-1",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.request.requestId).toBe(first.request.requestId);
  });

  it("batches and mock-executes payouts without moving funds", () => {
    sellerPayoutRailsEngine.setBalance({
      storeId: STORE,
      currency: "USD",
      availableMinor: 20_000,
    });
    const account = sellerPayoutRailsEngine.registerAccount({
      storeId: STORE,
      sellerUserId: SELLER,
      providerId: "mock_clearing",
      methodKind: "mock_wallet",
      verificationState: "verified",
      displayLabel: "Mock ••42",
      currency: "USD",
    });
    const created = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: account.accountId,
      amountMinor: 3000,
      currency: "USD",
      idempotencyKey: "payout-req-batch",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const approved = sellerPayoutRailsEngine.approvePayoutRequest({
      requestId: created.request.requestId,
      approvedBy: "admin-1",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const batch = sellerPayoutRailsEngine.createPayoutBatch({
      providerId: "mock_clearing",
      currency: "USD",
      requestIds: [approved.request.requestId],
    });
    expect(batch.ok).toBe(true);
    if (!batch.ok) return;
    expect(batch.batch.totalAmountMinor).toBe(3000);

    const exec = sellerPayoutRailsEngine.executePayoutBatchMock({
      batchId: batch.batch.batchId,
    });
    expect(exec.ok).toBe(true);
    if (!exec.ok) return;
    expect(exec.batch.status).toBe("completed");
    expect(exec.executions[0]?.status).toBe("mock_succeeded");
    expect(exec.executions[0]?.note).toMatch(/No funds moved/i);
    expect(exec.executions[0]?.mockProviderReference).toMatch(/^mock_/);

    const failed = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: account.accountId,
      amountMinor: 1000,
      currency: "USD",
      idempotencyKey: "payout-req-fail",
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    sellerPayoutRailsEngine.approvePayoutRequest({
      requestId: failed.request.requestId,
      approvedBy: "admin-1",
    });
    const batch2 = sellerPayoutRailsEngine.createPayoutBatch({
      providerId: "mock_clearing",
      currency: "USD",
      requestIds: [failed.request.requestId],
    });
    expect(batch2.ok).toBe(true);
    if (!batch2.ok) return;
    const execFail = sellerPayoutRailsEngine.executePayoutBatchMock({
      batchId: batch2.batch.batchId,
      forceFail: true,
    });
    expect(execFail.ok).toBe(true);
    if (!execFail.ok) return;
    expect(execFail.executions[0]?.status).toBe("mock_failed");
    expect(execFail.executions[0]?.failureCode).toBe("mock_provider_rejected");
  });

  it("builds payout history and seller/admin read models", () => {
    sellerPayoutRailsEngine.setBalance({
      storeId: STORE,
      currency: "USD",
      availableMinor: 8000,
      blockedMinor: 500,
      pendingMinor: 200,
    });
    const account = sellerPayoutRailsEngine.registerAccount({
      storeId: STORE,
      sellerUserId: SELLER,
      providerId: "manual_ops",
      methodKind: "manual_clearing",
      verificationState: "verified",
      displayLabel: "Manual ••77",
      currency: "USD",
    });
    const req = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: account.accountId,
      amountMinor: 1500,
      currency: "usd",
      idempotencyKey: "hist-1",
    });
    expect(req.ok).toBe(true);

    const sellerRm = buildSellerPayoutRailsReadModel({
      storeId: STORE,
      currency: "USD",
      accountId: account.accountId,
    });
    expect(sellerRm.bankRailsEnabled).toBe(false);
    expect(sellerRm.liveTransferEnabled).toBe(false);
    expect(sellerRm.availableBalanceMinor).toBe(8000);
    expect(sellerRm.blockedBalanceMinor).toBe(500);
    expect(sellerRm.pendingPayouts.length).toBeGreaterThan(0);
    expect(sellerRm.history.length).toBeGreaterThan(0);

    const admin = buildAdminPayoutRailsDiagnostics();
    expect(admin.requests.length).toBeGreaterThan(0);
    expect(admin.accounts.length).toBeGreaterThan(0);
    expect(admin.bankRailsEnabled).toBe(false);
  });

  it("rejects over-balance and unverified account requests", () => {
    sellerPayoutRailsEngine.setBalance({
      storeId: STORE,
      currency: "USD",
      availableMinor: 100,
    });
    const unverified = sellerPayoutRailsEngine.registerAccount({
      storeId: STORE,
      sellerUserId: SELLER,
      providerId: "mock_clearing",
      methodKind: "mock_wallet",
      verificationState: "pending_review",
      displayLabel: "Pending",
      currency: "USD",
    });
    const badAccount = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: unverified.accountId,
      amountMinor: 50,
      currency: "USD",
      idempotencyKey: "bad-account",
    });
    expect(badAccount.ok).toBe(false);
    if (!badAccount.ok) expect(badAccount.code).toBe("account_unverified");

    const verified = sellerPayoutRailsEngine.registerAccount({
      storeId: STORE,
      sellerUserId: SELLER,
      providerId: "mock_clearing",
      methodKind: "mock_wallet",
      verificationState: "verified",
      displayLabel: "OK",
      currency: "USD",
    });
    const over = sellerPayoutRailsEngine.createPayoutRequest({
      storeId: STORE,
      sellerUserId: SELLER,
      accountId: verified.accountId,
      amountMinor: 500,
      currency: "USD",
      idempotencyKey: "over",
    });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe("ineligible_balance");
  });

  it("architecture guard: no connect/bank/network modules", () => {
    const engine = readFileSync(
      join(ROOT, "lib/store/sellerPayoutRails/engine.ts"),
      "utf8"
    );
    expect(engine).not.toMatch(/stripe\.com|wise\.com|paypal|fetch\(/i);
    expect(engine).toMatch(/No funds moved/);
    expect(
      existsSync(join(ROOT, "app/admin/store/payouts/page.tsx"))
    ).toBe(true);
    const page = readFileSync(
      join(ROOT, "app/admin/store/payouts/page.tsx"),
      "utf8"
    );
    // Mock rails diagnostics remain secondary; live Connect/Wise/PayPal stay blocked.
    expect(page).toMatch(/bankRailsEnabled/);
    expect(page).toMatch(/data-mock-payout-diagnostics="secondary"/);
    expect(page).toMatch(/"stripe_connect"/);
    expect(page).toMatch(/data-live-payout-provider-blocked=\{id\}/);
    expect(page).toMatch(/remain unavailable|not\s+selectable/i);
    expect(page).not.toMatch(/sk_live_/i);
    expect(page).not.toMatch(/stripe\.com|wise\.com|api\.paypal/i);
  });
});
