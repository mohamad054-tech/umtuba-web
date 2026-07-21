/**
 * Trusted Payment Outcome Sync V1 — types and constants.
 * Money movement is DB-authoritative via apply_store_payment_outcome.
 */

export const STORE_PAYMENT_OUTCOMES = [
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type StorePaymentOutcome = (typeof STORE_PAYMENT_OUTCOMES)[number];

export const STORE_PAYMENT_POLICY_CODES = {
  authorized: "store.payment.authorized",
  captured: "store.payment.captured",
  refunded: "store.payment.refunded",
} as const;

/** Approved Sync V1 capture posting (marketplace gross hold). */
export const STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "platform",
      account_kind: "clearing",
      product_scope: "ueos",
    },
    {
      role: "credit",
      owner_type: "platform",
      account_kind: "liability",
      product_scope: "ueos",
    },
  ],
} as const;

/** Approved Sync V1 refund posting (reverse hold). */
export const STORE_PAYMENT_REFUND_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "platform",
      account_kind: "liability",
      product_scope: "ueos",
    },
    {
      role: "credit",
      owner_type: "platform",
      account_kind: "clearing",
      product_scope: "ueos",
    },
  ],
} as const;

export const STORE_PAYMENT_SYNC_RPC = "apply_store_payment_outcome" as const;

export const STORE_PAYMENT_FINGERPRINT_ALG_V1 = "md5" as const;
