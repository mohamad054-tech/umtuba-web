/**
 * Admin committed-compensation action + UI contract tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ROOT = join(__dirname, "../../..");
const ACTION = "app/actions/storePartialRefundCommittedCompensation.ts";
const PANEL =
  "app/admin/store/refunds/PartialRefundAccountingReviewPanel.tsx";
const PAGE = "app/admin/store/refunds/page.tsx";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  storeB: "aaaaaaaa-1111-4111-8111-111111111111",
  ledger: "66666666-6666-4666-8666-666666666666",
};

const REASON =
  "Admin accounting compensation restoring committed reservation ceilings.";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const redirectMock = vi.fn((url: string) => {
  const err = new Error(`REDIRECT:${url}`);
  (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;${url}`;
  throw err;
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("../../supabase/server", () => ({
  getServerUser: vi.fn(),
  createClient: vi.fn(async () => ({})),
}));

vi.mock("../adminAuth", () => ({
  ADMIN_STORE_UNAUTHORIZED: "admin_store_unauthorized",
  assertPlatformAdminDb: vi.fn(),
}));

vi.mock("../partialRefundReservation", () => ({
  createPartialRefundReservationServiceRole: vi.fn(),
}));

vi.mock("./index", async () => {
  const actual = await vi.importActual<typeof import("./index")>("./index");
  return {
    ...actual,
    compensateCommittedPartialRefundReservation: vi.fn(),
  };
});

import { getServerUser } from "../../supabase/server";
import { assertPlatformAdminDb } from "../adminAuth";
import { createPartialRefundReservationServiceRole } from "../partialRefundReservation";
import {
  compensateCommittedPartialRefundReservation,
  sanitizeCompensationOperatorReason,
} from "./index";
import { adminCompensateCommittedPartialRefundReservationAction } from "../../../app/actions/storePartialRefundCommittedCompensation";

function form(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
}

function redirectUrl(e: unknown): string {
  expect(e).toBeInstanceOf(Error);
  const msg = (e as Error).message;
  expect(msg.startsWith("REDIRECT:")).toBe(true);
  return msg.slice("REDIRECT:".length);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin committed compensation action source contracts", () => {
  it("is admin-only and maps to Phase 2 compensation service", () => {
    const src = read(ACTION);
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/assertPlatformAdminDb/);
    expect(src).toMatch(/adminCompensateCommittedPartialRefundReservationAction/);
    expect(src).toMatch(/compensateCommittedPartialRefundReservation/);
    expect(src).toMatch(/sanitizeCompensationOperatorReason/);
    expect(src).toMatch(/createPartialRefundReservationServiceRole/);
    expect(src).toMatch(/ACCOUNTING|accounting ceilings|Accounting-only/i);
    expect(src).not.toMatch(/sellerCompensate|buyerCompensate/);
    expect(src).not.toMatch(/applyFullOrderRefund|from ["']stripe["']|@stripe\//i);
    expect(src).not.toMatch(/restockInventory|performRestock|apply_store_payment_outcome/);
    expect(src).not.toMatch(/enableCommerceConfirm|commerce_confirm/);
    expect(src).not.toMatch(/from ["'].*settlement|from ["'].*commission|from ["'].*payout/i);
  });

  it("does not invent a parallel auth model", () => {
    const src = read(ACTION);
    expect(src).toMatch(/from ["'].*adminAuth["']/);
    expect(src).toMatch(/getServerUser/);
    expect(src).not.toMatch(/isSuperUser|hardcodedAdmin|ADMIN_BYPASS/);
  });
});

describe("adminCompensateCommittedPartialRefundReservationAction", () => {
  it("denies non-admin (authz)", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(false);
    let caught: unknown;
    try {
      await adminCompensateCommittedPartialRefundReservationAction(
        form({
          ledgerId: IDS.ledger,
          operatorReason: REASON,
          returnTo: "/admin/store/refunds",
        })
      );
    } catch (e) {
      caught = e;
    }
    const url = redirectUrl(caught);
    expect(url).toMatch(/error=admin_store_unauthorized/);
    expect(compensateCommittedPartialRefundReservation).not.toHaveBeenCalled();
  });

  it("maps success compensation to prComp flash params", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    vi.mocked(createPartialRefundReservationServiceRole).mockReturnValue({
      ok: true,
      supabase: {} as never,
      repository: {} as never,
    });
    vi.mocked(compensateCommittedPartialRefundReservation).mockResolvedValue({
      ok: true,
      status: "compensated",
      capability: "commerce.payments.partial_refund_committed_reservation_compensation_v1",
      version: "commerce-partial-refund-committed-reservation-compensation-v1",
      ownership: {} as never,
      compensationPerformed: true,
      restoredRefundAmountMinor: 500,
      commit: {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.store,
        captureEventId: IDS.store,
        status: "compensated",
        refundAmountMinor: 500,
        compensationReasonSafe: REASON,
        compensatedAtIso: "2026-08-07T00:00:00.000Z",
        accountingVersion: 1,
        updatedAtIso: "2026-08-07T00:00:00.000Z",
      },
      providerRefundExecuted: false,
      moneyMoved: false,
      stockRestocked: false,
      entitlementAdjusted: false,
      settlementUnwound: false,
      commissionUnwound: false,
      payoutMutated: false,
      commerceConfirmActivated: false,
      committedReservationCancelled: false,
    });

    let caught: unknown;
    try {
      await adminCompensateCommittedPartialRefundReservationAction(
        form({
          ledgerId: IDS.ledger,
          expectedStoreId: IDS.store,
          operatorReason: REASON,
          returnTo: "/admin/store/refunds",
        })
      );
    } catch (e) {
      caught = e;
    }
    const url = redirectUrl(caught);
    expect(url).toMatch(/prCompOk=1/);
    expect(url).toMatch(/prCompStatus=compensated/);
    expect(url).toMatch(new RegExp(`prCompLedgerId=${IDS.ledger}`));
    expect(url).toMatch(/prCompRestored=500/);
    expect(compensateCommittedPartialRefundReservation).toHaveBeenCalledWith(
      { repository: {} },
      expect.objectContaining({
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorReason: REASON,
      })
    );
  });

  it("maps already_compensated idempotent success", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    vi.mocked(createPartialRefundReservationServiceRole).mockReturnValue({
      ok: true,
      supabase: {} as never,
      repository: {} as never,
    });
    vi.mocked(compensateCommittedPartialRefundReservation).mockResolvedValue({
      ok: true,
      status: "already_compensated",
      capability: "commerce.payments.partial_refund_committed_reservation_compensation_v1",
      version: "commerce-partial-refund-committed-reservation-compensation-v1",
      ownership: {} as never,
      compensationPerformed: false,
      restoredRefundAmountMinor: 0,
      commit: {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.store,
        captureEventId: IDS.store,
        status: "compensated",
        refundAmountMinor: 500,
        compensationReasonSafe: REASON,
        compensatedAtIso: "2026-08-07T00:00:00.000Z",
        accountingVersion: 1,
        updatedAtIso: "2026-08-07T00:00:00.000Z",
      },
      providerRefundExecuted: false,
      moneyMoved: false,
      stockRestocked: false,
      entitlementAdjusted: false,
      settlementUnwound: false,
      commissionUnwound: false,
      payoutMutated: false,
      commerceConfirmActivated: false,
      committedReservationCancelled: false,
    });

    let caught: unknown;
    try {
      await adminCompensateCommittedPartialRefundReservationAction(
        form({
          ledgerId: IDS.ledger,
          operatorReason: REASON,
          returnTo: "/admin/store/refunds",
        })
      );
    } catch (e) {
      caught = e;
    }
    const url = redirectUrl(caught);
    expect(url).toMatch(/prCompOk=1/);
    expect(url).toMatch(/prCompStatus=already_compensated/);
  });

  it("validates operator reason before service call", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    let caught: unknown;
    try {
      await adminCompensateCommittedPartialRefundReservationAction(
        form({
          ledgerId: IDS.ledger,
          operatorReason: "x",
          returnTo: "/admin/store/refunds",
        })
      );
    } catch (e) {
      caught = e;
    }
    const url = redirectUrl(caught);
    expect(url).toMatch(/prCompStatus=validation_failed/);
    expect(url).toMatch(/prCompError=/);
    expect(compensateCommittedPartialRefundReservation).not.toHaveBeenCalled();
    expect(sanitizeCompensationOperatorReason("x").ok).toBe(false);
  });

  it("maps service failure statuses to flash errors", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    vi.mocked(createPartialRefundReservationServiceRole).mockReturnValue({
      ok: true,
      supabase: {} as never,
      repository: {} as never,
    });
    vi.mocked(compensateCommittedPartialRefundReservation).mockResolvedValue({
      ok: false,
      status: "invalid_state",
      capability: "commerce.payments.partial_refund_committed_reservation_compensation_v1",
      version: "commerce-partial-refund-committed-reservation-compensation-v1",
      ownership: {} as never,
      message: "Only committed can be compensated.",
      compensationPerformed: false,
      providerRefundExecuted: false,
      moneyMoved: false,
      stockRestocked: false,
      entitlementAdjusted: false,
      settlementUnwound: false,
      commissionUnwound: false,
      payoutMutated: false,
      commerceConfirmActivated: false,
      committedReservationCancelled: false,
    });

    let caught: unknown;
    try {
      await adminCompensateCommittedPartialRefundReservationAction(
        form({
          ledgerId: IDS.ledger,
          expectedStoreId: IDS.storeB,
          operatorReason: REASON,
          returnTo: "/admin/store/refunds",
        })
      );
    } catch (e) {
      caught = e;
    }
    const url = redirectUrl(caught);
    expect(url).toMatch(/prCompStatus=invalid_state/);
    expect(url).toMatch(/prCompError=/);
    expect(url).not.toMatch(/prCompOk=1/);
  });

  it("maps unauthorized ownership mismatch", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    vi.mocked(createPartialRefundReservationServiceRole).mockReturnValue({
      ok: true,
      supabase: {} as never,
      repository: {} as never,
    });
    vi.mocked(compensateCommittedPartialRefundReservation).mockResolvedValue({
      ok: false,
      status: "unauthorized",
      capability: "commerce.payments.partial_refund_committed_reservation_compensation_v1",
      version: "commerce-partial-refund-committed-reservation-compensation-v1",
      ownership: {} as never,
      message: "Ledger commit does not belong to the requested store.",
      compensationPerformed: false,
      providerRefundExecuted: false,
      moneyMoved: false,
      stockRestocked: false,
      entitlementAdjusted: false,
      settlementUnwound: false,
      commissionUnwound: false,
      payoutMutated: false,
      commerceConfirmActivated: false,
      committedReservationCancelled: false,
    });

    let caught: unknown;
    try {
      await adminCompensateCommittedPartialRefundReservationAction(
        form({
          ledgerId: IDS.ledger,
          expectedStoreId: IDS.storeB,
          operatorReason: REASON,
          returnTo: "/admin/store/refunds",
        })
      );
    } catch (e) {
      caught = e;
    }
    expect(redirectUrl(caught)).toMatch(/prCompStatus=unauthorized/);
  });
});

describe("admin committed compensation UI contracts", () => {
  it("labels ACCOUNTING COMPENSATION ONLY and shows success/error fixtures", () => {
    const src = read(PANEL);
    expect(src).toMatch(/ACCOUNTING COMPENSATION ONLY/);
    expect(src).toMatch(/pr-comp-success/);
    expect(src).toMatch(/pr-comp-error/);
    expect(src).toMatch(/already_compensated/);
    expect(src).toMatch(/adminCompensateCommittedPartialRefundReservationAction/);
    expect(src).toMatch(/data-compensation-eligible/);
    expect(src).toMatch(/Operator reason \(required\)/);
    expect(src).toMatch(/Does not refund the buyer/);
    expect(src).not.toMatch(/Execute Refund|Refund Money|Cancel Refund/);
    expect(src).not.toMatch(/name=["']amount/i);
    expect(src).not.toMatch(/name=["']requestedQuantity/i);
    expect(src).not.toMatch(/stripe|applyFullOrderRefund|commerce_confirm/i);
  });

  it("hides row compensation control when status is not committed", () => {
    const src = read(PANEL);
    expect(src).toMatch(/isCompensationEligible/);
    expect(src).toMatch(/status === ["']committed["']/);
    expect(src).toMatch(/eligible \? \(/);
    expect(src).toMatch(/Not eligible for compensation/);
  });

  it("page wires compensation flash params into accounting review", () => {
    const page = read(PAGE);
    expect(page).toMatch(/prCompOk/);
    expect(page).toMatch(/prCompStatus/);
    expect(page).toMatch(/prCompError/);
    expect(page).toMatch(/flashOk=\{prCompOk\}/);
    expect(page).toMatch(/PartialRefundAccountingReviewPanel/);
    expect(page).toMatch(/assertPlatformAdminDb/);
  });

  it("ownership forbids money/provider/downstream domains at UI+action", () => {
    const combined = read(ACTION) + "\n" + read(PANEL);
    expect(combined).not.toMatch(/ownsPartialRefundMoneyMovement:\s*true/);
    expect(combined).not.toMatch(/providerRefundExecuted:\s*true/);
    expect(combined).not.toMatch(/from ["']stripe["']|@stripe\//);
    expect(combined).not.toMatch(/apply_store_payment_outcome|applyFullOrderRefund/);
    expect(combined).not.toMatch(/restockInventory|performRestock/);
    expect(combined).not.toMatch(/enableCommerceConfirm|commerce_confirm/);
  });
});
