/**
 * Server-only AI platform configuration.
 * Never expose provider secrets to the client.
 */

export type AiPlatformConfig = {
  mode: "disabled" | "live" | "stub";
  openaiApiKey: string | null;
  openaiBaseUrl: string;
  openaiDefaultModel: string;
  geminiApiKey: string | null;
  geminiBaseUrl: string;
  geminiDefaultModel: string;
  allowStub: boolean;
  defaultTimeoutMs: number;
  maxInputChars: number;
  maxContextChars: number;
  rateLimitPerMinute: number;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasLiveProviderKey(
  openaiApiKey: string | null,
  geminiApiKey: string | null
): boolean {
  return Boolean(openaiApiKey || geminiApiKey);
}

export function loadAiPlatformConfig(
  overrides?: Partial<AiPlatformConfig>
): AiPlatformConfig {
  const explicitMode = (readEnv("UMTUBA_AI_MODE") ?? "").toLowerCase();
  const openaiApiKey = readEnv("OPENAI_API_KEY") ?? null;
  const geminiApiKey = readEnv("GEMINI_API_KEY") ?? null;
  const allowStub =
    (readEnv("UMTUBA_AI_ALLOW_STUB") ?? "").toLowerCase() === "1" ||
    (readEnv("UMTUBA_AI_ALLOW_STUB") ?? "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "test";

  let mode: AiPlatformConfig["mode"] = "disabled";
  if (explicitMode === "disabled" || explicitMode === "off") {
    mode = "disabled";
  } else if (explicitMode === "stub") {
    mode = allowStub ? "stub" : "disabled";
  } else if (explicitMode === "live") {
    mode = hasLiveProviderKey(openaiApiKey, geminiApiKey) ? "live" : "disabled";
  } else if (hasLiveProviderKey(openaiApiKey, geminiApiKey)) {
    mode = "live";
  } else if (allowStub) {
    mode = "stub";
  }

  const base: AiPlatformConfig = {
    mode,
    openaiApiKey,
    openaiBaseUrl:
      readEnv("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    openaiDefaultModel: readEnv("OPENAI_MODEL") ?? "gpt-4o-mini",
    geminiApiKey,
    geminiBaseUrl:
      readEnv("GEMINI_BASE_URL") ??
      "https://generativelanguage.googleapis.com/v1beta",
    geminiDefaultModel: readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash",
    allowStub,
    defaultTimeoutMs: Number(readEnv("UMTUBA_AI_TIMEOUT_MS") ?? 30000),
    maxInputChars: Number(readEnv("UMTUBA_AI_MAX_INPUT_CHARS") ?? 8000),
    maxContextChars: Number(readEnv("UMTUBA_AI_MAX_CONTEXT_CHARS") ?? 24000),
    rateLimitPerMinute: Number(readEnv("UMTUBA_AI_RATE_LIMIT_PER_MINUTE") ?? 20),
  };

  return { ...base, ...overrides };
}

export function describeAiConfigStatus(config: AiPlatformConfig): {
  mode: AiPlatformConfig["mode"];
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  stubEligible: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  const anyLiveKey = hasLiveProviderKey(
    config.openaiApiKey,
    config.geminiApiKey
  );
  if (config.mode === "live" && !anyLiveKey) {
    missing.push("OPENAI_API_KEY|GEMINI_API_KEY");
  }
  if (config.mode === "disabled") {
    missing.push("UMTUBA_AI_MODE/OPENAI_API_KEY|GEMINI_API_KEY");
  }
  return {
    mode: config.mode,
    openaiConfigured: Boolean(config.openaiApiKey),
    geminiConfigured: Boolean(config.geminiApiKey),
    stubEligible: config.allowStub,
    missing,
  };
}
