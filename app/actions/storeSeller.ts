"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { applyToBecomeSeller } from "../../lib/store/sellerApplications";
import { APP_ROUTES } from "../lib/nav";

export async function applySellerAction(formData: FormData): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerApply)}`
    );
  }

  const supabase = await createClient();
  const result = await applyToBecomeSeller(supabase, user.id, {
    storeName: formData.get("storeName"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    countryCode: formData.get("countryCode"),
    city: formData.get("city"),
    publicContactEmail: formData.get("publicContactEmail"),
    publicContactPhone: formData.get("publicContactPhone"),
    defaultCurrency: formData.get("defaultCurrency") || "USD",
  });

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.sellerApply}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidatePath(APP_ROUTES.sellerApply);
  revalidatePath(APP_ROUTES.seller);
  redirect(`${APP_ROUTES.seller}?applied=1`);
}
