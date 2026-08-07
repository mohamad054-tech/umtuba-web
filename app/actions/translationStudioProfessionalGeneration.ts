"use server";

/**
 * Professional generation + review product actions (FormData-compatible).
 * Platform-admin only. Shadow dual-write preserved via existing transports.
 * Browser cannot inject glossary/style/profile/provider.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  createSupabaseReadRpcTransport,
  createSupabaseWriteRpcTransport,
  getTranslationStudioWorkflow,
  runWithStudioDualReadTransportAsync,
  runWithStudioShadowWriteTransportAsync,
  runProfessionalGenerateReviewAndSuggest,
  runProfessionalReviewExistingDraft,
  selectProfessionalProviders,
  createLiveTransportFromAiServiceRunner,
  mapFailureToUxCode,
  seedUmtubaOfficialTerminologyCatalog,
  buildProfessionalTranslationRequestContext,
  PROFESSIONAL_AI_AUTHORITY,
  type StudioLanguageCode,
} from "../../lib/translationStudio";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const STUDIO_BASE = "/admin/translation-studio";

function revalidateStudio(keyId?: string) {
  revalidatePath(STUDIO_BASE);
  revalidatePath(`${STUDIO_BASE}/keys`);
  revalidatePath(`${STUDIO_BASE}/review`);
  if (keyId) revalidatePath(`${STUDIO_BASE}/keys/${keyId}`);
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

async function withShadowTransportAsync<T>(
  supabase: SupabaseClient,
  fn: () => Promise<T>
): Promise<T> {
  const write = createSupabaseWriteRpcTransport(supabase);
  const read = createSupabaseReadRpcTransport(supabase);
  return runWithStudioDualReadTransportAsync(read, () =>
    runWithStudioShadowWriteTransportAsync(write, fn)
  );
}

async function resolveProvidersForValue(input: {
  userId: string;
  supabase: SupabaseClient;
  valueId: string;
}) {
  const workflow = getTranslationStudioWorkflow();
  const snapshot = workflow.getSnapshot();
  const value = snapshot.values.find((v) => v.id === input.valueId);
  if (!value) throw new Error("Unknown translation value.");
  const key = snapshot.keys.find((k) => k.id === value.keyId);
  if (!key) throw new Error("Unknown translation key.");
  const ns = snapshot.namespaces.find((n) => n.id === key.namespaceId);
  const context = buildProfessionalTranslationRequestContext({
    keyStableId: key.id,
    namespaceId: key.namespaceId,
    namespaceName: ns?.name ?? null,
    targetLocale: value.language as StudioLanguageCode,
    sourceText: key.sourceText,
    terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
    domainHint: ns?.name ?? null,
  });

  let liveTransport = null;
  try {
    const { loadAiPlatformConfig } = await import("../../lib/ai/config");
    const { runCapability } = await import("../../lib/ai/services/aiService");
    const config = loadAiPlatformConfig();
    if (config.mode === "live") {
      liveTransport = createLiveTransportFromAiServiceRunner(async (req) => {
        const result = await runCapability(
          {
            capabilityId: "platform.translation_suggest",
            input: req.input,
            context: {
              surface: req.context.surface,
              productDomain: "platform",
              locale: req.context.locale,
            },
          },
          { userId: input.userId, supabase: input.supabase }
        );
        if (!result.ok) {
          return { ok: false as const, error: { message: result.error.message } };
        }
        return {
          ok: true as const,
          data: {
            result: result.data.result as Record<string, unknown>,
            runId: result.data.runId,
          },
        };
      });
    }
  } catch {
    liveTransport = null;
  }

  return selectProfessionalProviders({
    locale: context.targetLocale,
    profileId: context.qualityProfile.id,
    liveTransport,
  });
}

/**
 * Generate professional suggestion + independent review.
 * Creates pending suggestion only — never replaces current translation.
 */
export async function generateProfessionalTranslationSuggestionAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);

  try {
    const result = await withShadowTransportAsync(supabase, async () => {
      const providers = await resolveProvidersForValue({
        userId: user.id,
        supabase,
        valueId,
      });
      return runProfessionalGenerateReviewAndSuggest({
        workflow: getTranslationStudioWorkflow(),
        valueId,
        actorUserId: user.id,
        providers,
      });
    });

    if (!result.ok) {
      redirect(
        `${back}?error=${encodeURIComponent(mapFailureToUxCode(result.failureCode))}&professional=${encodeURIComponent(result.failureCode)}`
      );
    }

    revalidateStudio(keyId);
    const rec = result.recommendation;
    redirect(
      `${back}?professional_suggested=1&recommendation=${encodeURIComponent(rec)}&score=${encodeURIComponent(String(result.report.overallScore))}`
    );
  } catch (error) {
    // Next.js redirect throws — rethrow
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "professional_generate_failed";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
}

/**
 * Read-only professional review of current draft/value.
 * Does not mutate. Surfaces result via query params + flash-friendly summary.
 */
export async function reviewCurrentTranslationProfessionallyAction(
  formData: FormData
): Promise<void> {
  const { user, supabase } = await requireStudioAdmin();
  const valueId = formString(formData, "valueId");
  const keyId = formString(formData, "keyId");
  const back = safeReturnTo(formData, `${STUDIO_BASE}/keys/${keyId}`);

  try {
    const result = await withShadowTransportAsync(supabase, async () => {
      const providers = await resolveProvidersForValue({
        userId: user.id,
        supabase,
        valueId,
      });
      return runProfessionalReviewExistingDraft({
        workflow: getTranslationStudioWorkflow(),
        valueId,
        providers,
        useCache: true,
      });
    });

    if (!result.ok) {
      redirect(
        `${back}?error=${encodeURIComponent(mapFailureToUxCode(result.failureCode))}&professional=${encodeURIComponent(result.failureCode)}`
      );
    }

    // Persist last review summary on a transient query (no value mutation).
    revalidateStudio(keyId);
    const findings = result.report.deterministicFindings
      .filter((f) => f.severity === "blocking" || f.severity === "error")
      .slice(0, 3)
      .map((f) => f.code)
      .join(",");
    redirect(
      `${back}?professional_reviewed=1&recommendation=${encodeURIComponent(result.recommendation)}&score=${encodeURIComponent(String(result.report.overallScore))}&human=${result.humanReviewRequired ? "1" : "0"}&findings=${encodeURIComponent(findings)}&cache=${result.cacheHit ? "hit" : "miss"}`
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "professional_review_failed";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
}

/** JSON diagnostic (admin) — no secrets. */
export async function getProfessionalGenerationRuntimeStatusAction(): Promise<{
  offlinePipelineReady: true;
  liveProviderConfigured: boolean;
  mode: string | null;
  note: string;
  authority: typeof PROFESSIONAL_AI_AUTHORITY;
  requiredEnvNames: string[];
}> {
  await requireStudioAdmin();
  let mode: string | null = null;
  let live = false;
  try {
    const { loadAiPlatformConfig } = await import("../../lib/ai/config");
    const config = loadAiPlatformConfig();
    mode = config.mode;
    live = config.mode === "live";
  } catch {
    mode = null;
  }
  return {
    offlinePipelineReady: true,
    liveProviderConfigured: live,
    mode,
    note: live
      ? "Live AI mode available for professional adapters"
      : "OFFLINE_PIPELINE_READY / LIVE_PROVIDER_NOT_CONFIGURED",
    authority: PROFESSIONAL_AI_AUTHORITY,
    requiredEnvNames: [
      "UMTUBA_AI_MODE",
      "OPENAI_API_KEY",
      "GEMINI_API_KEY",
      "ANTHROPIC_API_KEY",
      "LOCAL_AI_BASE_URL",
      "LOCAL_AI_MODEL",
      "UMTUBA_AI_ALLOW_STUB",
      "UMTUBA_AI_TIMEOUT_MS",
    ],
  };
}
