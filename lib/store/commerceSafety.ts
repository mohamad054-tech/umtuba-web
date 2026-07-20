/**
 * Commerce Safety & Inventory Reservation V1 — server-side gate helpers.
 *
 * Precedence for confirmation:
 * 1. STORE_COMMERCE_CONFIRM_KILL_SWITCH (server-only) ON → deny (emergency)
 * 2. Else DB store_commerce_config.commerce_confirm_enabled OFF → deny
 * 3. Else allow
 *
 * The env override is kill-only. It can never force commerce ON when DB is OFF.
 * Never expose NEXT_PUBLIC_* for this kill switch.
 */

export const STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV =
  "STORE_COMMERCE_CONFIRM_KILL_SWITCH" as const;

export const COMMERCE_PURCHASES_UNAVAILABLE_MESSAGE =
  "Purchases are not currently available. You can still browse and save items to your cart.";

export const COMMERCE_CONFIRM_DISABLED_MESSAGE =
  "Checkout confirmation is temporarily unavailable. Your cart and quote preview still work — try again later.";

export const RESERVATION_FAILURE_MESSAGE =
  "We could not reserve inventory for this order. Please refresh checkout and try again.";

export const RESERVATION_EXPIRED_MESSAGE =
  "Your inventory hold expired. Please review your cart and confirm again.";

export type CommerceConfirmGateDecision =
  | { allowed: true }
  | { allowed: false; reason: "env_kill_switch" | "db_disabled"; message: string };

export function isCommerceConfirmKillSwitchOn(
  source: Record<string, string | undefined> = process.env
): boolean {
  const raw = (source[STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV] || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true";
}

/** App-layer emergency check only (env). DB is enforced inside RPCs. */
export function assertCommerceConfirmNotKilledByEnv(
  source: Record<string, string | undefined> = process.env
): { ok: true } | { ok: false; message: string } {
  if (isCommerceConfirmKillSwitchOn(source)) {
    return { ok: false, message: COMMERCE_CONFIRM_DISABLED_MESSAGE };
  }
  return { ok: true };
}

/**
 * Combined decision when DB flag is already known (for UI / preflight).
 * Env kill cannot force-enable.
 */
export function decideCommerceConfirmAllowed(input: {
  dbEnabled: boolean;
  env?: Record<string, string | undefined>;
}): CommerceConfirmGateDecision {
  const env = input.env ?? process.env;
  if (isCommerceConfirmKillSwitchOn(env)) {
    return {
      allowed: false,
      reason: "env_kill_switch",
      message: COMMERCE_CONFIRM_DISABLED_MESSAGE,
    };
  }
  if (!input.dbEnabled) {
    return {
      allowed: false,
      reason: "db_disabled",
      message: COMMERCE_PURCHASES_UNAVAILABLE_MESSAGE,
    };
  }
  return { allowed: true };
}

export function mapCommerceSafetyRpcError(message: string | undefined): string {
  const raw = (message || "").toLowerCase();
  if (raw.includes("commerce confirmation is disabled")) {
    return COMMERCE_CONFIRM_DISABLED_MESSAGE;
  }
  if (raw.includes("insufficient inventory")) {
    return RESERVATION_FAILURE_MESSAGE;
  }
  if (raw.includes("reservation") && raw.includes("expir")) {
    return RESERVATION_EXPIRED_MESSAGE;
  }
  if (raw.includes("idempotency conflict")) {
    return RESERVATION_FAILURE_MESSAGE;
  }
  if (raw.includes("reserved inventory is system-managed")) {
    return "Reserved inventory cannot be edited directly.";
  }
  if (raw.includes("cannot ship or deliver an unpaid order")) {
    return "Unpaid orders cannot be shipped or delivered.";
  }
  if (raw.includes("buyer cancellation") || raw.includes("cancelled by the buyer")) {
    return "This order cannot be cancelled.";
  }
  if (raw.includes("order access denied") || raw.includes("not authorized")) {
    return "Not authorized.";
  }
  // Avoid leaking Postgres internals / SQLSTATE detail to clients.
  if (
    raw.includes("pq:") ||
    raw.includes("sqlstate") ||
    raw.includes("permission denied") ||
    raw.includes("violates") ||
    raw.includes("duplicate key")
  ) {
    return "Request failed.";
  }
  return message?.trim() || "Request failed.";
}

/** Conservative stuck heuristic (read-only): active/pending_capture past expires_at. */
export function isStuckReservation(input: {
  status: string;
  expiresAtIso: string;
  nowMs?: number;
}): boolean {
  if (input.status !== "active" && input.status !== "pending_capture") {
    return false;
  }
  const expires = Date.parse(input.expiresAtIso);
  if (!Number.isFinite(expires)) return false;
  return expires <= (input.nowMs ?? Date.now());
}

export const RESERVATION_STATUSES = [
  "active",
  "pending_capture",
  "consumed",
  "released",
  "expired",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export function isReservationStatus(value: unknown): value is ReservationStatus {
  return (
    typeof value === "string" &&
    (RESERVATION_STATUSES as readonly string[]).includes(value)
  );
}
