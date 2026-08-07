/**
 * Provider technical eligibility for first small smoke (architecture only).
 * No translation-quality winner without live evidence.
 */

export type SmallSmokeEligibilityClass =
  | "READY_ARCHITECTURALLY"
  | "WEAKER_STRUCTURED_OUTPUT"
  | "NOT_RECOMMENDED_FOR_FIRST_SMOKE";

export type SmallSmokeProviderEligibility = {
  providerId: "openai" | "gemini" | "anthropic" | "local" | "stub";
  classification: SmallSmokeEligibilityClass;
  structuredJsonEvidence: string;
  dedicatedProfessionalCapsSupported: true;
  notes: string[];
};

/**
 * Classification from repository adapter evidence only — not quality scores.
 */
export const SMALL_SMOKE_PROVIDER_ELIGIBILITY: SmallSmokeProviderEligibility[] =
  [
    {
      providerId: "openai",
      classification: "READY_ARCHITECTURALLY",
      structuredJsonEvidence: "response_format json_object on Chat Completions",
      dedicatedProfessionalCapsSupported: true,
      notes: [
        "Strongest existing structured JSON mechanism in repo adapters",
        "Eligible for first small-smoke generator and/or independent reviewer",
      ],
    },
    {
      providerId: "gemini",
      classification: "READY_ARCHITECTURALLY",
      structuredJsonEvidence: "responseMimeType application/json",
      dedicatedProfessionalCapsSupported: true,
      notes: [
        "Native structured JSON path present",
        "Eligible for first small-smoke matrix pairs",
      ],
    },
    {
      providerId: "anthropic",
      classification: "WEAKER_STRUCTURED_OUTPUT",
      structuredJsonEvidence:
        "Prompt-steered JSON + fail-closed parse (no open json_schema)",
      dedicatedProfessionalCapsSupported: true,
      notes: [
        "Usable later for independent reviewer once smoke reliability proven",
        "Not preferred as sole first-smoke generator without stronger schema support",
      ],
    },
    {
      providerId: "local",
      classification: "NOT_RECOMMENDED_FOR_FIRST_SMOKE",
      structuredJsonEvidence: "OpenAI-compatible without response_format",
      dedicatedProfessionalCapsSupported: true,
      notes: [
        "Operator-dependent model quality",
        "Prefer after cloud structured reliability baseline",
      ],
    },
    {
      providerId: "stub",
      classification: "NOT_RECOMMENDED_FOR_FIRST_SMOKE",
      structuredJsonEvidence: "In-process fixtures only",
      dedicatedProfessionalCapsSupported: true,
      notes: ["Offline proof / CI only — not a live provider"],
    },
  ];

/**
 * Safest first configuration pattern (conceptual — not a permanent winner).
 * Prefers strongest structured reliability + independent generator/reviewer.
 */
export const RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN = {
  schemaVersion: 1 as const,
  generatorProviderPreference: ["openai", "gemini"] as const,
  reviewerProviderPreference: ["gemini", "openai"] as const,
  preferIndependentPair: true,
  sensitiveReviewer: "optional_if_configured_else_normal_plus_human_gate" as const,
  rationale: [
    "OpenAI and Gemini have strongest structured JSON adapter support today",
    "Independent generator/reviewer preferred when both configured",
    "Anthropic usable later as independent reviewer after structured reliability smoke",
    "Local/stub not for first paid live smoke",
    "Does NOT declare translation-quality winner",
  ],
  exampleMatrixSlots: [
    "openai(generator) × gemini(reviewer)",
    "gemini(generator) × openai(reviewer)",
    "openai(generator) × openai(reviewer-different-model) — acceptable if models differ",
  ],
} as const;

export const SMALL_SMOKE_CONFIG_VARIABLE_NAMES = [
  "UMTUBA_AI_MODE",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_BASE_URL",
  "LOCAL_AI_BASE_URL",
  "LOCAL_AI_API_KEY",
  "LOCAL_AI_MODEL",
  "PROFESSIONAL_TRANSLATION_GENERATOR_PROVIDER",
  "PROFESSIONAL_TRANSLATION_GENERATOR_MODEL",
  "PROFESSIONAL_TRANSLATION_REVIEWER_PROVIDER",
  "PROFESSIONAL_TRANSLATION_REVIEWER_MODEL",
  "PROFESSIONAL_TRANSLATION_SENSITIVE_REVIEWER_PROVIDER",
  "PROFESSIONAL_TRANSLATION_SENSITIVE_REVIEWER_MODEL",
  "PROFESSIONAL_TRANSLATION_GEN_TIMEOUT_MS",
  "PROFESSIONAL_TRANSLATION_REV_TIMEOUT_MS",
  "PROFESSIONAL_TRANSLATION_GEN_MAX_RETRIES",
  "PROFESSIONAL_TRANSLATION_REV_MAX_RETRIES",
  "UMTUBA_PROFESSIONAL_SMOKE_MAX_CALLS",
  "UMTUBA_PROFESSIONAL_SMOKE_EXPLICIT_GO",
] as const;
