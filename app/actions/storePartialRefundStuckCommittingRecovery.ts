"use server";

/**
 * Admin-only stuck-committing recovery action.
 * committing → failed lock release only — not compensation or money refund.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import { createPartialRefundReservationServiceRole } from "../../lib/store/partialRefundReservation";
import { recoverStuckCommittingPartialRefundReservation } from "../../lib/store/partialRefundStuckCommittingRecovery";
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
 * Recover stuck in-flight reservation: committing → failed.
 */
export async function adminRecoverStuckCommittingPartialRefundAction(
  formData: FormData
): Promise<void> {
  await requirePlatformAdmin();
  const back = backAdmin(formData);
  const ledgerId = formString(formData, "ledgerId").trim();
  const expectedStoreId = formString(formData, "expectedStoreId").trim() || null;
  const operatorReason = formString(formData, "operatorReason").trim() || null;

  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    redirect(
      `${back}?prRecError=${encodeURIComponent(boot.message)}&prRecStatus=unsupported`
    );
  }

  const result = await recoverStuckCommittingPartialRefundReservation(
    { repository: boot.repository },
    { ledgerId, expectedStoreId, operatorReason }
  );

  revalidatePath(APP_ROUTES.adminStoreRefunds);
  if (!result.ok) {
    redirect(
      `${back}?prRecError=${encodeURIComponent(result.message)}&prRecStatus=${encodeURIComponent(result.status)}&prRecLedgerId=${encodeURIComponent(ledgerId)}`
    );
  }
  redirect(
    `${back}?prRecOk=1&prRecStatus=${encodeURIComponent(result.status)}&prRecLedgerId=${encodeURIComponent(result.commit.ledgerId)}`
  );
}
