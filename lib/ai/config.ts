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
  anthropicApiKey: string | null;
  anthropicBaseUrl: string;
  anthropicDefaultModel: string;
  /** OpenAI-compatible local/self-hosted base URL (no default — fail-closed). */
  localBaseUrl: string | null;
  /** Optional bearer token for gated local gateways. */
  localApiKey: string | null;
  /**
   * Operator-configured local model id (no cloud vendor default).
   * Required together with localBaseUrl for local to be executable.
   */
  localDefaultModel: string | null;
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

export function isLocalProviderConfigured(config: {
  localBaseUrl: string | null;
  localDefaultModel: string | null;
}): boolean {
  return Boolean(config.localBaseUrl && config.localDefaultModel);
}

function hasLiveProvider(
  openaiApiKey: string | null,
  geminiApiKey: string | null,
  anthropicApiKey: string | null,
  localConfigured: boolean
): boolean {
  return Boolean(
    openaiApiKey || geminiApiKey || anthropicApiKey || localConfigured
  );
}

export function loadAiPlatformConfig(
  overrides?: Partial<AiPlatformConfig>
): AiPlatformConfig {
  const explicitMode = (readEnv("UMTUBA_AI_MODE") ?? "").toLowerCase();
  const openaiApiKey = readEnv("OPENAI_API_KEY") ?? null;
  const geminiApiKey = readEnv("GEMINI_API_KEY") ?? null;
  const anthropicApiKey = readEnv("ANTHROPIC_API_KEY") ?? null;
  const localBaseUrl = readEnv("LOCAL_AI_BASE_URL") ?? null;
  const localApiKey = readEnv("LOCAL_AI_API_KEY") ?? null;
  const localDefaultModel = readEnv("LOCAL_AI_MODEL") ?? null;
  const localConfigured = isLocalProviderConfigured({
    localBaseUrl,
    localDefaultModel,
  });
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
    mode = hasLiveProvider(
      openaiApiKey,
      geminiApiKey,
      anthropicApiKey,
      localConfigured
    )
      ? "live"
      : "disabled";
  } else if (
    hasLiveProvider(openaiApiKey, geminiApiKey, anthropicApiKey, localConfigured)
  ) {
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
    anthropicApiKey,
    anthropicBaseUrl:
      readEnv("ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com/v1",
    // Exact dated Haiku snapshot (stable Flash-class default; not a latest alias).
    anthropicDefaultModel:
      readEnv("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001",
    localBaseUrl,
    localApiKey,
    localDefaultModel,
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
  anthropicConfigured: boolean;
  localConfigured: boolean;
  stubEligible: boolean;
  missing: string[];
} {
  const localConfigured = isLocalProviderConfigured(config);
  const missing: string[] = [];
  if (
    config.mode === "live" &&
    !config.openaiApiKey &&
    !config.geminiApiKey &&
    !config.anthropicApiKey &&
    !localConfigured
  ) {
    missing.push(
      "OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|LOCAL_AI_BASE_URL+LOCAL_AI_MODEL"
    );
  }
  if (config.mode === "disabled") {
    missing.push(
      "UMTUBA_AI_MODE/OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|LOCAL_AI_BASE_URL+LOCAL_AI_MODEL"
    );
  }
  return {
    mode: config.mode,
    openaiConfigured: Boolean(config.openaiApiKey),
    geminiConfigured: Boolean(config.geminiApiKey),
    anthropicConfigured: Boolean(config.anthropicApiKey),
    localConfigured,
    stubEligible: config.allowStub,
    missing,
  };
}
