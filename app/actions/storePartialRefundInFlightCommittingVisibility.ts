"use server";

/**
 * Admin-only in-flight committing visibility action (read-only).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import { createPartialRefundReservationServiceRole } from "../../lib/store/partialRefundReservation";
import { listInFlightCommittingPartialRefundReservations } from "../../lib/store/partialRefundInFlightCommittingVisibility";
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
 * Refresh/list in-flight committing reservations (does not recover).
 */
export async function adminListInFlightCommittingPartialRefundAction(
  formData: FormData
): Promise<void> {
  await requirePlatformAdmin();
  const back = backAdmin(formData);
  const storeId = formString(formData, "storeId").trim() || null;
  const captureEventId = formString(formData, "captureEventId").trim() || null;

  const boot = createPartialRefundReservationServiceRole();
  if (!boot.ok) {
    redirect(
      `${back}?prVisError=${encodeURIComponent(boot.message)}&prVisStatus=unsupported`
    );
  }

  const result = await listInFlightCommittingPartialRefundReservations(
    { repository: boot.repository },
    { storeId, captureEventId }
  );

  revalidatePath(APP_ROUTES.adminStoreRefunds);
  if (!result.ok) {
    redirect(
      `${back}?prVisError=${encodeURIComponent(result.message)}&prVisStatus=${encodeURIComponent(result.status)}`
    );
  }

  const params = new URLSearchParams();
  params.set("prVisOk", "1");
  params.set("prVisStatus", result.status);
  params.set("prVisCount", String(result.rows.length));
  if (storeId) params.set("prVisStoreId", storeId);
  if (captureEventId) params.set("prVisCaptureId", captureEventId);
  redirect(`${back}?${params.toString()}`);
}
