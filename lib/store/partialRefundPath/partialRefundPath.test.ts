/**
 * Focused tests — Commerce Partial Refund Path V1 foundation (calculation only).
 */

import { describe, expect, it } from "vitest";
import {
  assertPartialRefundCommitAllowed,
  calculatePartialRefundPlan,
  partialRefundPathCapabilityOwnership,
  PARTIAL_REFUND_PATH_ID,
  PARTIAL_REFUND_PATH_VERSION,
  rejectClientPartialRefundMoneyFields,
  type CalculatePartialRefundInput,
  type TrustedPartialRefundCaptureFact,
  type TrustedPartialRefundLineFact,
  type TrustedPartialRefundPriorAccounting,
} from "./index";

const STORE = "11111111-1111-4111-8111-111111111111";
const ORDER = "44444444-4444-4444-8444-444444444444";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const LINE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const UNKNOWN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function capture(
  overrides: Partial<TrustedPartialRefundCaptureFact> = {}
): TrustedPartialRefundCaptureFact {
  return {
    storeId: STORE,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    captureAmountMinor: 10000,
    currency: "USD",
    ...overrides,
  };
}

function lineA(
  overrides: Partial<TrustedPartialRefundLineFact> = {}
): TrustedPartialRefundLineFact {
  return {
    orderItemId: LINE_A,
    orderId: ORDER,
    storeId: STORE,
    purchasedQuantity: 4,
    unitPriceMinor: 1500,
    totalPriceMinor: 6000,
    currency: "USD",
    ...overrides,
  };
}

function lineB(
  overrides: Partial<TrustedPartialRefundLineFact> = {}
): TrustedPartialRefundLineFact {
  return {
    orderItemId: LINE_B,
    orderId: ORDER,
    storeId: STORE,
    purchasedQuantity: 2,
    unitPriceMinor: 2000,
    totalPriceMinor: 4000,
    currency: "USD",
    ...overrides,
  };
}

function prior(
  overrides: Partial<TrustedPartialRefundPriorAccounting> = {}
): TrustedPartialRefundPriorAccounting {
  return {
    priorRefundedAmountMinor: 0,
    priorRefundedQuantityByLineId: {},
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<CalculatePartialRefundInput> = {}
): CalculatePartialRefundInput {
  return {
    capture: capture(),
    lines: [lineA(), lineB()],
    intent: [{ orderItemId: LINE_A, requestedQuantity: 1 }],
    prior: prior(),
    ...overrides,
  };
}

describe("Partial refund path — capability", () => {
  it("owns calculation only; commit/restock/entitlement/settlement remain false", () => {
    expect(PARTIAL_REFUND_PATH_ID).toBe(
      "commerce.payments.partial_refund_path_v1"
    );
    expect(PARTIAL_REFUND_PATH_VERSION).toBe(
      "commerce-partial-refund-path-foundation-v1"
    );
    const ownership = partialRefundPathCapabilityOwnership();
    expect(ownership.ownsPartialRefundCalculation).toBe(true);
    expect(ownership.ownsPartialRefundCommit).toBe(false);
    expect(ownership.ownsPartialRefundRestock).toBe(false);
    expect(ownership.ownsPartialEntitlementAdjustment).toBe(false);
    expect(ownership.ownsPartialSettlementUnwind).toBe(false);
    expect(ownership.ownsPartialCommissionUnwind).toBe(false);
  });

  it("rejects client money fields on intent bags", () => {
    expect(rejectClientPartialRefundMoneyFields({ orderItemId: LINE_A }).ok).toBe(
      true
    );
    expect(
      rejectClientPartialRefundMoneyFields({ amountMinor: 100 }).ok
    ).toBe(false);
    expect(
      rejectClientPartialRefundMoneyFields({ currency: "USD" }).ok
    ).toBe(false);
  });

  it("fail-closes commit ownership", () => {
    const result = assertPartialRefundCommitAllowed();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unsupported_commit");
  });
});

describe("Partial refund path — calculation", () => {
  it("computes one-line partial quantity from trusted unit price", () => {
    const result = calculatePartialRefundPlan(baseInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.computedRefundAmountMinor).toBe(1500);
    expect(result.remainingRefundableAmountMinor).toBe(10000);
    expect(result.remainingRefundableAmountAfterMinor).toBe(8500);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      orderItemId: LINE_A,
      requestedQuantity: 1,
      remainingQuantityBefore: 4,
      remainingQuantityAfter: 3,
      refundAmountMinor: 1500,
      currency: "USD",
    });
    expect(result.isFullRemainingCaptureRefund).toBe(false);
    expect(result.ownership.ownsPartialRefundCalculation).toBe(true);
  });

  it("computes multiple-line partial refund", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        intent: [
          { orderItemId: LINE_A, requestedQuantity: 2 },
          { orderItemId: LINE_B, requestedQuantity: 1 },
        ],
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.computedRefundAmountMinor).toBe(1500 * 2 + 2000);
    expect(result.lines).toHaveLength(2);
  });

  it("deducts previous partial refund quantity and money", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        intent: [{ orderItemId: LINE_A, requestedQuantity: 1 }],
        prior: prior({
          priorRefundedAmountMinor: 1500,
          priorRefundedQuantityByLineId: { [LINE_A]: 1 },
        }),
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.priorRefundedAmountMinor).toBe(1500);
    expect(result.remainingRefundableAmountMinor).toBe(8500);
    expect(result.lines[0].remainingQuantityBefore).toBe(3);
    expect(result.computedRefundAmountMinor).toBe(1500);
  });

  it("rejects over-refund against remaining capture balance", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        capture: capture({ captureAmountMinor: 2000 }),
        lines: [
          lineA({
            purchasedQuantity: 2,
            unitPriceMinor: 1500,
            totalPriceMinor: 3000,
          }),
        ],
        // Impossible: merchandise exceeds capture — inconsistent math first.
        // Use capture covering merchandise but prior leaving less than request.
        intent: [{ orderItemId: LINE_A, requestedQuantity: 2 }],
      })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("inconsistent_line_math");

    const over = calculatePartialRefundPlan(
      baseInput({
        capture: capture({ captureAmountMinor: 10000 }),
        prior: prior({
          priorRefundedAmountMinor: 9000,
          priorRefundedQuantityByLineId: { [LINE_A]: 2, [LINE_B]: 2 },
        }),
        intent: [{ orderItemId: LINE_A, requestedQuantity: 1 }],
      })
    );
    // remaining qty A = 2; request 1 => 1500; remaining money = 1000 → over_refund
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe("over_refund");
  });

  it("rejects over-quantity against purchased minus prior", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        prior: prior({
          priorRefundedAmountMinor: 4500,
          priorRefundedQuantityByLineId: { [LINE_A]: 3 },
        }),
        intent: [{ orderItemId: LINE_A, requestedQuantity: 2 }],
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("over_quantity");
  });

  it("rejects unknown line", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        intent: [{ orderItemId: UNKNOWN, requestedQuantity: 1 }],
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unknown_line");
  });

  it("rejects zero and negative quantity", () => {
    const zero = calculatePartialRefundPlan(
      baseInput({
        intent: [{ orderItemId: LINE_A, requestedQuantity: 0 }],
      })
    );
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.code).toBe("zero_quantity");

    const neg = calculatePartialRefundPlan(
      baseInput({
        intent: [{ orderItemId: LINE_A, requestedQuantity: -1 }],
      })
    );
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.code).toBe("negative_quantity");
  });

  it("rejects duplicate line selection", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        intent: [
          { orderItemId: LINE_A, requestedQuantity: 1 },
          { orderItemId: LINE_A, requestedQuantity: 1 },
        ],
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("duplicate_line");
  });

  it("enforces currency consistency", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        lines: [lineA({ currency: "EUR" }), lineB()],
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("currency_mismatch");
  });

  it("marks full remaining capture refund when all remaining qty+money refunded", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        capture: capture({ captureAmountMinor: 10000 }),
        intent: [
          { orderItemId: LINE_A, requestedQuantity: 4 },
          { orderItemId: LINE_B, requestedQuantity: 2 },
        ],
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.computedRefundAmountMinor).toBe(10000);
    expect(result.isFullRemainingCaptureRefund).toBe(true);
  });

  it("is idempotent for identical trusted inputs (same fingerprint)", () => {
    const input = baseInput({
      intent: [
        { orderItemId: LINE_A, requestedQuantity: 2 },
        { orderItemId: LINE_B, requestedQuantity: 1 },
      ],
    });
    const a = calculatePartialRefundPlan(input);
    const b = calculatePartialRefundPlan(input);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.calculationFingerprint).toBe(b.calculationFingerprint);
    expect(a.computedRefundAmountMinor).toBe(b.computedRefundAmountMinor);
  });

  it("fail-closes concurrent-accounting when prior money contradicts prior qty", () => {
    const result = calculatePartialRefundPlan(
      baseInput({
        prior: prior({
          // Qty implies 1500 but money claims only 500.
          priorRefundedAmountMinor: 500,
          priorRefundedQuantityByLineId: { [LINE_A]: 1 },
        }),
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("inconsistent_prior_accounting");
  });

  it("compatible with full-order path: quantity intents never accept client money", () => {
    // Full-order path rejects client money; partial foundation mirrors that gate.
    expect(
      rejectClientPartialRefundMoneyFields({
        trustedAmountMinor: 10000,
        currency: "USD",
      }).ok
    ).toBe(false);

    const plan = calculatePartialRefundPlan(
      baseInput({
        intent: [
          { orderItemId: LINE_A, requestedQuantity: 4 },
          { orderItemId: LINE_B, requestedQuantity: 2 },
        ],
      })
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // Full remaining selection produces capture-equal merchandise refund without client amount.
    expect(plan.computedRefundAmountMinor).toBe(plan.captureAmountMinor);
    expect(plan.isFullRemainingCaptureRefund).toBe(true);
  });
});
