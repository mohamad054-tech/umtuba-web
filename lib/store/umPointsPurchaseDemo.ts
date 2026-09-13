/**
 * Isolated TEST/DEMO ledger for the CJ launch Store sandbox.
 * Never presented as a production customer balance.
 */

import { StoreUmPointsPurchaseLedger } from "./umPointsPurchaseLedger";

export const STORE_UM_POINTS_DEMO_BANNER = "TEST / DEMO ledger — not a production balance";

export const STORE_UM_POINTS_DEMO_USER_ID = "demo-store-rewards-user";

export function createStoreUmPointsDemoLedger(): StoreUmPointsPurchaseLedger {
  const ledger = new StoreUmPointsPurchaseLedger();
  const actor = { actorUserId: STORE_UM_POINTS_DEMO_USER_ID };

  ledger.applyPurchaseEarn({
    ...actor,
    userId: STORE_UM_POINTS_DEMO_USER_ID,
    orderId: "demo-order-paid-40",
    paymentReference: "demo-capture-40",
    paymentStatus: "captured",
    spend: {
      productSubtotal: 40,
      discount: 5,
      shipping: 8,
      tax: 7,
      originalCurrency: "USD",
    },
    createdAt: "2026-09-01T12:00:00.000Z",
  });

  ledger.applyRefundReversal({
    ...actor,
    userId: STORE_UM_POINTS_DEMO_USER_ID,
    orderId: "demo-order-paid-40",
    refundReference: "demo-refund-12-75",
    refundedEligible: {
      productSubtotal: 12.75,
      originalCurrency: "USD",
    },
    createdAt: "2026-09-02T12:00:00.000Z",
  });

  ledger.applyPurchaseEarn({
    ...actor,
    userId: STORE_UM_POINTS_DEMO_USER_ID,
    orderId: "demo-order-paid-10",
    paymentReference: "demo-capture-10",
    paymentStatus: "paid",
    spend: {
      productSubtotal: 10,
      originalCurrency: "USD",
    },
    createdAt: "2026-09-03T12:00:00.000Z",
  });

  return ledger;
}

export function readStoreUmPointsDemoSummary() {
  const ledger = createStoreUmPointsDemoLedger();
  const summary = ledger.summarizeForActor(
    { actorUserId: STORE_UM_POINTS_DEMO_USER_ID },
    STORE_UM_POINTS_DEMO_USER_ID
  );
  if ("denied" in summary) {
    throw new Error("Demo ledger self-read must succeed.");
  }
  return summary;
}
