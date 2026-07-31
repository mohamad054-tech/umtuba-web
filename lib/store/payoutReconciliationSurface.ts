/**
 * Settlement ↔ Payout Reconciliation Surface V1.
 * Seller-facing view-model over trusted Reconciliation Read V1 RPCs.
 * Read-only. No writes, bank rails, client money, or duplicate recon math.
 */

import {
  SETTLEMENT_PAYOUT_RECONCILIATION_ID,
  compareSettlementPayoutReconRowsNewestFirst,
  type SettlementPayoutReconIssue,
  type SettlementPayoutReconIssueCode,
  type SettlementPayoutReconPage,
  type SettlementPayoutReconRow,
  type SettlementPayoutReconSeverity,
  type SettlementPayoutReconSummary,
} from "./settlementPayoutReconciliation";
import { formatTrustedMoney } from "./tradingContracts";

export const PAYOUT_RECONCILIATION_SURFACE_ID =
  "commerce.settlement.payout_reconciliation_surface_v1" as const;

/** Page size for the seller store section (bounded; RPC max remains 50). */
export const PAYOUT_RECONCILIATION_SURFACE_PAGE_SIZE = 10 as const;

/** Seller-facing category keys (mapped from trusted issue codes). */
export const PAYOUT_RECON_SURFACE_CATEGORIES = [
  "aligned",
  "released_without_booking",
  "orphan_payout",
  "unsettled_with_payout",
  "duplicate_booking",
  "completed_inconsistency",
  "in_transit_missing_submit",
  "refunded_with_active_payout",
] as const;
export type PayoutReconSurfaceCategory =
  (typeof PAYOUT_RECON_SURFACE_CATEGORIES)[number];

export const PAYOUT_RECON_SURFACE_CATEGORY_LABELS: Record<
  PayoutReconSurfaceCategory,
  string
> = {
  aligned: "Aligned",
  released_without_booking: "Released — awaiting payout booking",
  orphan_payout: "Payout without released settlement",
  unsettled_with_payout: "Unsettled funds with payout activity",
  duplicate_booking: "Duplicate payout booking",
  completed_inconsistency: "Completed payout inconsistency",
  in_transit_missing_submit: "In-transit missing booking",
  refunded_with_active_payout: "Refund with active payout",
};

export const PAYOUT_RECON_SURFACE_CATEGORY_HELP: Record<
  PayoutReconSurfaceCategory,
  string
> = {
  aligned: "Settlement and payout records match for this capture.",
  released_without_booking:
    "Funds are released and ready, but no payout booking has started yet.",
  orphan_payout:
    "A payout booking exists without a matching released settlement.",
  unsettled_with_payout:
    "Payout activity exists while settlement is still unsettled.",
  duplicate_booking:
    "More than one payout booking appears for the same capture.",
  completed_inconsistency:
    "A completed payout does not match the expected released settlement path.",
  in_transit_missing_submit:
    "Payout is marked in transit without a matching open booking.",
  refunded_with_active_payout:
    "A refund is recorded while a payout is still in transit or completed.",
};

const SENSITIVE_RENDER_PATTERNS = [
  /request_fingerprint/i,
  /fingerprint_alg/i,
  /ueos_journal/i,
  /journal_entry/i,
  /policy_id/i,
  /bank_account/i,
  /beneficiary/i,
  /\brail\b/i,
  /provider_reference/i,
  /provider_payload/i,
  /metadata/i,
] as const;

export type PayoutReconSurfaceOverallState =
  | "aligned"
  | "issues_detected"
  | "unavailable";

export type PayoutReconSurfaceIssueView = {
  category: PayoutReconSurfaceCategory;
  categoryLabel: string;
  help: string;
  severity: SettlementPayoutReconSeverity;
  trustedCode: SettlementPayoutReconIssueCode;
};

export type PayoutReconSurfaceRowView = {
  key: string;
  amountLabel: string;
  currency: string;
  amountMinor: number;
  captureAtLabel: string;
  issues: PayoutReconSurfaceIssueView[];
  highestSeverity: SettlementPayoutReconSeverity;
};

export type PayoutReconSurfaceCurrencyView = {
  currency: string;
  captureCount: number;
  issueCount: number;
  errorCount: number;
  infoCount: number;
};

export type PayoutReconSurfaceView = {
  capability: typeof PAYOUT_RECONCILIATION_SURFACE_ID;
  source: typeof SETTLEMENT_PAYOUT_RECONCILIATION_ID;
  storeId: string;
  overallState: PayoutReconSurfaceOverallState;
  message: string | null;
  currencySummaries: PayoutReconSurfaceCurrencyView[];
  rows: PayoutReconSurfaceRowView[];
  hasMore: boolean;
  nextCursor: { beforeCreatedAt: string; beforeId: string } | null;
  issuesOnly: true;
  bankRailsEnabled: false;
  repairActionsEnabled: false;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Map trusted issue codes → seller-facing categories (no new recon math). */
export function mapTrustedIssueToSurfaceCategory(
  code: string | null | undefined
): PayoutReconSurfaceCategory {
  switch (code) {
    case "aligned":
      return "aligned";
    case "released_without_payout_booking":
      return "released_without_booking";
    case "payout_without_released_settlement":
      return "orphan_payout";
    case "unsettled_with_payout":
      return "unsettled_with_payout";
    case "duplicate_payout_booking":
      return "duplicate_booking";
    case "completed_without_release":
    case "completed_missing_confirm":
      return "completed_inconsistency";
    case "in_transit_missing_submit":
      return "in_transit_missing_submit";
    case "refunded_with_active_payout":
      return "refunded_with_active_payout";
    default:
      return "aligned";
  }
}

export function projectTrustedIssueToSurface(
  issue: SettlementPayoutReconIssue
): PayoutReconSurfaceIssueView {
  const category = mapTrustedIssueToSurfaceCategory(issue.code);
  return {
    category,
    categoryLabel: PAYOUT_RECON_SURFACE_CATEGORY_LABELS[category],
    help: PAYOUT_RECON_SURFACE_CATEGORY_HELP[category],
    severity: issue.severity,
    trustedCode: issue.code,
  };
}

export function projectReconRowToSurface(
  row: SettlementPayoutReconRow
): PayoutReconSurfaceRowView {
  const issues = row.issues
    .map(projectTrustedIssueToSurface)
    .filter((i) => i.category !== "aligned" || row.issues.length === 1);
  return {
    key: row.captureEventId || row.orderId,
    amountLabel: formatTrustedMoney(row.amountMinor, row.currency),
    currency: row.currency.toUpperCase(),
    amountMinor: row.amountMinor,
    captureAtLabel: formatTimestamp(row.captureCreatedAt) ?? "—",
    issues:
      issues.length > 0
        ? issues
        : [
            projectTrustedIssueToSurface({
              code: "aligned",
              severity: "ok",
              message: "aligned",
            }),
          ],
    highestSeverity: row.highestSeverity,
  };
}

export function reconSurfaceRowContainsSensitiveFields(
  row: PayoutReconSurfaceRowView
): boolean {
  const blob = JSON.stringify(row);
  return SENSITIVE_RENDER_PATTERNS.some((re) => re.test(blob));
}

export function assertReconPageBelongsToStore(
  page: SettlementPayoutReconPage,
  storeId: string
): { ok: true } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "Store is invalid." };
  }
  if (page.storeId !== storeId) {
    return {
      ok: false,
      message: "Reconciliation does not belong to this store.",
    };
  }
  return { ok: true };
}

export function assertReconSummaryBelongsToStore(
  summary: SettlementPayoutReconSummary,
  storeId: string
): { ok: true } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "Store is invalid." };
  }
  if (summary.storeId !== storeId) {
    return {
      ok: false,
      message: "Reconciliation summary does not belong to this store.",
    };
  }
  return { ok: true };
}

export function parsePayoutReconSurfaceCursor(input: {
  beforeCreatedAt?: string | null;
  beforeId?: string | null;
}):
  | { ok: true; cursor: { beforeCreatedAt: string; beforeId: string } | null }
  | { ok: false; message: string } {
  const at = input.beforeCreatedAt?.trim() || null;
  const id = input.beforeId?.trim() || null;
  if (at == null && id == null) {
    return { ok: true, cursor: null };
  }
  if (at == null || id == null) {
    return { ok: false, message: "Invalid reconciliation cursor." };
  }
  if (!isUuid(id)) {
    return { ok: false, message: "Invalid reconciliation cursor." };
  }
  if (Number.isNaN(Date.parse(at))) {
    return { ok: false, message: "Invalid reconciliation cursor." };
  }
  return { ok: true, cursor: { beforeCreatedAt: at, beforeId: id } };
}

export function buildPayoutReconSurfaceLoadMoreHref(input: {
  basePath: string;
  periodKey?: string | null;
  cursor: { beforeCreatedAt: string; beforeId: string };
  /** Preserve payout history cursor when paginating recon. */
  payoutHistoryCursor?: {
    beforeCreatedAt: string;
    beforeId: string;
  } | null;
}): string {
  const params = new URLSearchParams();
  if (input.periodKey) {
    params.set("period", input.periodKey);
  }
  if (input.payoutHistoryCursor) {
    params.set("payout_before", input.payoutHistoryCursor.beforeCreatedAt);
    params.set("payout_before_id", input.payoutHistoryCursor.beforeId);
  }
  params.set("recon_before", input.cursor.beforeCreatedAt);
  params.set("recon_before_id", input.cursor.beforeId);
  const q = params.toString();
  return q ? `${input.basePath}?${q}` : input.basePath;
}

function projectCurrencySummaries(
  summary: SettlementPayoutReconSummary | null
): PayoutReconSurfaceCurrencyView[] {
  if (!summary) return [];
  return summary.byCurrency.map((b) => ({
    currency: b.currency.toUpperCase(),
    captureCount: b.captureCount,
    issueCount: b.issueCount,
    errorCount: b.errorCount,
    infoCount: b.infoCount,
  }));
}

/**
 * Fail-closed surface builder. Never trusts client money or client recon results.
 * Default view is issues-only (aligned-only pages become overall aligned).
 */
export function buildPayoutReconciliationSurface(input: {
  storeId: string;
  page: SettlementPayoutReconPage | null;
  summary?: SettlementPayoutReconSummary | null;
  errorMessage?: string | null;
  unavailable?: boolean;
}): PayoutReconSurfaceView {
  const base = {
    capability: PAYOUT_RECONCILIATION_SURFACE_ID,
    source: SETTLEMENT_PAYOUT_RECONCILIATION_ID,
    storeId: input.storeId,
    issuesOnly: true as const,
    bankRailsEnabled: false as const,
    repairActionsEnabled: false as const,
  };

  if (input.unavailable || !input.page) {
    return {
      ...base,
      overallState: "unavailable",
      message:
        input.errorMessage?.trim() ||
        "Settlement payout reconciliation is unavailable until trusted reads succeed.",
      currencySummaries: [],
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  const ownership = assertReconPageBelongsToStore(input.page, input.storeId);
  if (!ownership.ok) {
    return {
      ...base,
      overallState: "unavailable",
      message: ownership.message,
      currencySummaries: [],
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  if (input.summary) {
    const summaryOwnership = assertReconSummaryBelongsToStore(
      input.summary,
      input.storeId
    );
    if (!summaryOwnership.ok) {
      return {
        ...base,
        overallState: "unavailable",
        message: summaryOwnership.message,
        currencySummaries: [],
        rows: [],
        hasMore: false,
        nextCursor: null,
      };
    }
  }

  const sorted = [...input.page.items].sort(
    compareSettlementPayoutReconRowsNewestFirst
  );
  const rows = sorted.map(projectReconRowToSurface);
  if (rows.some(reconSurfaceRowContainsSensitiveFields)) {
    return {
      ...base,
      overallState: "unavailable",
      message: "Reconciliation payload is unsafe.",
      currencySummaries: [],
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  const currencySummaries = projectCurrencySummaries(input.summary ?? null);

  if (rows.length === 0) {
    return {
      ...base,
      overallState: "aligned",
      message:
        "No settlement↔payout issues detected for this store. Captures look aligned.",
      currencySummaries,
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  return {
    ...base,
    overallState: "issues_detected",
    message: null,
    currencySummaries,
    rows,
    hasMore: Boolean(input.page.hasMore && input.page.nextCursor),
    nextCursor: input.page.nextCursor,
  };
}

export function payoutReconSurfaceCategories(): readonly PayoutReconSurfaceCategory[] {
  return PAYOUT_RECON_SURFACE_CATEGORIES;
}
