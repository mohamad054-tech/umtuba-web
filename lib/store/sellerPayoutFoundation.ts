/**
 * Seller Payout Foundation V1 — types and constants.
 * Money movement is DB-authoritative via apply_store_payout_event.
 * Does not initiate bank/PSP transfers or accept client money fields.
 */

export const STORE_PAYOUT_FOUNDATION_ID =
  "commerce.settlement.seller_payout_foundation_v1" as const;

export const STORE_PAYOUT_ACTIONS = ["submit", "confirm", "fail"] as const;
export type StorePayoutAction = (typeof STORE_PAYOUT_ACTIONS)[number];

export const STORE_PAYOUT_POLICY_CODES = {
  submit: "store.payout.submit",
  confirm: "store.payout.confirm",
  fail: "store.payout.fail",
} as const;

/** Submit: store payable → store in_transit. */
export const STORE_PAYOUT_SUBMIT_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "store",
      account_kind: "payable",
      product_scope: "store",
    },
    {
      role: "credit",
      owner_type: "store",
      account_kind: "in_transit",
      product_scope: "store",
    },
  ],
} as const;

/** Confirm: store in_transit → platform clearing (funds leave custody). */
export const STORE_PAYOUT_CONFIRM_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "store",
      account_kind: "in_transit",
      product_scope: "store",
    },
    {
      role: "credit",
      owner_type: "platform",
      account_kind: "clearing",
      product_scope: "ueos",
    },
  ],
} as const;

/** Fail: store in_transit → store payable. */
export const STORE_PAYOUT_FAIL_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "store",
      account_kind: "in_transit",
      product_scope: "store",
    },
    {
      role: "credit",
      owner_type: "store",
      account_kind: "payable",
      product_scope: "store",
    },
  ],
} as const;

export const STORE_PAYOUT_RPC = "apply_store_payout_event" as const;

export const STORE_PAYOUT_FINGERPRINT_ALG_V1 = "md5" as const;

export const STORE_PAYOUT_STATES = ["NONE", "IN_TRANSIT", "COMPLETED"] as const;
export type StorePayoutState = (typeof STORE_PAYOUT_STATES)[number];
