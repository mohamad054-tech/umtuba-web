/**
 * Promotions Foundation V1 — pure coupon/promotion domain rules.
 * Money uses integer minor units only. No payment gateways.
 */

import { computeCouponDiscountMinor } from "./pricing";

export const PROMOTION_DISCOUNT_TYPES = [
  "percent",
  "fixed",
  "free_shipping",
] as const;
export type PromotionDiscountType = (typeof PROMOTION_DISCOUNT_TYPES)[number];

export const PROMOTION_STATUSES = ["active", "disabled", "expired"] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export type PromotionCouponInput = {
  code: string;
  status: PromotionStatus;
  discountType: PromotionDiscountType;
  percentBps?: number | null;
  fixedAmountMinor?: number | null;
  currency?: string | null;
  minSubtotalMinor: number;
  maxDiscountMinor?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;
  usageCount: number;
  storeId?: string | null;
  /** Empty productIds = all products in store scope. */
  productIds?: readonly string[];
  /** Empty categoryIds = all categories in scope. */
  categoryIds?: readonly string[];
  /** Empty regions = all countries/regions in scope. */
  regions?: readonly { countryCode: string; region?: string | null }[];
};

export type PromotionEligibilityContext = {
  storeId: string;
  buyerId: string;
  currency: string;
  subtotalMinor: number;
  productIds: readonly string[];
  categoryIds: readonly string[];
  countryCode?: string | null;
  region?: string | null;
  userRedemptionCount: number;
  now?: Date;
};

export type PromotionValidationResult =
  | {
      ok: true;
      discountMinor: number;
      freeShipping: boolean;
      snapshot: Record<string, unknown>;
    }
  | { ok: false; message: string };

export function isPromotionDiscountType(
  value: unknown
): value is PromotionDiscountType {
  return (
    typeof value === "string" &&
    (PROMOTION_DISCOUNT_TYPES as readonly string[]).includes(value)
  );
}

export function isPromotionStatus(value: unknown): value is PromotionStatus {
  return (
    typeof value === "string" &&
    (PROMOTION_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizePromotionCode(code: string): string {
  return code.trim().toUpperCase();
}

export function validatePromotionCouponDefinition(
  input: Omit<
    PromotionCouponInput,
    "usageCount" | "productIds" | "categoryIds" | "regions"
  >
): { ok: true } | { ok: false; message: string } {
  const code = normalizePromotionCode(input.code);
  if (code.length < 2 || code.length > 40) {
    return { ok: false, message: "Coupon code must be 2–40 characters." };
  }
  if (!isPromotionStatus(input.status)) {
    return { ok: false, message: "Invalid promotion status." };
  }
  if (!isPromotionDiscountType(input.discountType)) {
    return { ok: false, message: "Invalid discount type." };
  }
  if (!Number.isInteger(input.minSubtotalMinor) || input.minSubtotalMinor < 0) {
    return { ok: false, message: "Minimum subtotal must be a non-negative integer." };
  }
  if (input.discountType === "percent") {
    const bps = input.percentBps ?? 0;
    if (!Number.isInteger(bps) || bps < 1 || bps > 10000) {
      return { ok: false, message: "Percent discount must be 1–10000 bps." };
    }
  }
  if (input.discountType === "fixed") {
    const amount = input.fixedAmountMinor ?? -1;
    const currency = (input.currency ?? "").trim().toUpperCase();
    if (!Number.isInteger(amount) || amount < 0) {
      return { ok: false, message: "Fixed discount must be a non-negative integer." };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { ok: false, message: "Fixed discount requires a valid currency." };
    }
  }
  if (
    input.maxDiscountMinor != null &&
    (!Number.isInteger(input.maxDiscountMinor) || input.maxDiscountMinor < 0)
  ) {
    return { ok: false, message: "Max discount must be a non-negative integer." };
  }
  if (
    input.totalUsageLimit != null &&
    (!Number.isInteger(input.totalUsageLimit) || input.totalUsageLimit < 1)
  ) {
    return { ok: false, message: "Total usage limit must be at least 1." };
  }
  if (
    input.perUserUsageLimit != null &&
    (!Number.isInteger(input.perUserUsageLimit) || input.perUserUsageLimit < 1)
  ) {
    return { ok: false, message: "Per-user usage limit must be at least 1." };
  }
  if (input.startsAt && input.endsAt) {
    if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      return { ok: false, message: "Promotion end must be after start." };
    }
  }
  return { ok: true };
}

function regionMatches(
  couponRegions: readonly { countryCode: string; region?: string | null }[],
  countryCode?: string | null,
  region?: string | null
): boolean {
  if (couponRegions.length === 0) return true;
  const cc = (countryCode ?? "").trim().toUpperCase();
  const rg = (region ?? "").trim();
  if (!/^[A-Z]{2}$/.test(cc)) return false;
  return couponRegions.some((r) => {
    if (r.countryCode.toUpperCase() !== cc) return false;
    if (r.region == null || r.region.trim() === "") return true;
    return r.region.trim().toLowerCase() === rg.toLowerCase();
  });
}

function targetingMatches(
  requiredIds: readonly string[],
  cartIds: readonly string[]
): boolean {
  // Empty targeting dimension = no restriction on that dimension.
  if (requiredIds.length === 0) return true;
  const set = new Set(cartIds);
  return requiredIds.some((id) => set.has(id));
}

/** When multiple targeting dimensions are configured, ALL must match (AND). */
export function describePromotionTargetingSemantics(): string {
  return "Empty product/category/region lists mean no restriction. Configured lists require at least one cart match per dimension; all configured dimensions must pass.";
}

export function validatePromotionEligibility(input: {
  coupon: PromotionCouponInput;
  context: PromotionEligibilityContext;
}): PromotionValidationResult {
  const { coupon, context } = input;
  const now = input.context.now ?? new Date();

  if (coupon.storeId != null && coupon.storeId !== context.storeId) {
    return { ok: false, message: "Coupon is not valid for this store." };
  }
  if (coupon.status !== "active") {
    return { ok: false, message: "Coupon is not active." };
  }
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { ok: false, message: "Coupon is not active yet." };
  }
  if (coupon.endsAt && new Date(coupon.endsAt) <= now) {
    return { ok: false, message: "Coupon has expired." };
  }
  if (context.subtotalMinor < coupon.minSubtotalMinor) {
    return { ok: false, message: "Cart does not meet coupon minimum." };
  }
  if (
    coupon.discountType === "fixed" &&
    coupon.currency &&
    coupon.currency.toUpperCase() !== context.currency.toUpperCase()
  ) {
    return { ok: false, message: "Coupon currency mismatch." };
  }
  if (
    coupon.totalUsageLimit != null &&
    coupon.usageCount >= coupon.totalUsageLimit
  ) {
    return { ok: false, message: "Coupon usage limit reached." };
  }
  if (
    coupon.perUserUsageLimit != null &&
    context.userRedemptionCount >= coupon.perUserUsageLimit
  ) {
    return { ok: false, message: "Coupon per-user limit reached." };
  }
  if (
    !targetingMatches(coupon.productIds ?? [], context.productIds)
  ) {
    return { ok: false, message: "Coupon does not apply to cart products." };
  }
  if (
    !targetingMatches(coupon.categoryIds ?? [], context.categoryIds)
  ) {
    return { ok: false, message: "Coupon does not apply to cart categories." };
  }
  if (
    !regionMatches(coupon.regions ?? [], context.countryCode, context.region)
  ) {
    return { ok: false, message: "Coupon is not available in this region." };
  }

  const freeShipping = coupon.discountType === "free_shipping";
  let discountMinor = 0;
  if (coupon.discountType === "percent" || coupon.discountType === "fixed") {
    discountMinor = computeCouponDiscountMinor({
      discountType: coupon.discountType,
      percentBps: coupon.percentBps,
      fixedAmountMinor: coupon.fixedAmountMinor,
      subtotalMinor: context.subtotalMinor,
      maxDiscountMinor: coupon.maxDiscountMinor,
    });
  }

  return {
    ok: true,
    discountMinor,
    freeShipping,
    snapshot: {
      code: normalizePromotionCode(coupon.code),
      discount_type: coupon.discountType,
      discount_minor: discountMinor,
      free_shipping: freeShipping,
      percent_bps: coupon.percentBps ?? null,
      fixed_amount_minor: coupon.fixedAmountMinor ?? null,
      currency: coupon.currency ?? context.currency,
      store_id: coupon.storeId ?? null,
      min_subtotal_minor: coupon.minSubtotalMinor,
      max_discount_minor: coupon.maxDiscountMinor ?? null,
    },
  };
}

export function applyFreeShippingToFee(input: {
  shippingFeeMinor: number;
  freeShipping: boolean;
}): number {
  if (!input.freeShipping) return Math.max(0, Math.trunc(input.shippingFeeMinor));
  return 0;
}

export function mapPromotionRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("coupon not found")) return "Coupon not found.";
  if (m.includes("not active")) return "Coupon is not active.";
  if (m.includes("expired")) return "Coupon has expired.";
  if (m.includes("minimum")) return "Cart does not meet coupon minimum.";
  if (m.includes("usage limit")) return "Coupon usage limit reached.";
  if (m.includes("per-user")) return "Coupon per-user limit reached.";
  if (m.includes("currency mismatch")) return "Coupon currency mismatch.";
  if (m.includes("does not apply")) return "Coupon does not apply to this cart.";
  if (m.includes("not authorized")) return "You cannot manage promotions for this store.";
  return message || "Promotion request failed.";
}
