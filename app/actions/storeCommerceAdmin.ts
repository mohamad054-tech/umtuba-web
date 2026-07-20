"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { assertPlatformAdminDb } from "../../lib/store/adminAuth";
import { adminSetCommerceConfirmEnabled } from "../../lib/store/commerceSafetyQueries";
import { APP_ROUTES } from "../lib/nav";

export async function adminSetCommerceConfirmEnabledAction(
  formData: FormData
): Promise<void> {
  const user = await getServerUser();
  if (!user) return;
  const supabase = await createClient();
  const admin = await assertPlatformAdminDb(supabase);
  if (!admin) return;

  const raw = formData.get("enabled");
  const enabled = raw === "1" || raw === "true";
  const result = await adminSetCommerceConfirmEnabled(supabase, enabled);
  if (result.ok) {
    revalidatePath(APP_ROUTES.adminStoreReservations);
    revalidatePath(APP_ROUTES.storeCheckout);
  }
}
