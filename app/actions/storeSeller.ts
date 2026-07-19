"use server";

import { redirect } from "next/navigation";
import { getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

/**
 * Legacy one-shot apply action — disabled.
 * Always send callers through the Store Setup Wizard so there is a single
 * DB-enforced submission model (`submit_my_seller_application`).
 */
export async function applySellerAction(_formData: FormData): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerSetup)}`
    );
  }

  redirect(
    `${APP_ROUTES.sellerSetup}?error=${encodeURIComponent(
      "Store setup now uses the wizard. Complete each step, then submit for approval."
    )}`
  );
}
