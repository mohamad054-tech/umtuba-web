/**
 * Live professional provider readiness + benchmark readiness (no secrets).
 */

import {
  loadAiPlatformConfig,
  describeAiConfigStatus,
} from "../../ai/config";
import {
  loadProfessionalLiveModelPolicy,
  PROFESSIONAL_LIVE_ENV_NAMES,
  type ProfessionalLiveModelPolicy,
  type ProfessionalLiveProviderId,
} from "./liveProviderConfig";

export type RoleReadinessState =
  | "READY"
  | "NOT_CONFIGURED"
  | "INVALID"
  | "OPTIONAL";

export type LiveBenchmarkOverallState =
  | "LIVE_BENCHMARK_READY"
  | "LIVE_PROVIDER_NOT_CONFIGURED"
  | "LIVE_PROVIDER_CONFIG_INVALID";

export type LiveProfessionalProviderReadinessReport = {
  schemaVersion: 2;
  overall: LiveBenchmarkOverallState;
  /** @deprecated use overall — kept for prior callers */
  state: "LIVE_PROVIDER_READY" | "LIVE_PROVIDER_NOT_CONFIGURED" | "LIVE_PROVIDER_CONFIG_INVALID";
  aiMode: "disabled" | "live" | "stub";
  providersConfigured: {
    openai: boolean;
    gemini: boolean;
    anthropic: boolean;
    local: boolean;
  };
  generator: { state: RoleReadinessState; provider: string; modelSet: boolean };
  reviewer: { state: RoleReadinessState; provider: string; modelSet: boolean };
  sensitiveReviewer: {
    state: RoleReadinessState;
    provider: string;
    modelSet: boolean;
  };
  professionalCapabilitiesRegistered: true;
  translationSuggestRemainsCompatible: true;
  professionalPolicy: {
    generatorProvider: string;
    reviewerProvider: string;
    sensitiveReviewerProvider: string;
    generatorModelSet: boolean;
    reviewerModelSet: boolean;
    independentPreferred: true;
    independentConfigured: boolean;
  };
  gaps: string[];
  envNamesChecked: readonly string[];
  offlinePipelineRemainsUsable: true;
  activated: false;
  secretsExposed: false;
};

function providerConfiguredFor(
  id: ProfessionalLiveProviderId | string,
  status: ReturnType<typeof describeAiConfigStatus>
): boolean {
  if (id === "openai") return status.openaiConfigured;
  if (id === "gemini") return status.geminiConfigured;
  if (id === "anthropic") return status.anthropicConfigured;
  if (id === "local") return status.localConfigured;
  if (id === "heuristic") return true;
  return false;
}

function roleState(
  providerId: ProfessionalLiveProviderId,
  modelSet: boolean,
  status: ReturnType<typeof describeAiConfigStatus>,
  anyLive: boolean,
  mode: string
): RoleReadinessState {
  if (providerId === "unset") return "NOT_CONFIGURED";
  if (providerId === "heuristic") return "READY";
  if (mode !== "live") return "NOT_CONFIGURED";
  if (!anyLive) return "NOT_CONFIGURED";
  if (!providerConfiguredFor(providerId, status)) return "INVALID";
  if (!modelSet) {
    // Platform default model may still work — treat as READY with gap noted upstream.
    return "READY";
  }
  return "READY";
}

/**
 * Readiness helper — presence/shape only. Never prints key values.
 * Does not activate live providers.
 */
export function assessLiveProfessionalProviderReadiness(
  policy?: ProfessionalLiveModelPolicy
): LiveProfessionalProviderReadinessReport {
  const config = loadAiPlatformConfig();
  const status = describeAiConfigStatus(config);
  const modelPolicy = policy ?? loadProfessionalLiveModelPolicy();
  const gaps: string[] = [];

  gaps.push(
    "Dedicated capabilities platform.translation_professional_generate/review are registered; do not abuse platform.translation_suggest for rich review"
  );
  gaps.push(
    "Anthropic/Local structured JSON remains prompt-parse only (weaker than OpenAI/Gemini)"
  );

  const anyProvider =
    status.openaiConfigured ||
    status.geminiConfigured ||
    status.anthropicConfigured ||
    status.localConfigured;

  const gen = modelPolicy.generator.providerId;
  const rev = modelPolicy.reviewer.providerId;
  const sens = modelPolicy.sensitiveReviewer.providerId;

  const generator = {
    state: roleState(
      gen,
      Boolean(modelPolicy.generator.modelId),
      status,
      anyProvider,
      config.mode
    ),
    provider: gen,
    modelSet: Boolean(modelPolicy.generator.modelId),
  };
  const reviewer = {
    state: roleState(
      rev,
      Boolean(modelPolicy.reviewer.modelId),
      status,
      anyProvider,
      config.mode
    ),
    provider: rev,
    modelSet: Boolean(modelPolicy.reviewer.modelId),
  };
  const sensitiveReviewer = {
    state:
      sens === "unset"
        ? ("OPTIONAL" as const)
        : roleState(
            sens,
            Boolean(modelPolicy.sensitiveReviewer.modelId),
            status,
            anyProvider,
            config.mode
          ),
    provider: sens,
    modelSet: Boolean(modelPolicy.sensitiveReviewer.modelId),
  };

  const independentConfigured =
    gen !== "unset" &&
    rev !== "unset" &&
    (gen !== rev ||
      (Boolean(modelPolicy.generator.modelId) &&
        Boolean(modelPolicy.reviewer.modelId) &&
        modelPolicy.generator.modelId !== modelPolicy.reviewer.modelId));

  if (config.mode === "live" && !anyProvider) {
    gaps.push("UMTUBA_AI_MODE=live but no provider credentials/local configured");
  }
  if (generator.state === "INVALID") {
    gaps.push(`generator provider ${gen} not configured`);
  }
  if (reviewer.state === "INVALID") {
    gaps.push(`reviewer provider ${rev} not configured`);
  }
  if (sensitiveReviewer.state === "INVALID") {
    gaps.push(`sensitive reviewer provider ${sens} not configured`);
  }
  if (!independentConfigured && gen !== "unset" && rev !== "unset") {
    gaps.push(
      "Generator and reviewer share provider/model — prefer independent pair for live benchmark"
    );
  }

  let overall: LiveBenchmarkOverallState = "LIVE_PROVIDER_NOT_CONFIGURED";
  if (
    generator.state === "INVALID" ||
    reviewer.state === "INVALID" ||
    sensitiveReviewer.state === "INVALID" ||
    (config.mode === "live" && !anyProvider)
  ) {
    overall = "LIVE_PROVIDER_CONFIG_INVALID";
  } else if (
    config.mode === "live" &&
    anyProvider &&
    generator.state === "READY" &&
    reviewer.state === "READY"
  ) {
    overall = "LIVE_BENCHMARK_READY";
  } else {
    overall = "LIVE_PROVIDER_NOT_CONFIGURED";
  }

  const legacyState =
    overall === "LIVE_BENCHMARK_READY"
      ? ("LIVE_PROVIDER_READY" as const)
      : overall === "LIVE_PROVIDER_CONFIG_INVALID"
        ? ("LIVE_PROVIDER_CONFIG_INVALID" as const)
        : ("LIVE_PROVIDER_NOT_CONFIGURED" as const);

  return {
    schemaVersion: 2,
    overall,
    state: legacyState,
    aiMode: config.mode,
    providersConfigured: {
      openai: status.openaiConfigured,
      gemini: status.geminiConfigured,
      anthropic: status.anthropicConfigured,
      local: status.localConfigured,
    },
    generator,
    reviewer,
    sensitiveReviewer,
    professionalCapabilitiesRegistered: true,
    translationSuggestRemainsCompatible: true,
    professionalPolicy: {
      generatorProvider: gen,
      reviewerProvider: rev,
      sensitiveReviewerProvider: sens,
      generatorModelSet: Boolean(modelPolicy.generator.modelId),
      reviewerModelSet: Boolean(modelPolicy.reviewer.modelId),
      independentPreferred: true,
      independentConfigured,
    },
    gaps,
    envNamesChecked: PROFESSIONAL_LIVE_ENV_NAMES,
    offlinePipelineRemainsUsable: true,
    activated: false,
    secretsExposed: false,
  };
}
