/**
 * Store Seller Center commerce readiness contracts.
 *
 * Financial gates are fail-closed. Commission has no hardcoded final
 * percentage. Real capture / payout / provider connect stay disabled.
 */

export const REAL_PAYMENT_CAPTURE = "DISABLED" as const;
export const REAL_SELLER_PAYOUT = "DISABLED" as const;
export const PAYMENT_PROVIDER_CONNECTED = "NO" as const;

export const COMMERCE_FINANCIAL_GATES = {
  REAL_PAYMENT_CAPTURE,
  REAL_SELLER_PAYOUT,
  PAYMENT_PROVIDER_CONNECTED,
} as const;

/** Canonical seller onboarding lifecycle (DB stores lowercase aliases). */
export const SELLER_LIFECYCLE_STATES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
] as const;
export type SellerLifecycleState = (typeof SELLER_LIFECYCLE_STATES)[number];

const SELLER_LIFECYCLE_FROM_DB: Record<string, SellerLifecycleState> = {
  draft: "DRAFT",
  pending: "PENDING_REVIEW",
  pending_review: "PENDING_REVIEW",
  approved: "APPROVED",
  suspended: "SUSPENDED",
  rejected: "REJECTED",
};

export const SELLER_LIFECYCLE_TO_DB: Record<SellerLifecycleState, string> = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending",
  APPROVED: "approved",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
};

export function toSellerLifecycleState(
  dbStatus: string | null | undefined
): SellerLifecycleState | null {
  if (!dbStatus) return null;
  return SELLER_LIFECYCLE_FROM_DB[dbStatus.trim().toLowerCase()] ?? null;
}

export function sellerLifecycleAllowsCatalog(
  state: SellerLifecycleState | null
): boolean {
  return state === "APPROVED";
}

export function sellerLifecycleIsOpen(
  state: SellerLifecycleState | null
): boolean {
  return (
    state === "DRAFT" ||
    state === "PENDING_REVIEW" ||
    state === "APPROVED" ||
    state === "SUSPENDED"
  );
}

/** Required buyer/seller order lifecycle (DB lowercase). packed is retained. */
export const REQUIRED_ORDER_STATES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
] as const;
export type RequiredOrderState = (typeof REQUIRED_ORDER_STATES)[number];

export const REQUIRED_ORDER_STATE_TO_DB: Record<RequiredOrderState, string> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURN_REQUESTED: "return_requested",
  RETURNED: "returned",
  REFUNDED: "refunded",
};

export function toRequiredOrderState(
  dbStatus: string | null | undefined
): RequiredOrderState | null {
  if (!dbStatus) return null;
  const key = dbStatus.trim().toLowerCase();
  const found = (Object.entries(REQUIRED_ORDER_STATE_TO_DB) as Array<
    [RequiredOrderState, string]
  >).find(([, value]) => value === key);
  return found ? found[0] : null;
}

export const SELLER_PAYOUT_STATES = [
  "NOT_ELIGIBLE",
  "HOLD",
  "PENDING_REVIEW",
  "SCHEDULED",
  "PAID",
  "FAILED",
] as const;
export type SellerPayoutState = (typeof SELLER_PAYOUT_STATES)[number];

export const DEFAULT_SELLER_PAYOUT_STATE: SellerPayoutState = "NOT_ELIGIBLE";

/**
 * Commission architecture only. No final percentage is configured or implied.
 * rateBps stays null until a later operator policy GO — never invent a share.
 */
export type CommissionPolicyDraft = {
  version: number;
  status: "DRAFT" | "INACTIVE";
  rateBps: number | null;
  notes: string;
};

export const COMMISSION_POLICY_ARCHITECTURE: CommissionPolicyDraft = {
  version: 1,
  status: "DRAFT",
  rateBps: null,
  notes:
    "Commission policy is architectural only. No default or final percentage is set.",
};

export function assertRealPaymentCaptureDisabled(): {
  ok: true;
  REAL_PAYMENT_CAPTURE: typeof REAL_PAYMENT_CAPTURE;
} {
  if (REAL_PAYMENT_CAPTURE !== "DISABLED") {
    throw new Error("REAL_PAYMENT_CAPTURE must remain DISABLED.");
  }
  return { ok: true, REAL_PAYMENT_CAPTURE };
}

export function assertRealSellerPayoutDisabled(): {
  ok: true;
  REAL_SELLER_PAYOUT: typeof REAL_SELLER_PAYOUT;
} {
  if (REAL_SELLER_PAYOUT !== "DISABLED") {
    throw new Error("REAL_SELLER_PAYOUT must remain DISABLED.");
  }
  return { ok: true, REAL_SELLER_PAYOUT };
}

export function assertPaymentProviderDisconnected(): {
  ok: true;
  PAYMENT_PROVIDER_CONNECTED: typeof PAYMENT_PROVIDER_CONNECTED;
} {
  if (PAYMENT_PROVIDER_CONNECTED !== "NO") {
    throw new Error("PAYMENT_PROVIDER_CONNECTED must remain NO.");
  }
  return { ok: true, PAYMENT_PROVIDER_CONNECTED };
}

export function assertCommerceFinancialGates(): {
  ok: true;
  REAL_PAYMENT_CAPTURE: typeof REAL_PAYMENT_CAPTURE;
  REAL_SELLER_PAYOUT: typeof REAL_SELLER_PAYOUT;
  PAYMENT_PROVIDER_CONNECTED: typeof PAYMENT_PROVIDER_CONNECTED;
} {
  assertRealPaymentCaptureDisabled();
  assertRealSellerPayoutDisabled();
  assertPaymentProviderDisconnected();
  return {
    ok: true,
    REAL_PAYMENT_CAPTURE,
    REAL_SELLER_PAYOUT,
    PAYMENT_PROVIDER_CONNECTED,
  };
}

export function canExecuteRealPaymentCapture(): false {
  assertRealPaymentCaptureDisabled();
  return false;
}

export function canExecuteRealSellerPayout(): false {
  assertRealSellerPayoutDisabled();
  return false;
}

export function canExecuteRealRefund(): false {
  assertRealPaymentCaptureDisabled();
  return false;
}

export function rejectHardcodedCommissionPercent(
  value: unknown
): { ok: true } | { ok: false; message: string } {
  if (value == null || value === "") return { ok: true };
  return {
    ok: false,
    message:
      "A final commission percentage is not configured and must not be hardcoded.",
  };
}

export function currentCommissionRateBps(): number | null {
  return COMMISSION_POLICY_ARCHITECTURE.rateBps;
}

export function deriveSellerPayoutState(): SellerPayoutState {
  assertRealSellerPayoutDisabled();
  return DEFAULT_SELLER_PAYOUT_STATE;
}

export function redactBuyerPrivateFields<T extends Record<string, unknown>>(
  row: T
): Omit<T, "email" | "phone" | "full_name" | "address_line1" | "address_line2"> {
  const {
    email: _email,
    phone: _phone,
    full_name: _fullName,
    address_line1: _a1,
    address_line2: _a2,
    ...safe
  } = row;
  return safe;
}
