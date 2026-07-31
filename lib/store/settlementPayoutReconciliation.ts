/**
 * Settlement ↔ Payout Reconciliation Read V1.
 * Pure trusted-fact reconciliation + authenticated RPC wrappers.
 * Read-only. No payout execution, bank rails, or client money.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const SETTLEMENT_PAYOUT_RECONCILIATION_ID =
  "commerce.settlement.payout_reconciliation_read_v1" as const;

export const SETTLEMENT_PAYOUT_RECON_RPCS = {
  list: "get_my_seller_settlement_payout_reconciliation",
  summary: "get_my_seller_settlement_payout_reconciliation_summary",
} as const;

export const SETTLEMENT_PAYOUT_RECON_MAX_LIMIT = 50 as const;
export const SETTLEMENT_PAYOUT_RECON_DEFAULT_LIMIT = 50 as const;

export const SETTLEMENT_PAYOUT_RECON_ISSUE_CODES = [
  "aligned",
  "released_without_payout_booking",
  "payout_without_released_settlement",
  "duplicate_payout_booking",
  "completed_without_release",
  "completed_missing_confirm",
  "in_transit_missing_submit",
  "refunded_with_active_payout",
  "unsettled_with_payout",
] as const;
export type SettlementPayoutReconIssueCode =
  (typeof SETTLEMENT_PAYOUT_RECON_ISSUE_CODES)[number];

export type SettlementPayoutReconSeverity = "ok" | "info" | "warning" | "error";

export type SettlementPayoutCaptureFacts = {
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  amountMinor: number;
  currency: string;
  settlementState: string;
  payoutState: string;
  submitCount: number;
  failCount: number;
  confirmCount: number;
  hasRefund: boolean;
  captureCreatedAt: string;
};

export type SettlementPayoutReconIssue = {
  code: SettlementPayoutReconIssueCode;
  severity: SettlementPayoutReconSeverity;
  message: string;
};

export type SettlementPayoutReconRow = {
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  amountMinor: number;
  currency: string;
  settlementState: string;
  payoutState: string;
  issues: SettlementPayoutReconIssue[];
  highestSeverity: SettlementPayoutReconSeverity;
  captureCreatedAt: string;
};

type AnyClient = SupabaseClient;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

const SEVERITY_RANK: Record<SettlementPayoutReconSeverity, number> = {
  ok: 0,
  info: 1,
  warning: 2,
  error: 3,
};

export function maxSeverity(
  issues: SettlementPayoutReconIssue[]
): SettlementPayoutReconSeverity {
  let best: SettlementPayoutReconSeverity = "ok";
  for (const issue of issues) {
    if (SEVERITY_RANK[issue.severity] > SEVERITY_RANK[best]) {
      best = issue.severity;
    }
  }
  return best;
}

/** Newest-first: capture_created_at desc, capture_event_id desc (deterministic). */
export function compareSettlementPayoutReconRowsNewestFirst(
  a: Pick<SettlementPayoutReconRow, "captureCreatedAt" | "captureEventId">,
  b: Pick<SettlementPayoutReconRow, "captureCreatedAt" | "captureEventId">
): number {
  if (a.captureCreatedAt !== b.captureCreatedAt) {
    return a.captureCreatedAt < b.captureCreatedAt ? 1 : -1;
  }
  if (a.captureEventId === b.captureEventId) return 0;
  return a.captureEventId < b.captureEventId ? 1 : -1;
}

/**
 * Pure reconciliation of trusted capture facts.
 * Never trusts client money — callers must supply server-derived facts only.
 */
export function reconcileSettlementPayoutCapture(
  facts: SettlementPayoutCaptureFacts
): SettlementPayoutReconRow {
  const issues: SettlementPayoutReconIssue[] = [];
  const settlement = facts.settlementState;
  const payout = facts.payoutState;
  const released = settlement === "RELEASED";
  const unsettled = ["UNALLOCATED", "ALLOCATED", "HELD", "REVERSED"].includes(
    settlement
  );

  if (facts.hasRefund && (payout === "IN_TRANSIT" || payout === "COMPLETED")) {
    issues.push({
      code: "refunded_with_active_payout",
      severity: "error",
      message:
        "Trusted refund exists while payout is in_transit or completed.",
    });
  }

  if (!released && (facts.submitCount > 0 || payout !== "NONE")) {
    issues.push({
      code: "payout_without_released_settlement",
      severity: "error",
      message:
        "Payout booking or non-NONE payout state without settlement RELEASED.",
    });
  }

  if (unsettled && (facts.submitCount > 0 || payout !== "NONE")) {
    issues.push({
      code: "unsettled_with_payout",
      severity: "error",
      message: `Settlement state ${settlement} is unsettled but payout activity exists.`,
    });
  }

  // Expected active submits: IN_TRANSIT/COMPLETED need failCount+1 submits.
  const expectedOpenSubmits =
    payout === "IN_TRANSIT" || payout === "COMPLETED" ? 1 : 0;
  if (facts.submitCount > facts.failCount + expectedOpenSubmits) {
    issues.push({
      code: "duplicate_payout_booking",
      severity: "error",
      message:
        "More submit events than explained by fail/confirm lifecycle (duplicate booking).",
    });
  }

  if (facts.confirmCount > 1) {
    issues.push({
      code: "duplicate_payout_booking",
      severity: "error",
      message: "More than one confirm event for the same capture.",
    });
  }

  if (payout === "COMPLETED" && !released) {
    issues.push({
      code: "completed_without_release",
      severity: "error",
      message: "Payout COMPLETED but settlement is not RELEASED.",
    });
  }

  if (payout === "COMPLETED" && facts.confirmCount < 1) {
    issues.push({
      code: "completed_missing_confirm",
      severity: "error",
      message: "Payout state COMPLETED without a confirm event.",
    });
  }

  if (payout === "IN_TRANSIT" && facts.submitCount < facts.failCount + 1) {
    issues.push({
      code: "in_transit_missing_submit",
      severity: "error",
      message: "Payout IN_TRANSIT without a matching open submit.",
    });
  }

  if (released && payout === "NONE" && facts.submitCount === 0) {
    issues.push({
      code: "released_without_payout_booking",
      severity: "info",
      message:
        "Settlement RELEASED with no payout booking yet (available for payout).",
    });
  }

  if (issues.length === 0) {
    issues.push({
      code: "aligned",
      severity: "ok",
      message: "Settlement and payout states are consistent.",
    });
  }

  return {
    orderId: facts.orderId,
    paymentAttemptId: facts.paymentAttemptId,
    captureEventId: facts.captureEventId,
    amountMinor: facts.amountMinor,
    currency: facts.currency.toUpperCase(),
    settlementState: settlement,
    payoutState: payout,
    issues,
    highestSeverity: maxSeverity(issues),
    captureCreatedAt: facts.captureCreatedAt,
  };
}

export function validateReconStoreId(
  storeId: string | null | undefined
): { ok: true; storeId: string } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "store_id is invalid." };
  }
  return { ok: true, storeId };
}

export function clampReconLimit(
  limit: number | null | undefined
): { ok: true; limit: number } | { ok: false; message: string } {
  if (limit == null) {
    return { ok: true, limit: SETTLEMENT_PAYOUT_RECON_DEFAULT_LIMIT };
  }
  if (!Number.isInteger(limit) || limit < 1) {
    return { ok: false, message: "limit must be an integer >= 1." };
  }
  return {
    ok: true,
    limit: Math.min(limit, SETTLEMENT_PAYOUT_RECON_MAX_LIMIT),
  };
}

export function rejectClientReconMoneyFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /minor|amount|total|balance|payout_sum/i.test(key) &&
      key !== "before_created_at" &&
      input[key] !== undefined &&
      input[key] !== null
    ) {
      if (
        key === "limit" ||
        key === "store_id" ||
        key === "before_id" ||
        key === "before_created_at" ||
        key === "issues_only"
      ) {
        continue;
      }
      return {
        ok: false,
        message:
          "Client must not supply money fields to settlement payout reconciliation.",
      };
    }
  }
  return { ok: true };
}

const SENSITIVE_KEYS = [
  "request_fingerprint",
  "fingerprint_alg",
  "ueos_journal_entry_id",
  "policy_id",
  "metadata",
  "bank_account",
  "beneficiary",
  "rail",
] as const;

export function assertNoSensitiveReconFields(
  payload: Record<string, unknown>
): boolean {
  for (const key of SENSITIVE_KEYS) {
    if (key in payload) return false;
  }
  return true;
}

function parseIssue(raw: unknown): SettlementPayoutReconIssue {
  const row = (raw ?? {}) as Record<string, unknown>;
  const code = str(row.code) as SettlementPayoutReconIssueCode;
  const severity = str(row.severity) as SettlementPayoutReconSeverity;
  return {
    code: (SETTLEMENT_PAYOUT_RECON_ISSUE_CODES as readonly string[]).includes(
      code
    )
      ? code
      : "aligned",
    severity: (["ok", "info", "warning", "error"] as const).includes(
      severity as SettlementPayoutReconSeverity
    )
      ? severity
      : "ok",
    message: str(row.message),
  };
}

export function parseSettlementPayoutReconRow(
  raw: unknown
): SettlementPayoutReconRow {
  const row = (raw ?? {}) as Record<string, unknown>;
  const issuesRaw = Array.isArray(row.issues) ? row.issues : [];
  const issues = issuesRaw.map(parseIssue);
  return {
    orderId: str(row.order_id),
    paymentAttemptId: str(row.payment_attempt_id),
    captureEventId: str(row.capture_event_id),
    amountMinor: num(row.amount_minor),
    currency: str(row.currency).toUpperCase(),
    settlementState: str(row.settlement_state),
    payoutState: str(row.payout_state),
    issues,
    highestSeverity: (str(row.highest_severity) ||
      maxSeverity(issues)) as SettlementPayoutReconSeverity,
    captureCreatedAt: str(row.capture_created_at),
  };
}

export type SettlementPayoutReconPage = {
  storeId: string;
  items: SettlementPayoutReconRow[];
  limit: number;
  hasMore: boolean;
  nextCursor: { beforeCreatedAt: string; beforeId: string } | null;
  capability: string;
};

export type SettlementPayoutReconSummary = {
  storeId: string;
  byCurrency: Array<{
    currency: string;
    captureCount: number;
    issueCount: number;
    errorCount: number;
    infoCount: number;
  }>;
  issueCounts: Record<string, number>;
  capability: string;
};

export function parseSettlementPayoutReconPage(
  raw: unknown
): SettlementPayoutReconPage {
  const row = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const cursor = row.next_cursor as Record<string, unknown> | null;
  return {
    storeId: str(row.store_id),
    items: itemsRaw.map(parseSettlementPayoutReconRow),
    limit: num(row.limit) || SETTLEMENT_PAYOUT_RECON_DEFAULT_LIMIT,
    hasMore: Boolean(row.has_more),
    nextCursor:
      cursor && cursor.before_created_at && cursor.before_id
        ? {
            beforeCreatedAt: str(cursor.before_created_at),
            beforeId: str(cursor.before_id),
          }
        : null,
    capability: str(row.capability) || SETTLEMENT_PAYOUT_RECONCILIATION_ID,
  };
}

export function parseSettlementPayoutReconSummary(
  raw: unknown
): SettlementPayoutReconSummary {
  const row = (raw ?? {}) as Record<string, unknown>;
  const byCurrencyRaw = Array.isArray(row.by_currency) ? row.by_currency : [];
  const issueCountsRaw =
    row.issue_counts && typeof row.issue_counts === "object"
      ? (row.issue_counts as Record<string, unknown>)
      : {};
  const issueCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(issueCountsRaw)) {
    issueCounts[k] = num(v);
  }
  return {
    storeId: str(row.store_id),
    byCurrency: byCurrencyRaw.map((b) => {
      const bucket = (b ?? {}) as Record<string, unknown>;
      return {
        currency: str(bucket.currency).toUpperCase(),
        captureCount: num(bucket.capture_count),
        issueCount: num(bucket.issue_count),
        errorCount: num(bucket.error_count),
        infoCount: num(bucket.info_count),
      };
    }),
    issueCounts,
    capability: str(row.capability) || SETTLEMENT_PAYOUT_RECONCILIATION_ID,
  };
}

export function mapReconRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) {
    return "You cannot view settlement payout reconciliation for this store.";
  }
  if (m.includes("store_id") || m.includes("store not found")) {
    return "Store is invalid.";
  }
  if (m.includes("limit must")) return "Invalid reconciliation list limit.";
  if (m.includes("pagination cursor")) {
    return "Invalid reconciliation list cursor.";
  }
  if (m.includes("function") && m.includes("does not exist")) {
    return "Settlement payout reconciliation is unavailable until the migration is applied.";
  }
  return message || "Could not load settlement payout reconciliation.";
}

async function rpcJson(
  supabase: AnyClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return { ok: false, message: mapReconRpcError(error.message) };
  }
  return { ok: true, data };
}

export async function fetchMySellerSettlementPayoutReconciliation(
  supabase: AnyClient,
  input: {
    storeId: string;
    limit?: number;
    beforeCreatedAt?: string;
    beforeId?: string;
    issuesOnly?: boolean;
  }
): Promise<
  { ok: true; data: SettlementPayoutReconPage } | { ok: false; message: string }
> {
  const id = validateReconStoreId(input.storeId);
  if (!id.ok) return id;
  const lim = clampReconLimit(input.limit);
  if (!lim.ok) return lim;
  const money = rejectClientReconMoneyFields({
    store_id: input.storeId,
    limit: lim.limit,
    before_created_at: input.beforeCreatedAt,
    before_id: input.beforeId,
    issues_only: input.issuesOnly,
  });
  if (!money.ok) return money;
  if (
    (input.beforeCreatedAt == null) !== (input.beforeId == null) ||
    (input.beforeId != null && !isUuid(input.beforeId))
  ) {
    return { ok: false, message: "Invalid reconciliation list cursor." };
  }

  const res = await rpcJson(supabase, SETTLEMENT_PAYOUT_RECON_RPCS.list, {
    p_store_id: id.storeId,
    p_limit: lim.limit,
    p_before_created_at: input.beforeCreatedAt ?? null,
    p_before_id: input.beforeId ?? null,
    p_issues_only: Boolean(input.issuesOnly),
  });
  if (!res.ok) return res;
  const raw = (res.data ?? {}) as Record<string, unknown>;
  if (!assertNoSensitiveReconFields(raw)) {
    return { ok: false, message: "Reconciliation payload is unsafe." };
  }
  return { ok: true, data: parseSettlementPayoutReconPage(res.data) };
}

export async function fetchMySellerSettlementPayoutReconciliationSummary(
  supabase: AnyClient,
  storeId: string
): Promise<
  | { ok: true; data: SettlementPayoutReconSummary }
  | { ok: false; message: string }
> {
  const id = validateReconStoreId(storeId);
  if (!id.ok) return id;
  const money = rejectClientReconMoneyFields({ store_id: storeId });
  if (!money.ok) return money;

  const res = await rpcJson(supabase, SETTLEMENT_PAYOUT_RECON_RPCS.summary, {
    p_store_id: id.storeId,
  });
  if (!res.ok) return res;
  if (!assertNoSensitiveReconFields(res.data as Record<string, unknown>)) {
    return { ok: false, message: "Reconciliation summary payload is unsafe." };
  }
  return { ok: true, data: parseSettlementPayoutReconSummary(res.data) };
}
