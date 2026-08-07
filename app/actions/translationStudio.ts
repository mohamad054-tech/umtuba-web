"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  createSupabaseWriteRpcTransport,
  getTranslationStudioWorkflow,
  runWithStudioShadowWriteTransport,
  runWithStudioShadowWriteTransportAsync,
} from "../../lib/translationStudio";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const STUDIO_BASE = "/admin/translation-studio";

function revalidateStudio(keyId?: string) {
  revalidatePath(STUDIO_BASE);
  revalidatePath(`${STUDIO_BASE}/keys`);
  revalidatePath(`${STUDIO_BASE}/review`);
  revalidatePath(`${STUDIO_BASE}/publish`);
  if (keyId) {
    revalidatePath(`${STUDIO_BASE}/keys/${keyId}`);
  }
}

async function requireStudioAdmin(): Promise<{
  user: User;
  supabase: SupabaseClient;
}> {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(STUDIO_BASE)}`);
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

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function safeReturnTo(formData: FormData, fallback: string): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith(STUDIO_BASE)) return raw;
  return fallback;
}

/** Bind request-scoped authenticated RPC transport for shadow dual-write. */
function withShadowTransport<T>(
  supabase: SupabaseClient,
  fn: () => T
): T {
  return runWithStudioShadowWriteTransport(
    createSupabaseWriteRpcTransport(supabase),
    fn
  );
}

async function withShadowTransportAsync<T>(
  supabase: SupabaseClient,
  fn: () => Promise<T>
): Promise<T> {
  return runWithStudioShadowWriteTransportAsync(
    createSupabaseWriteRpcTransport(supabase),
    fn
  );
}

export async function saveTranslationDraftAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const text = formString(formData, "text");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);
  try {
    withShadowTransport(supabase, () => {
      getTranslationStudioWorkflow().saveDraft({
        valueId,
        text,
        actor: { userId: user.id },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save draft.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?saved=1`);
}

export async function submitTranslationReviewAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);
  try {
    withShadowTransport(supabase, () => {
      getTranslationStudioWorkflow().submitForReview({
        valueId,
        actor: { userId: user.id },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit for review.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?submitted=1`);
}

export async function approveTranslationAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const ready = formString(formData, "readyForPublish") === "1";
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);
  try {
    withShadowTransport(supabase, () => {
      getTranslationStudioWorkflow().approve({
        valueId,
        actor: { userId: user.id },
        markReadyForPublish: ready,
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to approve.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?approved=1`);
}

export async function rejectTranslationAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const note = formString(formData, "note");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/review`);
  try {
    withShadowTransport(supabase, () => {
      getTranslationStudioWorkflow().reject({
        valueId,
        actor: { userId: user.id },
        note: note || undefined,
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reject.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?rejected=1`);
}

export async function deprecateTranslationAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);
  try {
    withShadowTransport(supabase, () => {
      getTranslationStudioWorkflow().deprecate({
        valueId,
        actor: { userId: user.id },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to deprecate.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?deprecated=1`);
}

export async function restoreTranslationAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);
  try {
    withShadowTransport(supabase, () => {
      getTranslationStudioWorkflow().restore({
        valueId,
        actor: { userId: user.id },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to restore.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?restored=1`);
}

export async function requestAiSuggestionAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);
  try {
    await withShadowTransportAsync(supabase, async () => {
      await getTranslationStudioWorkflow().requestAiSuggestion({
        valueId,
        actor: { userId: user.id },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to request suggestion.";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  revalidateStudio(keyId);
  redirect(`${back}?suggested=1`);
}
