/**
 * UMTUBA Store purchase UM Points — earn + reversal foundation.
 *
 * Authoritative rule: every $1 USD of ELIGIBLE PRODUCT SPEND = 1 UM Point.
 * Rounding is FLOOR. Shipping, tax/VAT, tips, gift-card value, and coupon
 * amounts themselves never earn. Discounts reduce eligible spend.
 *
 * Points are awarded only after a successfully PAID / CAPTURED purchase.
 * This module is the server-side formula. Never trust client points_delta.
 *
 * Existing `um_point_balances` remains the unified customer wallet.
 * This module does not create a competing balance.
 */

export const UM_POINTS_PER_USD = 1;
export const STORE_UM_POINTS_CANONICAL_CURRENCY = "USD";

export const STORE_UM_POINTS_EVENT_TYPES = [
  "PURCHASE_EARN",
  "REFUND_REVERSAL",
  "PARTIAL_REFUND_REVERSAL",
  "ADMIN_ADJUSTMENT",
] as const;
export type StoreUmPointsEventType = (typeof STORE_UM_POINTS_EVENT_TYPES)[number];

/** Payment statuses that may award purchase points. */
export const STORE_UM_POINTS_PAID_STATUSES = ["paid", "captured"] as const;
export type StoreUmPointsPaidStatus =
  (typeof STORE_UM_POINTS_PAID_STATUSES)[number];

export const STORE_UM_POINTS_NON_EARNING_PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "failed",
  "cancelled",
  "canceled",
  "deferred",
] as const;

/**
 * Future spend/redemption policy (not implemented).
 *
 * The store purchase event ledger is authoritative for purchase earn/reversal
 * and MAY sum negative. Existing social `um_points_ledger` stays positive-only.
 * Unified wallet `um_point_balances` still has `balance >= 0`.
 *
 * If a refund would reverse points already spent (learning unlock, future
 * redemption): do not invent spend behavior. Record the full reversal on the
 * store ledger. Wallet apply may be blocked by the nonneg check
 * (`wallet_apply = blocked_nonneg`). Owner must later choose clawback vs debt.
 */
export const FUTURE_SPENT_POINTS_REFUND_POLICY =
  "STORE_LEDGER_ALLOWS_NEGATIVE_WALLET_NONNEG_UNCHANGED" as const;

export type EligibleSpendInput = {
  /** Product subtotal actually charged, original currency major units. */
  productSubtotal: number;
  /** Discount / coupon amount (reduces eligible spend). */
  discount?: number;
  shipping?: number;
  tax?: number;
  tip?: number;
  giftCardValue?: number;
  originalCurrency: string;
  /**
   * Authoritative USD per 1 original-currency unit from checkout/payment FX.
   * Required when originalCurrency is not USD. Never assumed to be 1.
   */
  fxUsdPerOriginalUnit?: number | null;
};

export type EligibleSpendResult =
  | {
      ok: true;
      eligibleOriginal: number;
      originalCurrency: string;
      eligibleUsd: number;
      fxUsdPerOriginalUnit: number | null;
    }
  | { ok: false; reason: string };

export type PaymentEarnGate =
  | { ok: true; status: StoreUmPointsPaidStatus }
  | { ok: false; reason: "not_paid" | "cancelled" | "invalid_status" };

const CURRENCY_RE = /^[A-Z]{3}$/;

export function normalizeStoreCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function isPaidCaptureStatus(
  status: string | null | undefined
): status is StoreUmPointsPaidStatus {
  const normalized = (status ?? "").trim().toLowerCase();
  return (STORE_UM_POINTS_PAID_STATUSES as readonly string[]).includes(
    normalized
  );
}

export function gatePurchasePaymentStatus(
  status: string | null | undefined
): PaymentEarnGate {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") {
    return { ok: false, reason: "cancelled" };
  }
  if (isPaidCaptureStatus(normalized)) {
    return { ok: true, status: normalized };
  }
  if (
    (
      STORE_UM_POINTS_NON_EARNING_PAYMENT_STATUSES as readonly string[]
    ).includes(normalized) ||
    normalized === "refunded"
  ) {
    return { ok: false, reason: "not_paid" };
  }
  return { ok: false, reason: "invalid_status" };
}

function finiteNonNeg(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

/**
 * Eligible product spend = product subtotal − discounts.
 * Shipping, tax, tips, and gift-card value are excluded (never added).
 */
export function computeEligibleProductSpend(
  input: EligibleSpendInput
): EligibleSpendResult {
  const originalCurrency = normalizeStoreCurrency(input.originalCurrency);
  if (!CURRENCY_RE.test(originalCurrency)) {
    return { ok: false, reason: "invalid_currency" };
  }

  const productSubtotal = finiteNonNeg(input.productSubtotal);
  const discount = Math.min(finiteNonNeg(input.discount), productSubtotal);
  const eligibleOriginal = Math.max(0, productSubtotal - discount);

  if (originalCurrency === STORE_UM_POINTS_CANONICAL_CURRENCY) {
    return {
      ok: true,
      eligibleOriginal,
      originalCurrency,
      eligibleUsd: eligibleOriginal,
      fxUsdPerOriginalUnit: 1,
    };
  }

  const fx = input.fxUsdPerOriginalUnit;
  if (typeof fx !== "number" || !Number.isFinite(fx) || fx <= 0) {
    return { ok: false, reason: "fx_required" };
  }

  return {
    ok: true,
    eligibleOriginal,
    originalCurrency,
    eligibleUsd: eligibleOriginal * fx,
    fxUsdPerOriginalUnit: fx,
  };
}

/** Authoritative award/reversal rounding: FLOOR of USD eligible spend. */
export function floorEligibleUsdToPoints(eligibleUsd: number): number {
  if (typeof eligibleUsd !== "number" || !Number.isFinite(eligibleUsd)) {
    return 0;
  }
  if (eligibleUsd <= 0) return 0;
  return Math.floor(eligibleUsd * UM_POINTS_PER_USD);
}

export function estimateEarnablePoints(
  input: EligibleSpendInput
): { points: number; estimate: true } | { points: 0; estimate: true; reason: string } {
  const spend = computeEligibleProductSpend(input);
  if (!spend.ok) {
    return { points: 0, estimate: true, reason: spend.reason };
  }
  return { points: floorEligibleUsdToPoints(spend.eligibleUsd), estimate: true };
}

export function estimateEarnablePointsFromRetail(input: {
  amountMinor: number | null | undefined;
  currency: string | null | undefined;
  quantity?: number;
  fxUsdPerOriginalUnit?: number | null;
}): number | null {
  if (
    input.amountMinor == null ||
    !Number.isFinite(input.amountMinor) ||
    input.amountMinor < 0 ||
    !input.currency
  ) {
    return null;
  }
  const quantity =
    typeof input.quantity === "number" &&
    Number.isInteger(input.quantity) &&
    input.quantity > 0
      ? input.quantity
      : 1;
  const major = (input.amountMinor * quantity) / 100;
  const result = estimateEarnablePoints({
    productSubtotal: major,
    originalCurrency: input.currency,
    fxUsdPerOriginalUnit: input.fxUsdPerOriginalUnit,
  });
  if ("reason" in result && result.reason === "fx_required") {
    return null;
  }
  return result.points;
}

export function pointsFromPaidPurchase(input: {
  paymentStatus: string | null | undefined;
  orderStatus?: string | null;
  spend: EligibleSpendInput;
}): {
  points: number;
  awarded: boolean;
  reason: string;
  spend?: Extract<EligibleSpendResult, { ok: true }>;
} {
  const orderStatus = (input.orderStatus ?? "").trim().toLowerCase();
  if (orderStatus === "cancelled" || orderStatus === "canceled") {
    return { points: 0, awarded: false, reason: "cancelled_order" };
  }

  const gate = gatePurchasePaymentStatus(input.paymentStatus);
  if (!gate.ok) {
    return {
      points: 0,
      awarded: false,
      reason: gate.reason === "cancelled" ? "cancelled_payment" : gate.reason,
    };
  }

  const spend = computeEligibleProductSpend(input.spend);
  if (!spend.ok) {
    return { points: 0, awarded: false, reason: spend.reason };
  }

  const points = floorEligibleUsdToPoints(spend.eligibleUsd);
  return {
    points,
    awarded: true,
    reason: points > 0 ? "purchase_earn" : "below_one_dollar",
    spend,
  };
}

export function pointsFromRefundedEligibleSpend(input: {
  refundedEligible: EligibleSpendInput;
}): {
  points: number;
  spend?: Extract<EligibleSpendResult, { ok: true }>;
  reason: string;
} {
  const spend = computeEligibleProductSpend(input.refundedEligible);
  if (!spend.ok) {
    return { points: 0, reason: spend.reason };
  }
  return {
    points: floorEligibleUsdToPoints(spend.eligibleUsd),
    spend,
    reason: "refund_reversal",
  };
}

export function buildPurchaseIdempotencyKey(input: {
  orderId: string;
  paymentReference?: string | null;
}): string {
  const orderId = input.orderId.trim();
  const payment = (input.paymentReference ?? "capture").trim() || "capture";
  return `store.um_points.purchase:${orderId}:${payment}`;
}

export function buildRefundIdempotencyKey(input: {
  orderId: string;
  refundReference: string;
  partial: boolean;
}): string {
  const kind = input.partial ? "partial_refund" : "refund";
  return `store.um_points.${kind}:${input.orderId.trim()}:${input.refundReference.trim()}`;
}

export function buildAdminAdjustmentIdempotencyKey(adjustmentId: string): string {
  return `store.um_points.admin:${adjustmentId.trim()}`;
}

export function isStoreUmPointsEventType(
  value: unknown
): value is StoreUmPointsEventType {
  return (
    typeof value === "string" &&
    (STORE_UM_POINTS_EVENT_TYPES as readonly string[]).includes(value)
  );
}
