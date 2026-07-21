/**
 * Merchant Settlement & Seller Balances Foundation V1 — types and constants.
 * Money movement is DB-authoritative via apply_store_settlement_event.
 */

export const STORE_SETTLEMENT_ACTIONS = [
  "allocate",
  "release",
  "hold",
  "reverse_allocation",
] as const;
export type StoreSettlementAction = (typeof STORE_SETTLEMENT_ACTIONS)[number];

export const STORE_SETTLEMENT_POLICY_CODES = {
  allocate: "store.settlement.allocate",
  release: "store.settlement.release",
  hold: "store.settlement.hold",
  reverse_allocation: "store.settlement.reverse_allocation",
} as const;

/** Allocate: platform liability → store escrow. */
export const STORE_SETTLEMENT_ALLOCATE_POSTING_TEMPLATE = {
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
      owner_type: "store",
      account_kind: "escrow",
      product_scope: "store",
    },
  ],
} as const;

/** Release: store escrow → store payable. */
export const STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "store",
      account_kind: "escrow",
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

/** Hold: store payable → store escrow. */
export const STORE_SETTLEMENT_HOLD_POSTING_TEMPLATE = {
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
      account_kind: "escrow",
      product_scope: "store",
    },
  ],
} as const;

/** Reverse allocation: store escrow → platform liability. */
export const STORE_SETTLEMENT_REVERSE_POSTING_TEMPLATE = {
  mode: "double_entry",
  asset_source: "order_currency",
  lines: [
    {
      role: "debit",
      owner_type: "store",
      account_kind: "escrow",
      product_scope: "store",
    },
    {
      role: "credit",
      owner_type: "platform",
      account_kind: "liability",
      product_scope: "ueos",
    },
  ],
} as const;

export const STORE_SETTLEMENT_RPC = "apply_store_settlement_event" as const;

export const STORE_SETTLEMENT_FINGERPRINT_ALG_V1 = "md5" as const;

export const STORE_SETTLEMENT_STATES = [
  "UNALLOCATED",
  "ALLOCATED",
  "RELEASED",
  "HELD",
  "REVERSED",
] as const;
export type StoreSettlementState = (typeof STORE_SETTLEMENT_STATES)[number];
