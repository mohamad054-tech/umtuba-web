"use server";

/**
 * Reservation-only partial refund server actions.
 * Admin may request a durable ledger reservation.
 * Seller may only read reservations (existing refund-ops policy: no money execution).
 * Does not invoke full-order refund execution, Stripe, Sync, or any provider.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  PARTIAL_REFUND_RESERVATION_ACTIONS_ID,
  PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION,
  RESERVATION_NON_EVENTS,
  createPartialRefundReservationServiceRole,
  listPartialRefundReservationsForPaymentAttempt,
  loadTrustedPartialRefundReservationFacts,
  partialRefundReservationActionsOwnership,
  requestPartialRefundReservation,
  type PartialRefundReservationListResult,
  type TrustedPartialRefundFactLoadResult,
} from "../../lib/store/partialRefundReservation";
import { getOwnedOrMemberStore } from "../../lib/store/sellerStore";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formStrings(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

function backAdmin(formData: FormData): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith("/admin/store")) return raw;
  return APP_ROUTES.adminStoreRefunds;
}

function listFailure(
  status: "unauthorized" | "unsupported" | "validation_failed" | "not_found",
  message: string
): PartialRefundReservationListResult {
  return {
    ok: false,
    status,
    message,
    capability: PARTIAL_REFUND_RESERVATION_ACTIONS_ID,
    version: PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION,
    ownership: partialRefundReservationActionsOwnership(),
    ...RESERVATION_NON_EVENTS,
  };
}

function parseIntentFromForm(formData: FormData): {
  intent: { orderItemId: string; requestedQuantity: number }[];
  clientBag: Record<string, unknown>;
} {
  const orderItemIds = formStrings(formData, "orderItemId");
  const quantities = formStrings(formData, "requestedQuantity");
  const intent: { orderItemId: string; requestedQuantity: number }[] = [];
  for (let i = 0; i < orderItemIds.length; i++) {
    const qtyRaw = quantities[i] ?? "";
    const requestedQuantity = Number.parseInt(qtyRaw, 10);
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      continue;
    }
    intent.push({
      orderItemId: orderItemIds[i]!,
      requestedQuantity,
    });
  }

  const clientBag: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      clientBag[key] = value;
    }
  }
  return { intent, clientBag };
}

async function requirePlatformAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.adminStoreRefunds)}`
    );
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }
  return { user, supabase };
}

/**
 * Admin-only: create a durable partial-refund ledger reservation.
 * Does not execute a provider refund or move money.
 */
export async function adminRequestPartialRefundReservationAction(
  formData: FormData
): Promise<void> {
  await requirePlatformAdmin();
  const back = backAdmin(formData);
  const storeId = formString(formData, "storeId").trim();
  const paymentAttemptId = formString(formData, "paymentAttemptId").trim();
  const idempotencyKey = formString(formData, "idempotencyKey").trim() || null;
  const { intent, clientBag } = parseIntentFromForm(formData);

  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    redirect(
      `${back}?prError=${encodeURIComponent(boot.message)}&prStatus=unsupported`
    );
  }

  const result = await requestPartialRefundReservation(
    { factClient: boot.supabase, repository: boot.repository },
    {
      storeId,
      paymentAttemptId,
      intent,
      idempotencyKey,
      clientBag,
    }
  );

  revalidatePath(APP_ROUTES.adminStoreRefunds);
  if (!result.ok) {
    redirect(
      `${back}?prError=${encodeURIComponent(result.message)}&prStatus=${encodeURIComponent(result.status)}&prStoreId=${encodeURIComponent(storeId)}&prPaymentAttemptId=${encodeURIComponent(paymentAttemptId)}`
    );
  }
  redirect(
    `${back}?prOk=1&prStatus=${encodeURIComponent(result.status)}&prLedgerId=${encodeURIComponent(result.reservation.ledgerId)}&prStoreId=${encodeURIComponent(storeId)}&prPaymentAttemptId=${encodeURIComponent(paymentAttemptId)}`
  );
}

/**
 * Admin preview/load of trusted lines (no reservation).
 */
export async function adminLoadPartialRefundReservationFacts(input: {
  storeId: string;
  paymentAttemptId: string;
}): Promise<TrustedPartialRefundFactLoadResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Authentication required." };
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return { ok: false, code: "unauthorized", message: "Platform admin required." };
  }
  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    return { ok: false, code: "unsupported", message: boot.message };
  }
  return loadTrustedPartialRefundReservationFacts(boot.supabase, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
  });
}

/**
 * Admin list of committed reservations for a payment attempt.
 */
export async function adminListPartialRefundReservations(input: {
  storeId: string;
  paymentAttemptId: string;
}): Promise<PartialRefundReservationListResult> {
  const user = await getServerUser();
  if (!user) {
    return listFailure("unauthorized", "Authentication required.");
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return listFailure("unauthorized", "Platform admin required.");
  }
  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    return listFailure("unsupported", boot.message);
  }
  return listPartialRefundReservationsForPaymentAttempt(
    { factClient: boot.supabase, repository: boot.repository },
    input
  );
}

/**
 * Seller read-only: list committed reservations for an owned store payment.
 * Seller reservation request is intentionally not exposed (fail closed).
 */
export async function sellerListPartialRefundReservations(input: {
  storeId: string;
  paymentAttemptId: string;
}): Promise<PartialRefundReservationListResult> {
  const user = await getServerUser();
  if (!user) {
    return listFailure("unauthorized", "Authentication required.");
  }
  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership || membership.store.id !== input.storeId) {
    return listFailure("unauthorized", "Store ownership required.");
  }
  if (membership.store.status !== "active") {
    return listFailure("unsupported", "Store is not active.");
  }

  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    return listFailure("unsupported", boot.message);
  }
  return listPartialRefundReservationsForPaymentAttempt(
    { factClient: boot.supabase, repository: boot.repository },
    {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
    }
  );
}
