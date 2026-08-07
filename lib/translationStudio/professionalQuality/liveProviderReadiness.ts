/**
 * Live professional AI provider readiness preflight (no secrets printed).
 */

import {
  loadAiPlatformConfig,
  describeAiConfigStatus,
} from "../../ai/config";
import {
  loadProfessionalLiveModelPolicy,
  PROFESSIONAL_LIVE_ENV_NAMES,
  type ProfessionalLiveModelPolicy,
} from "./liveProviderConfig";

export type LiveProviderReadinessState =
  | "LIVE_PROVIDER_READY"
  | "LIVE_PROVIDER_NOT_CONFIGURED"
  | "LIVE_PROVIDER_CONFIG_INVALID";

export type LiveProfessionalProviderReadinessReport = {
  schemaVersion: 1;
  state: LiveProviderReadinessState;
  aiMode: "disabled" | "live" | "stub";
  providersConfigured: {
    openai: boolean;
    gemini: boolean;
    anthropic: boolean;
    local: boolean;
  };
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
  id: string,
  status: ReturnType<typeof describeAiConfigStatus>
): boolean {
  if (id === "openai") return status.openaiConfigured;
  if (id === "gemini") return status.geminiConfigured;
  if (id === "anthropic") return status.anthropicConfigured;
  if (id === "local") return status.localConfigured;
  if (id === "heuristic") return true;
  return false;
}

/**
 * Readiness helper — presence/shape only. Never prints key values.
 */
export function assessLiveProfessionalProviderReadiness(
  policy?: ProfessionalLiveModelPolicy
): LiveProfessionalProviderReadinessReport {
  const config = loadAiPlatformConfig();
  const status = describeAiConfigStatus(config);
  const modelPolicy = policy ?? loadProfessionalLiveModelPolicy();
  const gaps: string[] = [];

  // Known product gaps for professional live quality (from audit).
  gaps.push(
    "platform.translation_suggest schema is suggestion-only; professional review/generate contracts not yet dedicated capabilities"
  );
  gaps.push(
    "aiService strips result to candidateText/confidence/notes — professionalReview fields dropped"
  );
  gaps.push(
    "Anthropic/Local structured JSON is prompt-parse only (weaker than OpenAI/Gemini json modes)"
  );

  const anyProvider =
    status.openaiConfigured ||
    status.geminiConfigured ||
    status.anthropicConfigured ||
    status.localConfigured;

  const gen = modelPolicy.generator.providerId;
  const rev = modelPolicy.reviewer.providerId;
  const independentConfigured =
    gen !== "unset" &&
    rev !== "unset" &&
    (gen !== rev ||
      (Boolean(modelPolicy.generator.modelId) &&
        Boolean(modelPolicy.reviewer.modelId) &&
        modelPolicy.generator.modelId !== modelPolicy.reviewer.modelId));

  let state: LiveProviderReadinessState = "LIVE_PROVIDER_NOT_CONFIGURED";

  if (config.mode === "live" && !anyProvider) {
    state = "LIVE_PROVIDER_CONFIG_INVALID";
    gaps.push("UMTUBA_AI_MODE=live but no provider credentials/local configured");
  } else if (config.mode === "live" && anyProvider) {
    // Professional role providers must also resolve if explicitly set.
    if (gen !== "unset" && gen !== "heuristic" && !providerConfiguredFor(gen, status)) {
      state = "LIVE_PROVIDER_CONFIG_INVALID";
      gaps.push(`generator provider ${gen} not configured`);
    } else if (
      rev !== "unset" &&
      rev !== "heuristic" &&
      !providerConfiguredFor(rev, status)
    ) {
      state = "LIVE_PROVIDER_CONFIG_INVALID";
      gaps.push(`reviewer provider ${rev} not configured`);
    } else if (
      !modelPolicy.generator.modelId ||
      !modelPolicy.reviewer.modelId
    ) {
      // Live platform may use OPENAI_MODEL etc. — professional overrides optional.
      // Still READY for platform transport, but note professional model overrides unset.
      state = "LIVE_PROVIDER_READY";
      gaps.push(
        "Professional generator/reviewer model env overrides unset — will use platform defaults when wired"
      );
    } else {
      state = "LIVE_PROVIDER_READY";
    }
  } else {
    state = "LIVE_PROVIDER_NOT_CONFIGURED";
  }

  return {
    schemaVersion: 1,
    state,
    aiMode: config.mode,
    providersConfigured: {
      openai: status.openaiConfigured,
      gemini: status.geminiConfigured,
      anthropic: status.anthropicConfigured,
      local: status.localConfigured,
    },
    professionalPolicy: {
      generatorProvider: gen,
      reviewerProvider: rev,
      sensitiveReviewerProvider: modelPolicy.sensitiveReviewer.providerId,
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
