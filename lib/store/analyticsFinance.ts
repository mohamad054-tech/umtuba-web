/**
 * Store Analytics & Finance Foundation V1 — metric definitions, parsers, RPC wrappers.
 *
 * All money uses integer minor units. No floating-point arithmetic on amounts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus, PaymentStatus } from "./types";

type AnyClient = SupabaseClient;

/** Maximum inclusive analytics window (days). */
export const ANALYTICS_MAX_RANGE_DAYS = 366;

/** Default top-product / coupon breakdown limit. */
export const ANALYTICS_DEFAULT_TOP_LIMIT = 10;

export const ANALYTICS_MAX_TOP_LIMIT = 50;

export const ANALYTICS_PERIOD_PRESETS = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
] as const;

export type AnalyticsPeriodKey = (typeof ANALYTICS_PERIOD_PRESETS)[number]["key"];

/** Documented financial metric definitions (Phase 1). */
export const ANALYTICS_METRIC_DEFINITIONS = {
  grossMerchandiseValueMinor: {
    label: "Gross merchandise value",
    kind: "provisional" as const,
    description:
      "Sum of merchandise subtotals (subtotal_minor, pre-discount) for realized paid orders in range. Excludes unpaid, failed, and cancelled/refunded orders.",
  },
  merchandiseSubtotalMinor: {
    label: "Merchandise subtotal",
    kind: "provisional" as const,
    description: "Same as GMV for realized paid orders — catalog line totals before discounts.",
  },
  discountsMinor: {
    label: "Discounts",
    kind: "provisional" as const,
    description:
      "Sum of discount_total_minor on realized paid orders. Coupon/promotion reductions only.",
  },
  shippingChargedMinor: {
    label: "Shipping charged",
    kind: "pass_through" as const,
    description:
      "Sum of shipping_total_minor on realized paid orders. Pass-through to carriers — not seller merchandise revenue.",
  },
  taxesChargedMinor: {
    label: "Taxes charged",
    kind: "pass_through" as const,
    description:
      "Sum of tax_total_minor on realized paid orders. Collected taxes — not seller merchandise revenue.",
  },
  refundsMinor: {
    label: "Refunds",
    kind: "finalized" as const,
    description:
      "Sum of grand_total_minor for orders with authoritative refunded payment/order status in range. V1 models full-order refunds only.",
  },
  netSalesMinor: {
    label: "Net sales (provisional)",
    kind: "provisional" as const,
    description:
      "Realized merchandise subtotal minus discounts minus refunded merchandise value (subtotal − discount on refunded orders). Does not include shipping or taxes as seller revenue.",
  },
  paidOrders: {
    label: "Paid orders",
    kind: "count" as const,
    description: "Orders with payment_status = paid and not cancelled/refunded.",
  },
  unpaidPendingOrders: {
    label: "Unpaid / pending",
    kind: "count" as const,
    description:
      "Orders with payment_status pending or authorized and not cancelled/refunded.",
  },
  cancelledOrders: {
    label: "Cancelled orders",
    kind: "count" as const,
    description: "Orders with status = cancelled.",
  },
  returnedOrders: {
    label: "Returned orders",
    kind: "count" as const,
    description: "Fulfillment lifecycle returned in range (not merchandise revenue).",
  },
  refundedOrders: {
    label: "Refunded orders",
    kind: "count" as const,
    description: "Orders with payment_status or status = refunded.",
  },
} as const;

/** Future finance foundation — not calculated in V1. */
export type FinanceFoundationEntry = {
  status: "not_configured";
  description: string;
};

export type FinanceFoundationModels = {
  platformCommission: FinanceFoundationEntry;
  sellerNetProceeds: FinanceFoundationEntry;
  paymentProcessingFees: FinanceFoundationEntry;
  reserves: FinanceFoundationEntry;
  adjustments: FinanceFoundationEntry;
  settlementPeriods: FinanceFoundationEntry;
  payoutStatus: FinanceFoundationEntry;
};

export const FINANCE_FOUNDATION_PLACEHOLDER: FinanceFoundationModels = {
  platformCommission: {
    status: "not_configured",
    description: "Platform commission is not configured for this store.",
  },
  sellerNetProceeds: {
    status: "not_configured",
    description: "Seller net proceeds are not available until payout rules exist.",
  },
  paymentProcessingFees: {
    status: "not_configured",
    description: "Payment processing fees are not tracked until gateways settle.",
  },
  reserves: {
    status: "not_configured",
    description: "Reserve balances are not configured.",
  },
  adjustments: {
    status: "not_configured",
    description: "Financial adjustments are not configured.",
  },
  settlementPeriods: {
    status: "not_configured",
    description: "Settlement periods are not configured.",
  },
  payoutStatus: {
    status: "not_configured",
    description: "Payout status tracking is not enabled.",
  },
};

export type AnalyticsDateRange = {
  from: string;
  to: string;
  periodKey: AnalyticsPeriodKey;
};

export type AnalyticsSummary = {
  currency: string;
  grossMerchandiseValueMinor: number;
  merchandiseSubtotalMinor: number;
  discountsMinor: number;
  shippingChargedMinor: number;
  taxesChargedMinor: number;
  refundsMinor: number;
  netSalesMinor: number;
  paidOrders: number;
  unpaidPendingOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  refundedOrders: number;
};

export type AnalyticsOrderStatusCount = {
  status: string;
  count: number;
};

export type AnalyticsSalesSeriesPoint = {
  periodStart: string;
  orderCount: number;
  merchandiseSubtotalMinor: number;
  netSalesMinor: number;
};

export type AnalyticsTopProductRow = {
  productId: string;
  title: string;
  quantitySold: number;
  merchandiseSubtotalMinor: number;
};

export type AnalyticsCouponPerformanceRow = {
  couponId: string;
  code: string;
  redemptionCount: number;
  discountMinor: number;
};

export type AnalyticsFulfillmentSummary = {
  pending: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
  refunded: number;
  averageShipToDeliverHours: number | null;
};

export type AnalyticsRefundsReturnsSummary = {
  refundedOrders: number;
  refundsMinor: number;
  returnedOrders: number;
};

export type SellerAnalyticsBundle = {
  range: AnalyticsDateRange;
  summary: AnalyticsSummary;
  orderStatusCounts: AnalyticsOrderStatusCount[];
  salesSeries: AnalyticsSalesSeriesPoint[];
  topProducts: AnalyticsTopProductRow[];
  couponPerformance: AnalyticsCouponPerformanceRow[];
  fulfillmentSummary: AnalyticsFulfillmentSummary;
  refundsReturns: AnalyticsRefundsReturnsSummary;
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  currency: "USD",
  grossMerchandiseValueMinor: 0,
  merchandiseSubtotalMinor: 0,
  discountsMinor: 0,
  shippingChargedMinor: 0,
  taxesChargedMinor: 0,
  refundsMinor: 0,
  netSalesMinor: 0,
  paidOrders: 0,
  unpaidPendingOrders: 0,
  cancelledOrders: 0,
  returnedOrders: 0,
  refundedOrders: 0,
};

/** Realized revenue: paid and not cancelled/refunded. Authoritative order row only (not payment_attempts). */
export function isRealizedPaidOrder(input: {
  paymentStatus: PaymentStatus | string;
  status: OrderStatus | string;
}): boolean {
  return (
    input.paymentStatus === "paid" &&
    input.status !== "cancelled" &&
    input.status !== "refunded"
  );
}

export function isRefundedOrder(input: {
  paymentStatus: PaymentStatus | string;
  status: OrderStatus | string;
}): boolean {
  return input.paymentStatus === "refunded" || input.status === "refunded";
}

export function isUnpaidPendingOrder(input: {
  paymentStatus: PaymentStatus | string;
  status: OrderStatus | string;
}): boolean {
  if (input.status === "cancelled" || isRefundedOrder(input)) return false;
  return input.paymentStatus === "pending" || input.paymentStatus === "authorized";
}

/** Provisional net sales from component totals (integer math). */
export function computeProvisionalNetSalesMinor(input: {
  merchandiseSubtotalMinor: number;
  discountsMinor: number;
  refundedMerchandiseMinor: number;
}): number {
  const sub = Math.max(0, Math.trunc(input.merchandiseSubtotalMinor));
  const disc = Math.max(0, Math.trunc(input.discountsMinor));
  const ref = Math.max(0, Math.trunc(input.refundedMerchandiseMinor));
  return Math.max(0, sub - disc - ref);
}

export function resolveAnalyticsPeriod(
  periodKey: string | null | undefined
): AnalyticsPeriodKey {
  const found = ANALYTICS_PERIOD_PRESETS.find((p) => p.key === periodKey);
  return found?.key ?? "30d";
}

export function buildAnalyticsDateRange(
  periodKey: AnalyticsPeriodKey,
  now: Date = new Date()
): AnalyticsDateRange {
  const preset = ANALYTICS_PERIOD_PRESETS.find((p) => p.key === periodKey)!;
  const to = now.toISOString();
  const fromDate = new Date(now.getTime() - preset.days * 24 * 60 * 60 * 1000);
  return {
    from: fromDate.toISOString(),
    to,
    periodKey,
  };
}

export function validateAnalyticsDateRange(input: {
  from: string;
  to: string;
}): { ok: true } | { ok: false; message: string } {
  const fromMs = Date.parse(input.from);
  const toMs = Date.parse(input.to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return { ok: false, message: "Invalid analytics date range." };
  }
  if (toMs < fromMs) {
    return { ok: false, message: "Analytics end date must be after start date." };
  }
  const days = (toMs - fromMs) / (24 * 60 * 60 * 1000);
  if (days > ANALYTICS_MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `Analytics range cannot exceed ${ANALYTICS_MAX_RANGE_DAYS} days.`,
    };
  }
  return { ok: true };
}

function num(raw: unknown): number {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  let value: bigint | null = null;
  if (typeof raw === "bigint") {
    value = raw;
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    value = BigInt(Math.trunc(raw));
  } else if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) {
    try {
      value = BigInt(raw.trim());
    } catch {
      value = null;
    }
  }
  if (value == null || value < BigInt(0)) return 0;
  if (value > max) return Number.MAX_SAFE_INTEGER;
  return Number(value);
}

function str(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback;
}

export function parseAnalyticsSummary(raw: unknown): AnalyticsSummary {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    currency: str(row.currency, "USD").toUpperCase(),
    grossMerchandiseValueMinor: num(row.gross_merchandise_value_minor),
    merchandiseSubtotalMinor: num(row.merchandise_subtotal_minor),
    discountsMinor: num(row.discounts_minor),
    shippingChargedMinor: num(row.shipping_charged_minor),
    taxesChargedMinor: num(row.taxes_charged_minor),
    refundsMinor: num(row.refunds_minor),
    netSalesMinor: num(row.net_sales_minor),
    paidOrders: num(row.paid_orders),
    unpaidPendingOrders: num(row.unpaid_pending_orders),
    cancelledOrders: num(row.cancelled_orders),
    returnedOrders: num(row.returned_orders),
    refundedOrders: num(row.refunded_orders),
  };
}

export function parseAnalyticsOrderStatusCounts(
  raw: unknown
): AnalyticsOrderStatusCount[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      status: str(row.status, "unknown"),
      count: num(row.count),
    };
  });
}

export function parseAnalyticsSalesSeries(raw: unknown): AnalyticsSalesSeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      periodStart: str(row.period_start),
      orderCount: num(row.order_count),
      merchandiseSubtotalMinor: num(row.merchandise_subtotal_minor),
      netSalesMinor: num(row.net_sales_minor),
    };
  });
}

export function parseAnalyticsTopProducts(raw: unknown): AnalyticsTopProductRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      productId: str(row.product_id),
      title: str(row.title, "Product"),
      quantitySold: num(row.quantity_sold),
      merchandiseSubtotalMinor: num(row.merchandise_subtotal_minor),
    };
  });
}

export function parseAnalyticsCouponPerformance(
  raw: unknown
): AnalyticsCouponPerformanceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      couponId: str(row.coupon_id),
      code: str(row.code),
      redemptionCount: num(row.redemption_count),
      discountMinor: num(row.discount_minor),
    };
  });
}

export function parseAnalyticsFulfillmentSummary(
  raw: unknown
): AnalyticsFulfillmentSummary {
  const row = (raw ?? {}) as Record<string, unknown>;
  const avg = row.average_ship_to_deliver_hours;
  return {
    pending: num(row.pending),
    preparing: num(row.preparing),
    shipped: num(row.shipped),
    delivered: num(row.delivered),
    cancelled: num(row.cancelled),
    returned: num(row.returned),
    refunded: num(row.refunded),
    averageShipToDeliverHours:
      avg == null || avg === "" ? null : Number.isFinite(Number(avg)) ? Number(avg) : null,
  };
}

export function parseAnalyticsRefundsReturns(
  raw: unknown
): AnalyticsRefundsReturnsSummary {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    refundedOrders: num(row.refunded_orders),
    refundsMinor: num(row.refunds_minor),
    returnedOrders: num(row.returned_orders),
  };
}

export function mapAnalyticsRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) return "You cannot view analytics for this store.";
  if (m.includes("date range")) return "Invalid analytics date range.";
  if (m.includes("single currency")) {
    return "Store analytics supports one order currency per selected period. Narrow the date range.";
  }
  if (m.includes("function") && m.includes("does not exist")) {
    return "Store analytics is unavailable until the analytics migration is applied.";
  }
  return message || "Could not load store analytics.";
}

export function isAnalyticsUnavailableMessage(message: string): boolean {
  return message.toLowerCase().includes("unavailable until the analytics migration");
}

async function rpcJson(
  supabase: AnyClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return { ok: false, message: mapAnalyticsRpcError(error.message) };
  }
  return { ok: true, data };
}

async function rpcRows(
  supabase: AnyClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true; rows: unknown[] } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return { ok: false, message: mapAnalyticsRpcError(error.message) };
  }
  return { ok: true, rows: (data ?? []) as unknown[] };
}

export async function getSellerAnalyticsBundle(
  supabase: AnyClient,
  storeId: string,
  range: AnalyticsDateRange,
  topLimit = ANALYTICS_DEFAULT_TOP_LIMIT
): Promise<
  | { ok: true; bundle: SellerAnalyticsBundle }
  | { ok: false; message: string; unavailable?: boolean }
> {
  const validated = validateAnalyticsDateRange({ from: range.from, to: range.to });
  if (!validated.ok) {
    return { ok: false, message: validated.message };
  }
  const limit = Math.min(
    ANALYTICS_MAX_TOP_LIMIT,
    Math.max(1, Math.trunc(topLimit))
  );
  const base = {
    p_store_id: storeId,
    p_from: range.from,
    p_to: range.to,
  };

  const summaryResult = await rpcJson(supabase, "seller_analytics_summary", base);
  if (!summaryResult.ok) {
    return {
      ok: false,
      message: summaryResult.message,
      unavailable: isAnalyticsUnavailableMessage(summaryResult.message),
    };
  }

  const [
    statusResult,
    seriesResult,
    topResult,
    couponResult,
    fulfillmentResult,
    refundsResult,
  ] = await Promise.all([
    rpcRows(supabase, "seller_analytics_order_status_counts", base),
    rpcRows(supabase, "seller_analytics_sales_series", base),
    rpcRows(supabase, "seller_analytics_top_products", {
      ...base,
      p_limit: limit,
    }),
    rpcRows(supabase, "seller_analytics_coupon_performance", {
      ...base,
      p_limit: limit,
    }),
    rpcJson(supabase, "seller_analytics_fulfillment_summary", base),
    rpcJson(supabase, "seller_analytics_refunds_returns", base),
  ]);

  for (const r of [
    statusResult,
    seriesResult,
    topResult,
    couponResult,
    fulfillmentResult,
    refundsResult,
  ]) {
    if (!r.ok) {
      return {
        ok: false,
        message: r.message,
        unavailable: isAnalyticsUnavailableMessage(r.message),
      };
    }
  }

  return {
    ok: true,
    bundle: {
      range,
      summary: parseAnalyticsSummary(summaryResult.data),
      orderStatusCounts: parseAnalyticsOrderStatusCounts(
        (statusResult as { ok: true; rows: unknown[] }).rows
      ),
      salesSeries: parseAnalyticsSalesSeries(
        (seriesResult as { ok: true; rows: unknown[] }).rows
      ),
      topProducts: parseAnalyticsTopProducts(
        (topResult as { ok: true; rows: unknown[] }).rows
      ),
      couponPerformance: parseAnalyticsCouponPerformance(
        (couponResult as { ok: true; rows: unknown[] }).rows
      ),
      fulfillmentSummary: parseAnalyticsFulfillmentSummary(
        (fulfillmentResult as { ok: true; data: unknown }).data
      ),
      refundsReturns: parseAnalyticsRefundsReturns(
        (refundsResult as { ok: true; data: unknown }).data
      ),
    },
  };
}

export function emptyAnalyticsBundle(range: AnalyticsDateRange): SellerAnalyticsBundle {
  return {
    range,
    summary: { ...EMPTY_SUMMARY },
    orderStatusCounts: [],
    salesSeries: [],
    topProducts: [],
    couponPerformance: [],
    fulfillmentSummary: {
      pending: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      refunded: 0,
      averageShipToDeliverHours: null,
    },
    refundsReturns: {
      refundedOrders: 0,
      refundsMinor: 0,
      returnedOrders: 0,
    },
  };
}
