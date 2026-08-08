/**
 * Sanitized Professional AI readiness summary for Translation Studio UX.
 * Never includes secrets, raw env values, or provider error bodies.
 */

import {
  assessLiveProfessionalProviderReadiness,
  type LiveProfessionalProviderReadinessReport,
} from "./liveProviderReadiness";
import { PROFESSIONAL_AI_AUTHORITY } from "./aiContracts";
import { loadProfessionalLiveModelPolicy } from "./liveProviderConfig";

export type ProfessionalAiUxReadinessStatus =
  | "READY"
  | "NOT_READY"
  | "DEGRADED";

export type ProfessionalAiUxReadinessSummary = {
  status: ProfessionalAiUxReadinessStatus;
  modeLabel: "live" | "offline_heuristic" | "unknown";
  overallReadiness: string;
  generatorProvider: string;
  reviewerProvider: string;
  generatorModelConfigured: boolean;
  reviewerModelConfigured: boolean;
  /** Safe model id strings only — never API keys. */
  generatorModelId: string | null;
  reviewerModelId: string | null;
  note: string;
  authority: {
    generatorCanApprove: false;
    reviewerCanPublish: false;
  };
  /** Env variable NAMES only — never values. */
  configVariableNames: readonly string[];
};

function modeFromAi(configMode: string | null | undefined): ProfessionalAiUxReadinessSummary["modeLabel"] {
  if (configMode === "live") return "live";
  if (configMode === "stub" || configMode === "disabled" || configMode == null) {
    return "offline_heuristic";
  }
  return "unknown";
}

/**
 * Build a UI-safe readiness chip model.
 * Uses readiness report + optional AI mode string (no secrets).
 */
export function buildProfessionalAiUxReadinessSummary(input?: {
  readiness?: LiveProfessionalProviderReadinessReport;
  aiMode?: string | null;
}): ProfessionalAiUxReadinessSummary {
  const readiness =
    input?.readiness ?? assessLiveProfessionalProviderReadiness();
  const policy = loadProfessionalLiveModelPolicy();
  const modeLabel = modeFromAi(input?.aiMode ?? readiness.aiMode);

  let status: ProfessionalAiUxReadinessStatus = "NOT_READY";
  let note = "Professional AI offline/heuristic pipeline is available.";

  if (readiness.overall === "LIVE_BENCHMARK_READY" && modeLabel === "live") {
    status = "READY";
    note = "Live professional AI path is ready for generate + review.";
  } else if (readiness.overall === "LIVE_PROVIDER_CONFIG_INVALID") {
    status = "DEGRADED";
    note =
      "Professional AI configuration is invalid; fail-closed. Offline/heuristic remains usable.";
  } else if (modeLabel === "live" && readiness.overall !== "LIVE_BENCHMARK_READY") {
    status = "DEGRADED";
    note =
      "Live mode selected but providers are not fully ready; offline/heuristic remains usable.";
  } else if (modeLabel === "offline_heuristic") {
    // Offline professional pipeline is always usable without paid providers.
    status = "READY";
    note =
      "Offline/heuristic professional pipeline ready. Live providers not configured.";
  } else {
    status = "NOT_READY";
    note =
      "Professional AI readiness unknown; fail-closed. Offline/heuristic may still work.";
  }

  return {
    status,
    modeLabel,
    overallReadiness: readiness.overall,
    generatorProvider: policy.generator.providerId,
    reviewerProvider: policy.reviewer.providerId,
    generatorModelConfigured: Boolean(policy.generator.modelId),
    reviewerModelConfigured: Boolean(policy.reviewer.modelId),
    generatorModelId: policy.generator.modelId || null,
    reviewerModelId: policy.reviewer.modelId || null,
    note,
    authority: {
      generatorCanApprove: PROFESSIONAL_AI_AUTHORITY.generatorCanApprove,
      reviewerCanPublish: PROFESSIONAL_AI_AUTHORITY.reviewerCanPublish,
    },
    configVariableNames: [
      "UMTUBA_AI_MODE",
      "PROFESSIONAL_TRANSLATION_GENERATOR_PROVIDER",
      "PROFESSIONAL_TRANSLATION_GENERATOR_MODEL",
      "PROFESSIONAL_TRANSLATION_REVIEWER_PROVIDER",
      "PROFESSIONAL_TRANSLATION_REVIEWER_MODEL",
    ],
  };
}
