/**
 * Seller Payout History Surface V1 — pure view-model over Seller Payout Read Model.
 * No bank rails, no writes, no client-trusted money, no sensitive ledger fields.
 */

import {
  SELLER_PAYOUT_READ_MODEL_ID,
  SELLER_PAYOUT_STATUS,
  type SellerPayoutListItem,
  type SellerPayoutListPage,
  type SellerPayoutStatus,
} from "./sellerPayoutReadModel";
import { formatTrustedMoney } from "./tradingContracts";

export const SELLER_PAYOUT_HISTORY_SURFACE_ID =
  "commerce.settlement.seller_payout_history_surface_v1" as const;

/** Page size for the seller store section (bounded; RPC max remains 50). */
export const SELLER_PAYOUT_HISTORY_PAGE_SIZE = 10 as const;

export const SELLER_PAYOUT_HISTORY_STATUS_LABELS: Record<
  SellerPayoutStatus,
  string
> = {
  available: "Available",
  in_transit: "In transit",
  completed: "Completed",
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

export type SellerPayoutHistoryRowView = {
  key: string;
  orderId: string;
  amountLabel: string;
  currency: string;
  amountMinor: number;
  status: SellerPayoutStatus;
  statusLabel: string;
  captureAtLabel: string;
  lastActivityAtLabel: string | null;
  failNote: string | null;
};

export type SellerPayoutHistorySurfaceView = {
  capability: typeof SELLER_PAYOUT_HISTORY_SURFACE_ID;
  source: typeof SELLER_PAYOUT_READ_MODEL_ID;
  storeId: string;
  state: "unavailable" | "empty" | "ready";
  message: string | null;
  rows: SellerPayoutHistoryRowView[];
  hasMore: boolean;
  nextCursor: { beforeCreatedAt: string; beforeId: string } | null;
  bankRailsEnabled: false;
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

export function normalizeSellerPayoutHistoryStatus(
  status: string | null | undefined
): SellerPayoutStatus {
  if (
    status === "in_transit" ||
    status === "completed" ||
    status === "available"
  ) {
    return status;
  }
  return "available";
}

export function sellerPayoutHistoryStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeSellerPayoutHistoryStatus(status);
  return SELLER_PAYOUT_HISTORY_STATUS_LABELS[normalized];
}

/** Newest-first: captureCreatedAt desc, captureEventId desc. */
export function compareSellerPayoutHistoryNewestFirst(
  a: Pick<SellerPayoutListItem, "captureCreatedAt" | "captureEventId">,
  b: Pick<SellerPayoutListItem, "captureCreatedAt" | "captureEventId">
): number {
  if (a.captureCreatedAt !== b.captureCreatedAt) {
    return a.captureCreatedAt < b.captureCreatedAt ? 1 : -1;
  }
  if (a.captureEventId === b.captureEventId) return 0;
  return a.captureEventId < b.captureEventId ? 1 : -1;
}

export function projectSellerPayoutHistoryRow(
  item: SellerPayoutListItem
): SellerPayoutHistoryRowView {
  const status = normalizeSellerPayoutHistoryStatus(String(item.payoutStatus));
  const failNote =
    item.failCount > 0
      ? item.lastPayoutAction === "fail"
        ? `Prior booking failed (${item.failCount}). Funds remain available until a new booking.`
        : `Recorded fail events: ${item.failCount}. Funds return to available after fail.`
      : null;

  return {
    key: item.captureEventId || item.orderId,
    orderId: item.orderId,
    amountLabel: formatTrustedMoney(item.amountMinor, item.currency),
    currency: item.currency.toUpperCase(),
    amountMinor: item.amountMinor,
    status,
    statusLabel: SELLER_PAYOUT_HISTORY_STATUS_LABELS[status],
    captureAtLabel: formatTimestamp(item.captureCreatedAt) ?? "—",
    lastActivityAtLabel: formatTimestamp(item.lastPayoutAt),
    failNote,
  };
}

export function historyRowContainsSensitiveFields(
  row: SellerPayoutHistoryRowView
): boolean {
  const blob = JSON.stringify(row);
  return SENSITIVE_RENDER_PATTERNS.some((re) => re.test(blob));
}

export function assertHistoryPageBelongsToStore(
  page: SellerPayoutListPage,
  storeId: string
): { ok: true } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "Store is invalid." };
  }
  if (page.storeId !== storeId) {
    return {
      ok: false,
      message: "Payout history does not belong to this store.",
    };
  }
  return { ok: true };
}

export function parseSellerPayoutHistoryCursor(input: {
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
    return { ok: false, message: "Invalid payout history cursor." };
  }
  if (!isUuid(id)) {
    return { ok: false, message: "Invalid payout history cursor." };
  }
  if (Number.isNaN(Date.parse(at))) {
    return { ok: false, message: "Invalid payout history cursor." };
  }
  return { ok: true, cursor: { beforeCreatedAt: at, beforeId: id } };
}

export function buildSellerPayoutHistoryLoadMoreHref(input: {
  basePath: string;
  periodKey?: string | null;
  cursor: { beforeCreatedAt: string; beforeId: string };
}): string {
  const params = new URLSearchParams();
  if (input.periodKey) {
    params.set("period", input.periodKey);
  }
  params.set("payout_before", input.cursor.beforeCreatedAt);
  params.set("payout_before_id", input.cursor.beforeId);
  const q = params.toString();
  return q ? `${input.basePath}?${q}` : input.basePath;
}

/**
 * Fail-closed surface builder. Never trusts client money; never invents totals.
 */
export function buildSellerPayoutHistorySurface(input: {
  storeId: string;
  page: SellerPayoutListPage | null;
  errorMessage?: string | null;
  unavailable?: boolean;
}): SellerPayoutHistorySurfaceView {
  const base = {
    capability: SELLER_PAYOUT_HISTORY_SURFACE_ID,
    source: SELLER_PAYOUT_READ_MODEL_ID,
    storeId: input.storeId,
    bankRailsEnabled: false as const,
  };

  if (input.unavailable || !input.page) {
    return {
      ...base,
      state: "unavailable",
      message:
        input.errorMessage?.trim() ||
        "Payout history is unavailable until trusted payout reads succeed.",
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  const ownership = assertHistoryPageBelongsToStore(input.page, input.storeId);
  if (!ownership.ok) {
    return {
      ...base,
      state: "unavailable",
      message: ownership.message,
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  const sorted = [...input.page.items].sort(
    compareSellerPayoutHistoryNewestFirst
  );
  const rows = sorted.map(projectSellerPayoutHistoryRow);
  if (rows.some(historyRowContainsSensitiveFields)) {
    return {
      ...base,
      state: "unavailable",
      message: "Payout history payload is unsafe.",
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  if (rows.length === 0) {
    return {
      ...base,
      state: "empty",
      message:
        "No released payouts yet. History appears after settlement release.",
      rows: [],
      hasMore: false,
      nextCursor: null,
    };
  }

  return {
    ...base,
    state: "ready",
    message: null,
    rows,
    hasMore: Boolean(input.page.hasMore && input.page.nextCursor),
    nextCursor: input.page.nextCursor,
  };
}

export function sellerPayoutHistoryVocabulary(): readonly SellerPayoutStatus[] {
  return SELLER_PAYOUT_STATUS;
}
