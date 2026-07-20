/**
 * Store Admin UI helpers — formatting and admin form normalization.
 */

import {
  FULFILLMENT_LIFECYCLE_LABELS,
  canTransitionFulfillmentLifecycle,
  type FulfillmentLifecycleStage,
} from "./fulfillmentRules";
import {
  isPromotionDiscountType,
  isPromotionStatus,
  validatePromotionCouponDefinition,
} from "./promotionRules";
import { isShippingServiceType } from "./shipping";
import type { StoreCouponRow } from "./promotionsFulfillment";

export type FulfillmentDashboardCounts = {
  pending: number;
  confirmed: number;
  preparing: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
  refunded: number;
  total: number;
};

export type CouponTargetingSummary = {
  couponId: string;
  productCount: number;
  categoryCount: number;
  regionCount: number;
  storeWide: boolean;
};

export const EMPTY_FULFILLMENT_DASHBOARD_COUNTS: FulfillmentDashboardCounts = {
  pending: 0,
  confirmed: 0,
  preparing: 0,
  packed: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
  returned: 0,
  refunded: 0,
  total: 0,
};

export function parseFulfillmentDashboardCounts(
  raw: unknown
): FulfillmentDashboardCounts {
  const row = (raw ?? {}) as Record<string, unknown>;
  const num = (key: keyof FulfillmentDashboardCounts) => {
    const v = Number(row[key] ?? 0);
    return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0;
  };
  return {
    pending: num("pending"),
    confirmed: num("confirmed"),
    preparing: num("preparing"),
    packed: num("packed"),
    shipped: num("shipped"),
    delivered: num("delivered"),
    cancelled: num("cancelled"),
    returned: num("returned"),
    refunded: num("refunded"),
    total: num("total"),
  };
}

export function remainingCouponUsage(coupon: StoreCouponRow): number | null {
  if (coupon.total_usage_limit == null) return null;
  return Math.max(0, coupon.total_usage_limit - coupon.usage_count);
}

export function formatCouponType(discountType: string): string {
  switch (discountType) {
    case "percent":
      return "Percentage";
    case "fixed":
      return "Fixed amount";
    case "free_shipping":
      return "Free shipping";
    default:
      return discountType;
  }
}

export function formatCouponDiscountSummary(coupon: StoreCouponRow): string {
  if (coupon.discount_type === "percent") {
    const pct = ((coupon.percent_bps ?? 0) / 100).toFixed(
      (coupon.percent_bps ?? 0) % 100 === 0 ? 0 : 2
    );
    const cap =
      coupon.max_discount_minor != null
        ? ` · max ${coupon.max_discount_minor} minor`
        : "";
    return `${pct}% off${cap}`;
  }
  if (coupon.discount_type === "fixed") {
    return `${coupon.fixed_amount_minor ?? 0} ${coupon.currency ?? ""}`.trim();
  }
  if (coupon.discount_type === "free_shipping") {
    return "Waives shipping fee";
  }
  return "—";
}

export function formatCouponCampaignWindow(coupon: StoreCouponRow): string {
  const start = coupon.starts_at
    ? new Date(coupon.starts_at).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : "Open start";
  const end = coupon.ends_at
    ? new Date(coupon.ends_at).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : "No end";
  return `${start} → ${end}`;
}

export function formatCouponUsageStats(coupon: StoreCouponRow): string {
  const remaining = remainingCouponUsage(coupon);
  const total =
    coupon.total_usage_limit == null
      ? "unlimited"
      : String(coupon.total_usage_limit);
  const left = remaining == null ? "unlimited left" : `${remaining} left`;
  const perUser =
    coupon.per_user_usage_limit == null
      ? "no per-user cap"
      : `${coupon.per_user_usage_limit}/user`;
  return `${coupon.usage_count} used · ${left} of ${total} · ${perUser}`;
}

export function formatCouponTargetingSummary(
  summary: CouponTargetingSummary | null | undefined
): string {
  if (!summary || summary.storeWide) {
    return "Store-wide (no product/category/region limits)";
  }
  const parts: string[] = [];
  if (summary.productCount > 0) {
    parts.push(`${summary.productCount} product(s)`);
  }
  if (summary.categoryCount > 0) {
    parts.push(`${summary.categoryCount} categor${summary.categoryCount === 1 ? "y" : "ies"}`);
  }
  if (summary.regionCount > 0) {
    parts.push(`${summary.regionCount} region(s)`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Store-wide";
}

export function formatCountryCodes(codes: string[] | null | undefined): string {
  if (!codes || codes.length === 0) return "No countries";
  return codes.map((c) => c.toUpperCase()).join(", ");
}

export function dashboardCardLabel(
  key: keyof Omit<FulfillmentDashboardCounts, "total" | "confirmed" | "packed">
): string {
  if (key === "preparing") return FULFILLMENT_LIFECYCLE_LABELS.preparing;
  if (key === "shipped") return "Shipped";
  return FULFILLMENT_LIFECYCLE_LABELS[key];
}

/**
 * Cards shown on the seller store dashboard (quick nav).
 * `orderStatus` maps to coarse order list filters where a close match exists.
 */
export const SELLER_DASHBOARD_FULFILLMENT_CARDS = [
  { key: "pending", label: "Pending", orderStatus: "pending" },
  { key: "preparing", label: "Preparing", orderStatus: "processing" },
  { key: "shipped", label: "Shipped", orderStatus: "shipped" },
  { key: "delivered", label: "Delivered", orderStatus: "delivered" },
  { key: "cancelled", label: "Cancelled", orderStatus: "cancelled" },
  { key: "returned", label: "Returned", orderStatus: null },
  { key: "refunded", label: "Refunded", orderStatus: "refunded" },
] as const;

export function sellerOrdersHrefForDashboardCard(
  card: (typeof SELLER_DASHBOARD_FULFILLMENT_CARDS)[number],
  sellerOrdersBase: string
): string {
  if (!card.orderStatus) return sellerOrdersBase;
  return `${sellerOrdersBase}?status=${card.orderStatus}`;
}

export function normalizeDatetimeLocalForRpc(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parseOptionalPositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return Number.NaN;
  return n;
}

export function parseNonNegativeInt(raw: string, fallback = 0): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return Number.NaN;
  return n;
}

export function parseSortPriority(raw: string): number | null {
  const trimmed = raw.trim();
  const n = trimmed ? Number(trimmed) : 100;
  if (!Number.isInteger(n) || n < 0 || n > 100_000) return null;
  return n;
}

export function isValidShippingCurrencyCode(raw: string): boolean {
  return /^[A-Z]{3}$/.test(raw.trim().toUpperCase());
}

export type CouponAdminFormFields = {
  storeId: string;
  couponId: string | null;
  code: string;
  status: string;
  discountType: string;
  percentBpsRaw: string;
  fixedAmountRaw: string;
  currency: string;
  minSubtotalRaw: string;
  maxDiscountRaw: string;
  startsAtRaw: string;
  endsAtRaw: string;
  totalUsageLimitRaw: string;
  perUserUsageLimitRaw: string;
  promotionName: string;
  promotionDescription: string;
};

export function parseCouponAdminFormFields(
  formData: FormData
): CouponAdminFormFields {
  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    storeId: str("store_id"),
    couponId: str("coupon_id") || null,
    code: str("code"),
    status: str("status") || "active",
    discountType: str("discount_type"),
    percentBpsRaw: str("percent_bps"),
    fixedAmountRaw: str("fixed_amount_minor"),
    currency: str("currency"),
    minSubtotalRaw: str("min_subtotal_minor"),
    maxDiscountRaw: str("max_discount_minor"),
    startsAtRaw: str("starts_at"),
    endsAtRaw: str("ends_at"),
    totalUsageLimitRaw: str("total_usage_limit"),
    perUserUsageLimitRaw: str("per_user_usage_limit"),
    promotionName: str("promotion_name"),
    promotionDescription: str("promotion_description"),
  };
}

export function validateAndBuildCouponAdminRpcPayload(
  fields: CouponAdminFormFields
): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } {
  if (!fields.storeId) {
    return { ok: false, message: "Store id is required." };
  }
  if (!isPromotionDiscountType(fields.discountType)) {
    return { ok: false, message: "Invalid discount type." };
  }
  if (!isPromotionStatus(fields.status)) {
    return { ok: false, message: "Invalid coupon status." };
  }

  const minSubtotalMinor = parseNonNegativeInt(fields.minSubtotalRaw, 0);
  if (Number.isNaN(minSubtotalMinor)) {
    return { ok: false, message: "Minimum subtotal must be a non-negative integer." };
  }

  const totalUsageLimit = parseOptionalPositiveInt(fields.totalUsageLimitRaw);
  if (Number.isNaN(totalUsageLimit)) {
    return { ok: false, message: "Total usage limit must be at least 1." };
  }
  const perUserUsageLimit = parseOptionalPositiveInt(fields.perUserUsageLimitRaw);
  if (Number.isNaN(perUserUsageLimit)) {
    return { ok: false, message: "Per-user usage limit must be at least 1." };
  }

  const startsAt = normalizeDatetimeLocalForRpc(fields.startsAtRaw);
  const endsAt = normalizeDatetimeLocalForRpc(fields.endsAtRaw);
  if (fields.startsAtRaw.trim() && !startsAt) {
    return { ok: false, message: "Invalid promotion start date." };
  }
  if (fields.endsAtRaw.trim() && !endsAt) {
    return { ok: false, message: "Invalid promotion end date." };
  }

  const percentBps =
    fields.discountType === "percent" && fields.percentBpsRaw.trim()
      ? Number(fields.percentBpsRaw)
      : null;
  const fixedAmountMinor =
    fields.discountType === "fixed" && fields.fixedAmountRaw.trim()
      ? Number(fields.fixedAmountRaw)
      : fields.discountType === "fixed"
        ? Number(fields.fixedAmountRaw || "0")
        : null;
  const maxDiscountMinor =
    fields.discountType === "percent" && fields.maxDiscountRaw.trim()
      ? Number(fields.maxDiscountRaw)
      : null;

  const definition = validatePromotionCouponDefinition({
    code: fields.code,
    status: fields.status,
    discountType: fields.discountType,
    percentBps,
    fixedAmountMinor,
    currency: fields.currency || null,
    minSubtotalMinor,
    maxDiscountMinor,
    startsAt,
    endsAt,
    totalUsageLimit,
    perUserUsageLimit,
  });
  if (!definition.ok) {
    return definition;
  }

  return {
    ok: true,
    payload: {
      p_store_id: fields.storeId,
      p_coupon_id: fields.couponId,
      p_code: fields.code.trim(),
      p_discount_type: fields.discountType,
      p_status: fields.status,
      p_percent_bps: fields.discountType === "percent" ? percentBps : null,
      p_fixed_amount_minor:
        fields.discountType === "fixed" ? fixedAmountMinor : null,
      p_currency:
        fields.discountType === "fixed"
          ? (fields.currency || "").trim().toUpperCase() || null
          : null,
      p_min_subtotal_minor: minSubtotalMinor,
      p_max_discount_minor:
        fields.discountType === "percent" ? maxDiscountMinor : null,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_total_usage_limit: totalUsageLimit,
      p_per_user_usage_limit: perUserUsageLimit,
      p_promotion_name: fields.promotionName.trim() || null,
      p_promotion_description: fields.promotionDescription.trim() || null,
    },
  };
}

export function sortFulfillmentEventsChronologically(
  events: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return [...events].sort((a, b) => {
    const atA = new Date(String(a.created_at ?? "")).getTime();
    const atB = new Date(String(b.created_at ?? "")).getTime();
    if (Number.isNaN(atA) && Number.isNaN(atB)) return 0;
    if (Number.isNaN(atA)) return 1;
    if (Number.isNaN(atB)) return -1;
    return atA - atB;
  });
}

export function isAllowedFulfillmentTransitionOption(
  current: FulfillmentLifecycleStage,
  target: string
): target is FulfillmentLifecycleStage {
  return (
    typeof target === "string" &&
    target.length > 0 &&
    canTransitionFulfillmentLifecycle(
      current,
      target as FulfillmentLifecycleStage
    )
  );
}

export function validateShippingRateFormInput(input: {
  serviceType: string;
  feeMinorRaw: string;
  currency: string;
}): { ok: true; feeMinor: number; currency: string; serviceType: string } | { ok: false; message: string } {
  const feeMinor = parseNonNegativeInt(input.feeMinorRaw, Number.NaN);
  if (Number.isNaN(feeMinor)) {
    return { ok: false, message: "Fee must be a non-negative integer." };
  }
  const currency = input.currency.trim().toUpperCase();
  if (!isValidShippingCurrencyCode(currency)) {
    return { ok: false, message: "Shipping rate currency is invalid." };
  }
  if (!isShippingServiceType(input.serviceType)) {
    return { ok: false, message: "Invalid shipping service type." };
  }
  return { ok: true, feeMinor, currency, serviceType: input.serviceType };
}
