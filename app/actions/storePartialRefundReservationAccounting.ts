"use server";

/**
 * Read-only partial-refund reservation accounting audit actions.
 * Never creates/cancels reservations or calls providers.
 */

import {
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  getPartialRefundCommittedReservationDetail,
  loadPartialRefundCaptureAccountingReview,
  type PartialRefundAccountingDetailResult,
  type PartialRefundAccountingReadResult,
} from "../../lib/store/partialRefundReservationAccounting";
import {
  PARTIAL_REFUND_ACCOUNTING_AUDIT_ID,
  PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION,
  ACCOUNTING_READ_NON_EVENTS,
  partialRefundAccountingAuditOwnership,
} from "../../lib/store/partialRefundReservationAccounting";
import { createPartialRefundReservationServiceRole } from "../../lib/store/partialRefundReservation";
import { getOwnedOrMemberStore } from "../../lib/store/sellerStore";
import { createClient, getServerUser } from "../../lib/supabase/server";

function readFailure(
  status: "unauthorized" | "unsupported" | "validation_failed" | "not_found",
  message: string
): Extract<PartialRefundAccountingReadResult, { ok: false }> {
  return {
    ok: false,
    status,
    message,
    capability: PARTIAL_REFUND_ACCOUNTING_AUDIT_ID,
    version: PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION,
    ownership: partialRefundAccountingAuditOwnership(),
    ...ACCOUNTING_READ_NON_EVENTS,
  };
}

/**
 * Admin-only: load capture accounting review for a payment attempt.
 */
export async function adminLoadPartialRefundAccountingReview(input: {
  storeId: string;
  paymentAttemptId: string;
}): Promise<PartialRefundAccountingReadResult> {
  const user = await getServerUser();
  if (!user) {
    return readFailure("unauthorized", "Authentication required.");
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return readFailure("unauthorized", "Platform admin required.");
  }
  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    return readFailure("unsupported", boot.message);
  }
  return loadPartialRefundCaptureAccountingReview(
    { factClient: boot.supabase, repository: boot.repository },
    input
  );
}

/**
 * Admin-only: committed reservation detail by ledger id.
 */
export async function adminGetPartialRefundReservationDetail(input: {
  storeId: string;
  ledgerId: string;
}): Promise<PartialRefundAccountingDetailResult> {
  const user = await getServerUser();
  if (!user) {
    return readFailure("unauthorized", "Authentication required.");
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return readFailure("unauthorized", "Platform admin required.");
  }
  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    return readFailure("unsupported", boot.message);
  }
  return getPartialRefundCommittedReservationDetail(
    { repository: boot.repository },
    { ledgerId: input.ledgerId, expectedStoreId: input.storeId }
  );
}

/**
 * Seller read-only: own-store accounting review for a payment attempt.
 */
export async function sellerLoadPartialRefundAccountingReview(input: {
  storeId: string;
  paymentAttemptId: string;
}): Promise<PartialRefundAccountingReadResult> {
  const user = await getServerUser();
  if (!user) {
    return readFailure("unauthorized", "Authentication required.");
  }
  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership || membership.store.id !== input.storeId) {
    return readFailure("unauthorized", "Store ownership required.");
  }
  if (membership.store.status !== "active") {
    return readFailure("unsupported", "Store is not active.");
  }
  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    return readFailure("unsupported", boot.message);
  }
  return loadPartialRefundCaptureAccountingReview(
    { factClient: boot.supabase, repository: boot.repository },
    input
  );
}
