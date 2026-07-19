"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  approveSellerApplicationAdmin,
  approveStoreProductAdmin,
  rejectSellerApplicationAdmin,
  suspendSellerApplicationAdmin,
  validateRejectionReason,
} from "../../lib/store/adminReview";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function revalidateStoreAdmin() {
  revalidatePath(APP_ROUTES.adminStore);
  revalidatePath(APP_ROUTES.adminStoreSellers);
  revalidatePath(APP_ROUTES.adminStoreProducts);
  revalidatePath(APP_ROUTES.seller);
  revalidatePath(APP_ROUTES.sellerApply);
  revalidatePath(APP_ROUTES.sellerStore);
  revalidatePath(APP_ROUTES.sellerProducts);
  revalidatePath(APP_ROUTES.store);
  revalidatePath(APP_ROUTES.storeSearch);
}

async function requirePlatformAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.adminStore)}`
    );
  }
  const supabase = await createClient();
  // DB is the sole authority — JWT/env hints are never enough.
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }
  return { user, supabase };
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function backPath(formData: FormData, fallback: string): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith("/admin/store")) return raw;
  return fallback;
}

export async function approveSellerApplicationAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const id = formString(formData, "applicationId");
  const result = await approveSellerApplicationAdmin(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminStoreSellers);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateStoreAdmin();
  redirect(`${back}?approved=1`);
}

export async function rejectSellerApplicationAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const id = formString(formData, "applicationId");
  const note = formString(formData, "note");
  const reason = validateRejectionReason(note);
  const back = backPath(formData, APP_ROUTES.adminStoreSellers);
  if (!reason.ok) {
    redirect(`${back}?error=${encodeURIComponent(reason.message)}`);
  }
  const result = await rejectSellerApplicationAdmin(supabase, id, reason.note);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateStoreAdmin();
  redirect(`${back}?rejected=1`);
}

export async function suspendSellerApplicationAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const id = formString(formData, "applicationId");
  const result = await suspendSellerApplicationAdmin(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminStoreSellers);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateStoreAdmin();
  redirect(`${back}?suspended=1`);
}

export async function approveStoreProductAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const id = formString(formData, "productId");
  const result = await approveStoreProductAdmin(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminStoreProducts);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateStoreAdmin();
  redirect(`${back}?approved=1`);
}
