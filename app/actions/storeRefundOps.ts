"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  createRefundOperationRequest,
  executeRefundOperationRequest,
  transitionRefundOperationRequest,
} from "../../lib/store/refundOperations";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function backPath(formData: FormData): string {
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

function revalidateRefundOps() {
  revalidatePath(APP_ROUTES.adminStoreRefunds);
  revalidatePath(APP_ROUTES.adminStore);
  revalidatePath(APP_ROUTES.sellerOrders);
}

export async function adminCreateRefundOperationAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  const result = await createRefundOperationRequest(supabase, {
    storeId: formString(formData, "storeId"),
    orderId: formString(formData, "orderId"),
    reason: formString(formData, "reason"),
    idempotencyKey: formString(formData, "idempotencyKey"),
  });
  if (!("ok" in result) || result.ok !== true) {
    redirect(
      `${back}?error=${encodeURIComponent(
        "message" in result ? result.message : "Create failed."
      )}`
    );
  }
  revalidateRefundOps();
  redirect(`${back}?created=1`);
}

export async function adminTransitionRefundOperationAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  const toStatus = formString(formData, "toStatus") as
    | "under_review"
    | "approved"
    | "rejected"
    | "cancelled";
  if (
    toStatus !== "under_review" &&
    toStatus !== "approved" &&
    toStatus !== "rejected" &&
    toStatus !== "cancelled"
  ) {
    redirect(`${back}?error=${encodeURIComponent("Invalid transition.")}`);
  }
  const result = await transitionRefundOperationRequest(supabase, {
    requestId: formString(formData, "requestId"),
    toStatus,
    note: formString(formData, "note") || null,
  });
  if (!("ok" in result) || result.ok !== true) {
    redirect(
      `${back}?error=${encodeURIComponent(
        "message" in result ? result.message : "Transition failed."
      )}`
    );
  }
  revalidateRefundOps();
  redirect(`${back}?updated=1`);
}

export async function adminExecuteRefundOperationAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  const requestId = formString(formData, "requestId");
  const executionKey =
    formString(formData, "executionIdempotencyKey").trim() ||
    `refund-exec:${requestId}`;

  const result = await executeRefundOperationRequest(supabase, {
    requestId,
    executionIdempotencyKey: executionKey,
  });
  if (!("ok" in result) || result.ok !== true) {
    redirect(
      `${back}?error=${encodeURIComponent(
        "message" in result ? result.message : "Execute failed."
      )}`
    );
  }
  revalidateRefundOps();
  redirect(`${back}?executed=1`);
}
