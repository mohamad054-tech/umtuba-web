/** UEOS Foundation V1 — shared types (additive; no Store wiring). */

export type UeosProductStatus = "active" | "planned" | "disabled";

export type UeosAssetKind = "fiat_minor" | "points" | "token";

export type UeosAssetLifecycleStatus =
  | "active"
  | "planned"
  | "future_reserved"
  | "disabled";

export type UeosPolicyStatus = "draft" | "active" | "superseded" | "disabled";

export type UeosOwnerType = "user" | "store" | "platform" | "system";

export type UeosAccountKind =
  | "wallet"
  | "clearing"
  | "receivable"
  | "payable"
  | "escrow"
  | "revenue"
  | "liability";

export type UeosLedgerDirection = "debit" | "credit";

export type UeosJournalEventType =
  | "transfer"
  | "payment_authorized"
  | "payment_captured"
  | "payment_failed"
  | "refund_recorded"
  | "adjustment"
  | "hold"
  | "release";

export type UeosCreatedBy = "system" | "service" | "admin";

export type UeosPostLineInput = {
  accountId: string;
  direction: UeosLedgerDirection;
  amountMinor: number;
  /** Optional; must match account asset when provided. */
  assetCode?: string;
};

export type UeosEnsureAccountInput = {
  ownerType: UeosOwnerType;
  ownerId: string | null;
  accountKind: UeosAccountKind;
  assetCode: string;
  productScope: string;
};

/** Initial seeded assets (registry only; no FX). */
export const UEOS_SEEDED_ACTIVE_FIAT_ASSETS = [
  "USD",
  "EUR",
  "ILS",
  "JOD",
  "SAR",
  "AED",
  "EGP",
] as const;

export const UEOS_SEEDED_POINTS_ASSET = "UM_POINTS" as const;

/** Future placeholder only — never postable in V1. */
export const UEOS_FUTURE_TOKEN_ASSET = "UMT" as const;

export const UEOS_WRITE_GATE_RPCS = [
  "ueos_ensure_account",
  "ueos_post_journal",
] as const;
