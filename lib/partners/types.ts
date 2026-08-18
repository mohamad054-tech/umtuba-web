/**
 * Pre-company partner foundation — shared Store + Learning types.
 * MOCK only. Unknown rights default DENY. No plaintext credentials.
 */

export const DATA_CLASSES = ["MOCK_DATA", "REAL_PARTNER_DATA"] as const;
export type DataClass = (typeof DATA_CLASSES)[number];

export const SOURCE_TYPES = [
  "UMTUBA_ORIGINAL",
  "PARTNER",
  "EXTERNAL",
  "MOCK_PROVIDER",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PARTNER_LIFECYCLE_STATES = [
  "DRAFT",
  "LEGAL_REVIEW",
  "APPROVED",
  "INTEGRATION",
  "QA",
  "ACTIVE",
  "SUSPENDED",
  "TERMINATED",
] as const;
export type PartnerLifecycleState = (typeof PARTNER_LIFECYCLE_STATES)[number];

export const PARTNER_LEGAL_STATUSES = [
  "NOT_STARTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type PartnerLegalStatus = (typeof PARTNER_LEGAL_STATUSES)[number];

export const PARTNER_CONTRACT_STATUSES = [
  "UNSIGNED",
  "IN_NEGOTIATION",
  "SIGNED",
  "EXPIRED",
  "TERMINATED",
] as const;
export type PartnerContractStatus = (typeof PARTNER_CONTRACT_STATUSES)[number];

export const CREDENTIAL_STATUSES = [
  "ABSENT",
  "PRESENT",
  "ROTATION_DUE",
  "REVOKED",
] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const PARTNER_DOMAINS = ["STORE", "LEARNING", "BOTH"] as const;
export type PartnerDomain = (typeof PARTNER_DOMAINS)[number];

export const TAX_CLASSIFICATIONS = [
  "UNCLASSIFIED",
  "VAT_PLACEHOLDER",
  "SALES_TAX_PLACEHOLDER",
] as const;
export type TaxClassification = (typeof TAX_CLASSIFICATIONS)[number];

export const PAYOUT_LEDGER_STATUSES = [
  "PLACEHOLDER",
  "ACCRUED",
  "VOID",
] as const;
export type PayoutLedgerStatus = (typeof PAYOUT_LEDGER_STATUSES)[number];

/** Opaque vault pointer — never a secret value. */
export type CredentialRef = {
  status: CredentialStatus;
  vaultRef: string | null;
  rotatedAt: string | null;
  revokedAt: string | null;
  lastPresenceCheckAt: string | null;
};

export type PartnerCommercialConfig = {
  markets: string[];
  currencies: string[];
  languages: string[];
  commissionBps: number;
  revenueShareBps: number;
  taxClassification: TaxClassification;
  startsAt: string | null;
  endsAt: string | null;
};

export type PartnerRecord = {
  id: string;
  displayName: string;
  domain: PartnerDomain;
  dataClass: DataClass;
  lifecycle: PartnerLifecycleState;
  legalStatus: PartnerLegalStatus;
  contractStatus: PartnerContractStatus;
  credential: CredentialRef;
  commercial: PartnerCommercialConfig;
  storeProviderId: string | null;
  learningProviderId: string | null;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
  terminatedAt: string | null;
};

export type PartnerAuditEvent = {
  id: string;
  partnerId: string;
  action: string;
  actor: string;
  at: string;
  detail: Record<string, string | number | boolean | null>;
};

export type PayoutLedgerPlaceholder = {
  id: string;
  partnerId: string;
  orderOrEnrollmentId: string;
  attributionKind: "ORDER" | "ENROLLMENT" | "REFUND";
  currency: string;
  amountMinor: number;
  status: PayoutLedgerStatus;
  note: string;
};

export const FORBIDDEN_THIRD_PARTY_BRAND_TOKENS = [
  "shein",
  "temu",
  "amazon",
  "aliexpress",
  "alibaba",
  "walmart",
  "ebay",
  "wish.com",
  "dhgate",
  "zaful",
  "romwe",
  "asos",
  "shopify-partner",
] as const;

export const PRECOMPANY_FOUNDATION_MIGRATION =
  "20260929_store_learning_precompany_foundation_v2.sql";
