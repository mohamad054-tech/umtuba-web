/**
 * Static audit summary of AI Core providers for professional translation readiness.
 * Code facts only — no env values.
 */

export type SupportedProviderAuditEntry = {
  providerId: "openai" | "gemini" | "anthropic" | "local" | "stub";
  adapterFiles: string[];
  requestContract: string;
  modelEnvNames: string[];
  structuredJsonSupport: "native_json_object" | "prompt_parse_only" | "fixture";
  timeoutBehavior: string;
  retryBehavior: string;
  secretHandling: string;
  usableViaTranslationSuggestToday: boolean;
  professionalQualityFitToday: "partial" | "no" | "transport_only";
  gaps: string[];
};

export const AI_CORE_PROVIDER_AUDIT_V1: SupportedProviderAuditEntry[] = [
  {
    providerId: "openai",
    adapterFiles: [
      "lib/ai/providers/adapters.ts (createOpenAiCompatibleAdapter)",
      "lib/ai/providers/foundation.ts",
    ],
    requestContract: "OpenAI Chat Completions POST /chat/completions",
    modelEnvNames: ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"],
    structuredJsonSupport: "native_json_object",
    timeoutBehavior: "AbortController; UMTUBA_AI_TIMEOUT_MS / model default",
    retryBehavior: "No gateway retry; HTTP 429 → rate_limited",
    secretHandling: "Server-only Bearer header; describeAiConfigStatus booleans only",
    usableViaTranslationSuggestToday: true,
    professionalQualityFitToday: "transport_only",
    gaps: [
      "Dedicated professional generate/review capabilities registered",
      "Live credentials still required for paid smoke (not activated)",
    ],
  },
  {
    providerId: "gemini",
    adapterFiles: [
      "lib/ai/providers/adapters.ts (createGeminiAdapter)",
      "lib/ai/providers/geminiAdapter.ts (alternate/streaming path)",
    ],
    requestContract: "Generative Language generateContent",
    modelEnvNames: ["GEMINI_API_KEY", "GEMINI_BASE_URL", "GEMINI_MODEL"],
    structuredJsonSupport: "native_json_object",
    timeoutBehavior: "AbortController; shared AI timeout",
    retryBehavior: "No gateway retry; 429 → rate_limited",
    secretHandling: "Server-only x-goog-api-key",
    usableViaTranslationSuggestToday: true,
    professionalQualityFitToday: "transport_only",
    gaps: [
      "Dual Gemini adapter implementations risk drift",
      "Dedicated professional caps available; live not activated",
    ],
  },
  {
    providerId: "anthropic",
    adapterFiles: ["lib/ai/providers/anthropicAdapter.ts"],
    requestContract: "Anthropic Messages API POST /messages",
    modelEnvNames: [
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_BASE_URL",
      "ANTHROPIC_MODEL",
    ],
    structuredJsonSupport: "prompt_parse_only",
    timeoutBehavior: "AbortController",
    retryBehavior: "No gateway retry; 429 → rate_limited",
    secretHandling: "Server-only x-api-key",
    usableViaTranslationSuggestToday: true,
    professionalQualityFitToday: "transport_only",
    gaps: [
      "Weaker structured JSON reliability vs OpenAI/Gemini",
      "Dedicated professional caps available; prefer as later independent reviewer",
    ],
  },
  {
    providerId: "local",
    adapterFiles: ["lib/ai/providers/localAdapter.ts"],
    requestContract: "OpenAI-compatible /chat/completions",
    modelEnvNames: ["LOCAL_AI_BASE_URL", "LOCAL_AI_API_KEY", "LOCAL_AI_MODEL"],
    structuredJsonSupport: "prompt_parse_only",
    timeoutBehavior: "AbortController",
    retryBehavior: "No gateway retry",
    secretHandling: "Optional Bearer; requires BASE_URL+MODEL",
    usableViaTranslationSuggestToday: true,
    professionalQualityFitToday: "transport_only",
    gaps: ["No response_format; not recommended for first live smoke"],
  },
  {
    providerId: "stub",
    adapterFiles: ["lib/ai/providers/adapters.ts (createStubAdapter)"],
    requestContract: "In-process fixture adapter",
    modelEnvNames: ["UMTUBA_AI_ALLOW_STUB"],
    structuredJsonSupport: "fixture",
    timeoutBehavior: "N/A",
    retryBehavior: "N/A",
    secretHandling: "N/A",
    usableViaTranslationSuggestToday: true,
    professionalQualityFitToday: "transport_only",
    gaps: ["Offline/CI fixtures only — not a live provider"],
  },
];

export const PROFESSIONAL_PROVIDER_SELECTION_PHILOSOPHY = [
  "Quality over cheapest price for sensitive copy",
  "Generator and Reviewer should use different providers/models when credible options exist",
  "Arabic natural MSA prioritized for AR benchmarks",
  "Hard placeholder/glossary failures disqualify",
  "Human review remains mandatory for sensitive domains",
  "Offline heuristic path remains usable when live not configured",
] as const;
