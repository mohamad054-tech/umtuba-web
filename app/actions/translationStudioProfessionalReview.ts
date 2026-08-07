"use server";

/**
 * Server-side professional AI review / generate actions.
 * Platform-admin only. Review-only paths do not mutate Studio state.
 * Generate may create a normal pending suggestion (never auto-approve/publish).
 * Glossary/style guides are server-built — not client-injected.
 */

import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  createFailClosedStubGenerator,
  createHeuristicProfessionalReviewer,
  createAiServiceProfessionalTransport,
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
  generateProfessionalTranslationCandidate,
  runProfessionalGenerateAndReview,
  runProfessionalTranslationReview,
  buildProfessionalSuggestionQuality,
  getTranslationStudioWorkflow,
  seedUmtubaOfficialTerminologyCatalog,
  PROFESSIONAL_AI_AUTHORITY,
  type StudioLanguageCode,
  type ProfessionalTranslationGenerator,
  type ProfessionalTranslationReviewer,
} from "../../lib/translationStudio";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

async function requireAdmin(): Promise<{ user: User; supabase: SupabaseClient }> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent("/admin/translation-studio")}`
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

function resolveDomainHint(
  namespaceName: string | null | undefined
): string | null {
  const n = (namespaceName ?? "").toLowerCase();
  if (n.includes("commerce") || n.includes("store")) return "commerce";
  if (n.includes("learning") || n.includes("course")) return "learning";
  if (n.includes("collab") || n.includes("workspace")) return "collaboration";
  if (n.includes("admin") || n.includes("translation")) return "admin";
  return null;
}

async function tryCreateLiveTransport(deps: {
  userId: string;
  supabase: SupabaseClient;
}) {
  const { runCapability } = await import("../../lib/ai/services/aiService");
  const { loadAiPlatformConfig } = await import("../../lib/ai/config");
  const config = loadAiPlatformConfig();
  if (config.mode !== "live") return null;
  return createAiServiceProfessionalTransport({
    runCapability: async (req) => {
      const capabilityId =
        req.capabilityId === "platform.translation_professional_review"
          ? "platform.translation_professional_review"
          : "platform.translation_professional_generate";
      const result = await runCapability(
        {
          capabilityId,
          input: req.input,
          context: {
            surface: req.context.surface,
            productDomain: "platform",
            locale: req.context.locale,
          },
        },
        { userId: deps.userId, supabase: deps.supabase }
      );
      if (!result.ok) {
        return {
          ok: false as const,
          error: { message: result.error.message },
        };
      }
      return {
        ok: true as const,
        data: {
          result: result.data.result as Record<string, unknown>,
          runId: result.data.runId,
        },
      };
    },
  });
}

async function resolveReviewer(deps: {
  userId: string;
  supabase: SupabaseClient;
}): Promise<ProfessionalTranslationReviewer> {
  try {
    const transport = await tryCreateLiveTransport(deps);
    if (transport) {
      return createTransportBackedProfessionalReviewer(transport);
    }
  } catch {
    // fall through to heuristic
  }
  return createHeuristicProfessionalReviewer();
}

async function resolveGenerator(deps: {
  userId: string;
  supabase: SupabaseClient;
}): Promise<ProfessionalTranslationGenerator> {
  try {
    const transport = await tryCreateLiveTransport(deps);
    if (transport) {
      return createTransportBackedProfessionalGenerator(transport);
    }
  } catch {
    // fall through
  }
  return createFailClosedStubGenerator();
}

function loadValueContext(valueId: string) {
  const workflow = getTranslationStudioWorkflow();
  const snapshot = workflow.getSnapshot();
  const value = snapshot.values.find((v) => v.id === valueId);
  if (!value) throw new Error("Unknown translation value.");
  const key = snapshot.keys.find((k) => k.id === value.keyId);
  if (!key) throw new Error("Unknown translation key.");
  const ns = snapshot.namespaces.find((n) => n.id === key.namespaceId);
  return {
    workflow,
    snapshot,
    value,
    key,
    namespaceName: ns?.name ?? null,
    domainHint: resolveDomainHint(ns?.name ?? key.namespaceId),
  };
}

/** A. Review current draft professionally — READ ONLY. */
export async function reviewProfessionalTranslationDraftAction(input: {
  valueId: string;
}): Promise<
  | {
      ok: true;
      recommendation: string;
      report: unknown;
      observation: unknown;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
      availability: unknown;
      suggestedRevision: string | null;
    }
  | { ok: false; error: string }
> {
  const { user, supabase } = await requireAdmin();
  try {
    const ctx = loadValueContext(input.valueId);
    const draftText = ctx.value.value ?? "";
    const reviewer = await resolveReviewer({ userId: user.id, supabase });
    const result = await runProfessionalTranslationReview({
      sourceText: ctx.key.sourceText,
      targetText: draftText,
      targetLocale: ctx.value.language as StudioLanguageCode,
      sourceLocale: "en",
      keyStableId: ctx.key.id,
      namespaceId: ctx.key.namespaceId,
      namespaceName: ctx.namespaceName,
      keyDescription: ctx.key.description ?? null,
      domainHint: ctx.domainHint,
      memoryEntries: ctx.snapshot.memory,
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
      reviewer,
    });
    return {
      ok: true,
      recommendation: result.recommendation,
      report: result.report,
      observation: result.observation,
      authority: result.authority,
      availability: result.availability,
      suggestedRevision: result.suggestedRevision,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "review_failed",
    };
  }
}

/** B. Generate professional candidate → normal suggestion only. */
export async function generateProfessionalTranslationCandidateAction(input: {
  valueId: string;
}): Promise<
  | {
      ok: true;
      suggestionId: string;
      candidateText: string;
      recommendationPreview: string | null;
      observation: unknown;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
    }
  | { ok: false; error: string }
> {
  const { user, supabase } = await requireAdmin();
  try {
    const ctx = loadValueContext(input.valueId);
    const generator = await resolveGenerator({ userId: user.id, supabase });
    const generated = await generateProfessionalTranslationCandidate({
      sourceText: ctx.key.sourceText,
      targetLocale: ctx.value.language as StudioLanguageCode,
      sourceLocale: "en",
      keyStableId: ctx.key.id,
      namespaceId: ctx.key.namespaceId,
      namespaceName: ctx.namespaceName,
      keyDescription: ctx.key.description ?? null,
      domainHint: ctx.domainHint,
      memoryEntries: ctx.snapshot.memory,
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
      generator,
    });
    if (!generated.ok) {
      return { ok: false, error: generated.failure.message };
    }

    const quality = buildProfessionalSuggestionQuality({
      base: {
        confidence: generated.candidate.confidence ?? 0.4,
        reusedFromMemory: false,
        terminologyHits: [],
        terminologyConflicts: [],
        providerVia: "stub",
        notes: "professional_quality_v1 candidate",
        ai: {
          providerId: generated.candidate.provider.providerId,
          modelId: generated.candidate.provider.modelId,
          timestamp: new Date().toISOString(),
          latencyMs: generated.observation.durationMs,
          confidence: generated.candidate.confidence ?? null,
          rawResponseRef: `studio://professional/${ctx.value.id}`,
        },
      },
      report: {
        schemaVersion: 1,
        keyStableId: ctx.key.id,
        locale: ctx.value.language as StudioLanguageCode,
        contextPackId: ctx.domainHint ?? "global",
        overallScore: generated.preflightScore.overall,
        dimensionScores: generated.preflightScore.dimensions.map((d) => ({
          dimension: d.dimension,
          score: d.score,
        })),
        deterministicFindings: generated.preflightScore.findings,
        reviewerFindings: [],
        glossaryCompliance: {
          applicableTerms: 0,
          blockingGlossaryFindings: 0,
        },
        recommendation: "HUMAN_REVIEW",
      },
      observation: generated.observation,
    });

    const suggestion = ctx.workflow.createProfessionalCandidateSuggestion({
      valueId: input.valueId,
      actor: { userId: user.id },
      candidateText: generated.candidate.candidateText,
      quality,
    });

    return {
      ok: true,
      suggestionId: suggestion.id,
      candidateText: suggestion.candidateText,
      recommendationPreview: "HUMAN_REVIEW",
      observation: generated.observation,
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "generate_failed",
    };
  }
}

/** C. Generate + review candidate → suggestion + report (no auto-approve). */
export async function generateAndReviewProfessionalTranslationAction(input: {
  valueId: string;
}): Promise<
  | {
      ok: true;
      suggestionId: string;
      candidateText: string;
      recommendation: string;
      report: unknown;
      observation: unknown;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
    }
  | { ok: false; error: string }
> {
  const { user, supabase } = await requireAdmin();
  try {
    const ctx = loadValueContext(input.valueId);
    const generator = await resolveGenerator({ userId: user.id, supabase });
    const reviewer = await resolveReviewer({ userId: user.id, supabase });
    const result = await runProfessionalGenerateAndReview({
      sourceText: ctx.key.sourceText,
      targetLocale: ctx.value.language as StudioLanguageCode,
      sourceLocale: "en",
      keyStableId: ctx.key.id,
      namespaceId: ctx.key.namespaceId,
      namespaceName: ctx.namespaceName,
      keyDescription: ctx.key.description ?? null,
      domainHint: ctx.domainHint,
      memoryEntries: ctx.snapshot.memory,
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
      generator,
      reviewer,
    });

    if (!result.candidateText) {
      return {
        ok: false,
        error: result.failure?.message ?? "generate_and_review_failed",
      };
    }

    const quality = buildProfessionalSuggestionQuality({
      base: {
        confidence: 0.45,
        reusedFromMemory: false,
        terminologyHits: [],
        terminologyConflicts: [],
        providerVia: "stub",
        notes: "professional_quality_v1 generate+review",
        ai: {
          providerId: result.observation.providerId,
          modelId: result.observation.modelId,
          timestamp: new Date().toISOString(),
          latencyMs: result.observation.durationMs,
          confidence: null,
          rawResponseRef: `studio://professional/${ctx.value.id}`,
        },
      },
      report:
        result.report ??
        ({
          schemaVersion: 1,
          keyStableId: ctx.key.id,
          locale: ctx.value.language,
          contextPackId: "global",
          overallScore: 0,
          dimensionScores: [],
          deterministicFindings: [],
          reviewerFindings: [],
          glossaryCompliance: {
            applicableTerms: 0,
            blockingGlossaryFindings: 0,
          },
          recommendation: result.recommendation,
        } as never),
      observation: result.observation,
    });

    const suggestion = ctx.workflow.createProfessionalCandidateSuggestion({
      valueId: input.valueId,
      actor: { userId: user.id },
      candidateText: result.candidateText,
      quality,
    });

    return {
      ok: true,
      suggestionId: suggestion.id,
      candidateText: suggestion.candidateText,
      recommendation: result.recommendation,
      report: result.report,
      observation: result.observation,
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "generate_and_review_failed",
    };
  }
}

/** Diagnostics: live professional transport configured? (no secrets). */
export async function getProfessionalAiRuntimeStatusAction(): Promise<{
  runtimeProviderConfigured: boolean;
  mode: string | null;
  note: string;
}> {
  await requireAdmin();
  try {
    const { loadAiPlatformConfig } = await import("../../lib/ai/config");
    const config = loadAiPlatformConfig();
    if (config.mode === "live") {
      return {
        runtimeProviderConfigured: true,
        mode: config.mode,
        note: "Live AI mode enabled for professional review adapter",
      };
    }
    return {
      runtimeProviderConfigured: false,
      mode: config.mode,
      note: "RUNTIME_PROVIDER_NOT_CONFIGURED",
    };
  } catch {
    return {
      runtimeProviderConfigured: false,
      mode: null,
      note: "RUNTIME_PROVIDER_NOT_CONFIGURED",
    };
  }
}
