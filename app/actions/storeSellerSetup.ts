"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  saveStoreSetupDraft,
  submitStoreSetup,
} from "../../lib/store/sellerSetup";
import { APP_ROUTES } from "../lib/nav";

function formToRaw(formData: FormData) {
  return {
    storeName: formData.get("storeName"),
    slug: formData.get("slug"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    countryCode: formData.get("countryCode"),
    city: formData.get("city"),
    defaultCurrency: formData.get("defaultCurrency") || "USD",
    storeTemplate: formData.get("storeTemplate"),
    publicContactEmail: formData.get("publicContactEmail"),
    publicContactPhone: formData.get("publicContactPhone"),
    publicContactUrl: formData.get("publicContactUrl"),
    returnPolicy: formData.get("returnPolicy"),
    shippingPolicy: formData.get("shippingPolicy"),
    privacyPolicy: formData.get("privacyPolicy"),
    wizardStep: formData.get("wizardStep"),
  };
}

function readStep(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function setupRedirect(opts: {
  step?: unknown;
  error?: string;
  saved?: boolean;
}) {
  const params = new URLSearchParams();
  const step = readStep(opts.step);
  if (step) params.set("step", step);
  if (opts.error) params.set("error", opts.error);
  if (opts.saved) params.set("saved", "1");
  const qs = params.toString();
  return qs ? `${APP_ROUTES.sellerSetup}?${qs}` : APP_ROUTES.sellerSetup;
}

export async function saveStoreSetupDraftAction(
  formData: FormData
): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerSetup)}`
    );
  }

  const step = readStep(formData.get("wizardStep"));
  const supabase = await createClient();
  const result = await saveStoreSetupDraft(
    supabase,
    user.id,
    formToRaw(formData)
  );

  if (!result.ok) {
    redirect(setupRedirect({ step, error: result.message }));
  }

  revalidatePath(APP_ROUTES.sellerSetup);
  revalidatePath(APP_ROUTES.seller);
  revalidatePath(APP_ROUTES.sellerApply);
  redirect(
    setupRedirect({
      step: result.data.wizard_step ?? step,
      saved: true,
    })
  );
}

export async function submitStoreSetupAction(
  formData: FormData
): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerSetup)}`
    );
  }

  const supabase = await createClient();
  const result = await submitStoreSetup(
    supabase,
    user.id,
    formToRaw(formData)
  );

  if (!result.ok) {
    redirect(setupRedirect({ step: 6, error: result.message }));
  }

  revalidatePath(APP_ROUTES.sellerSetup);
  revalidatePath(APP_ROUTES.seller);
  revalidatePath(APP_ROUTES.sellerApply);
  redirect(`${APP_ROUTES.seller}?submitted=1`);
}
