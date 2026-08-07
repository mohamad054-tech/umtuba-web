/**
 * Centralized live professional AI model/provider configuration (server-only).
 * READINESS ONLY — does not activate providers or read secret values into reports.
 *
 * Env names (override safely later):
 * - UMTUBA_PROFESSIONAL_GENERATOR_PROVIDER
 * - UMTUBA_PROFESSIONAL_GENERATOR_MODEL
 * - UMTUBA_PROFESSIONAL_REVIEWER_PROVIDER
 * - UMTUBA_PROFESSIONAL_REVIEWER_MODEL
 * - UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_PROVIDER
 * - UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_MODEL
 * - UMTUBA_PROFESSIONAL_GEN_TIMEOUT_MS
 * - UMTUBA_PROFESSIONAL_REV_TIMEOUT_MS
 * - UMTUBA_PROFESSIONAL_GEN_MAX_RETRIES
 * - UMTUBA_PROFESSIONAL_REV_MAX_RETRIES
 */

export type ProfessionalLiveProviderId =
  | "openai"
  | "gemini"
  | "anthropic"
  | "local"
  | "heuristic"
  | "unset";

export type ProfessionalLiveRoleConfig = {
  providerId: ProfessionalLiveProviderId;
  /** Model id label — empty when unset; never a secret. */
  modelId: string;
};

export type ProfessionalLiveTimeoutRetryPolicy = {
  generationTimeoutMs: number;
  reviewTimeoutMs: number;
  generationMaxRetries: number;
  reviewMaxRetries: number;
};

export type ProfessionalLiveModelPolicy = {
  schemaVersion: 1;
  generator: ProfessionalLiveRoleConfig;
  reviewer: ProfessionalLiveRoleConfig;
  sensitiveReviewer: ProfessionalLiveRoleConfig;
  timeouts: {
    generationTimeoutMs: number;
    reviewTimeoutMs: number;
    generationMaxRetries: number;
    reviewMaxRetries: number;
  };
  /**
   * Prefer independent reviewer provider/model from generator when both configured.
   */
  preferIndependentReviewer: true;
  /** Philosophy notes for operators — not executed. */
  selectionGoals: string[];
};

function readEnvName(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function parseProviderId(raw: string | undefined): ProfessionalLiveProviderId {
  const v = (raw ?? "").toLowerCase();
  if (v === "openai" || v === "gemini" || v === "anthropic" || v === "local") {
    return v;
  }
  if (v === "heuristic") return "heuristic";
  return "unset";
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/**
 * Load centralized professional live model policy from env (names only meaningful).
 * Missing overrides → unset — readiness helper reports NOT_CONFIGURED.
 */
export function loadProfessionalLiveModelPolicy(): ProfessionalLiveModelPolicy {
  return {
    schemaVersion: 1,
    generator: {
      providerId: parseProviderId(
        readEnvName("UMTUBA_PROFESSIONAL_GENERATOR_PROVIDER")
      ),
      modelId: readEnvName("UMTUBA_PROFESSIONAL_GENERATOR_MODEL") ?? "",
    },
    reviewer: {
      providerId: parseProviderId(
        readEnvName("UMTUBA_PROFESSIONAL_REVIEWER_PROVIDER")
      ),
      modelId: readEnvName("UMTUBA_PROFESSIONAL_REVIEWER_MODEL") ?? "",
    },
    sensitiveReviewer: {
      providerId: parseProviderId(
        readEnvName("UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_PROVIDER") ??
          readEnvName("UMTUBA_PROFESSIONAL_REVIEWER_PROVIDER")
      ),
      modelId:
        readEnvName("UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_MODEL") ??
        readEnvName("UMTUBA_PROFESSIONAL_REVIEWER_MODEL") ??
        "",
    },
    timeouts: {
      generationTimeoutMs: parsePositiveInt(
        readEnvName("UMTUBA_PROFESSIONAL_GEN_TIMEOUT_MS"),
        20_000
      ),
      reviewTimeoutMs: parsePositiveInt(
        readEnvName("UMTUBA_PROFESSIONAL_REV_TIMEOUT_MS"),
        20_000
      ),
      generationMaxRetries: Math.min(
        2,
        parsePositiveInt(readEnvName("UMTUBA_PROFESSIONAL_GEN_MAX_RETRIES"), 1)
      ),
      reviewMaxRetries: Math.min(
        2,
        parsePositiveInt(readEnvName("UMTUBA_PROFESSIONAL_REV_MAX_RETRIES"), 1)
      ),
    },
    preferIndependentReviewer: true,
    selectionGoals: [
      "semantic_accuracy",
      "natural_arabic",
      "terminology_compliance",
      "instruction_following",
      "structured_json_reliability",
      "contextual_localization",
      "fr_es_de_pt_quality",
      "latency",
      "cost",
      "availability",
      "failure_rate",
    ],
  };
}

/** Env variable names relevant to live professional activation (never values). */
export const PROFESSIONAL_LIVE_ENV_NAMES = [
  "UMTUBA_AI_MODE",
  "UMTUBA_AI_ALLOW_STUB",
  "UMTUBA_AI_TIMEOUT_MS",
  "UMTUBA_AI_MAX_INPUT_CHARS",
  "UMTUBA_AI_MAX_CONTEXT_CHARS",
  "UMTUBA_AI_RATE_LIMIT_PER_MINUTE",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_BASE_URL",
  "GEMINI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "LOCAL_AI_BASE_URL",
  "LOCAL_AI_API_KEY",
  "LOCAL_AI_MODEL",
  "UMTUBA_PROFESSIONAL_GENERATOR_PROVIDER",
  "UMTUBA_PROFESSIONAL_GENERATOR_MODEL",
  "UMTUBA_PROFESSIONAL_REVIEWER_PROVIDER",
  "UMTUBA_PROFESSIONAL_REVIEWER_MODEL",
  "UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_PROVIDER",
  "UMTUBA_PROFESSIONAL_SENSITIVE_REVIEWER_MODEL",
  "UMTUBA_PROFESSIONAL_GEN_TIMEOUT_MS",
  "UMTUBA_PROFESSIONAL_REV_TIMEOUT_MS",
  "UMTUBA_PROFESSIONAL_GEN_MAX_RETRIES",
  "UMTUBA_PROFESSIONAL_REV_MAX_RETRIES",
] as const;
