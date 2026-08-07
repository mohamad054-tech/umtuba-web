"use server";

/**
 * Admin-only committed reservation accounting compensation action.
 * Restores ledger ceilings only — not money, provider refund, or cancellation.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  compensateCommittedPartialRefundReservation,
  sanitizeCompensationOperatorReason,
} from "../../lib/store/partialRefundCommittedCompensation";
import { createPartialRefundReservationServiceRole } from "../../lib/store/partialRefundReservation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function backAdmin(formData: FormData): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith("/admin/store")) return raw;
  return APP_ROUTES.adminStoreRefunds;
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
 * Accounting-only: committed → compensated (or already_compensated).
 * Never refunds money, restocks, or cancels via provider.
 */
export async function adminCompensateCommittedPartialRefundReservationAction(
  formData: FormData
): Promise<void> {
  await requirePlatformAdmin();
  const back = backAdmin(formData);
  const ledgerId = formString(formData, "ledgerId").trim();
  const expectedStoreId =
    formString(formData, "expectedStoreId").trim() || null;
  const operatorReasonRaw = formString(formData, "operatorReason");

  const reason = sanitizeCompensationOperatorReason(operatorReasonRaw);
  if (!reason.ok) {
    redirect(
      `${back}?prCompError=${encodeURIComponent(reason.message)}&prCompStatus=validation_failed&prCompLedgerId=${encodeURIComponent(ledgerId)}`
    );
  }

  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    redirect(
      `${back}?prCompError=${encodeURIComponent(boot.message)}&prCompStatus=unsupported`
    );
  }

  const result = await compensateCommittedPartialRefundReservation(
    { repository: boot.repository },
    {
      ledgerId,
      expectedStoreId,
      operatorReason: reason.reason,
    }
  );

  revalidatePath(APP_ROUTES.adminStoreRefunds);
  if (!result.ok) {
    redirect(
      `${back}?prCompError=${encodeURIComponent(result.message)}&prCompStatus=${encodeURIComponent(result.status)}&prCompLedgerId=${encodeURIComponent(ledgerId)}`
    );
  }
  redirect(
    `${back}?prCompOk=1&prCompStatus=${encodeURIComponent(result.status)}&prCompLedgerId=${encodeURIComponent(result.commit.ledgerId)}&prCompRestored=${encodeURIComponent(String(result.restoredRefundAmountMinor))}`
  );
}
