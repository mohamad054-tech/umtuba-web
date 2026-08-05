import type {
  AiCostClass,
  AiDataClassification,
  AiLatencyClass,
  AiModality,
} from "../contracts/types";

export type AiModelCapabilityClass =
  | "chat"
  | "structured"
  | "tools"
  | "embedding"
  | "moderation";

export type AiModelDefinition = {
  providerId: string;
  modelId: string;
  displayName: string;
  capabilityClasses: AiModelCapabilityClass[];
  inputModalities: AiModality[];
  outputModalities: AiModality[];
  contextLimitTokens: number;
  structuredOutputSupport: boolean;
  toolCallSupport: boolean;
  streamingSupport: boolean;
  available: boolean;
  costClass: AiCostClass;
  /** Estimated USD per 1M input tokens when known; null if unknown. */
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  dataHandlingMax: AiDataClassification;
  defaultTimeoutMs: number;
  fallbackEligible: boolean;
  latencyClass: AiLatencyClass;
};

export type AiProviderDefinition = {
  providerId: string;
  displayName: string;
  available: boolean;
  models: AiModelDefinition[];
};

export function buildProviderRegistry(input: {
  openaiConfigured: boolean;
  geminiConfigured?: boolean;
  anthropicConfigured?: boolean;
  localConfigured?: boolean;
  stubEligible: boolean;
  openaiDefaultModel: string;
  geminiDefaultModel?: string;
  anthropicDefaultModel?: string;
  localDefaultModel?: string | null;
  defaultTimeoutMs: number;
  /** Operator streaming gate (UMTUBA_AI_STREAMING). Default false. */
  streamingEnabled?: boolean;
}): AiProviderDefinition[] {
  const geminiConfigured = Boolean(input.geminiConfigured);
  const geminiDefaultModel = input.geminiDefaultModel ?? "gemini-2.5-flash";
  const anthropicConfigured = Boolean(input.anthropicConfigured);
  const anthropicDefaultModel =
    input.anthropicDefaultModel ?? "claude-haiku-4-5-20251001";
  const localConfigured = Boolean(input.localConfigured);
  const streamingSupport = Boolean(input.streamingEnabled);
  const providers: AiProviderDefinition[] = [];

  if (input.stubEligible) {
    providers.push({
      providerId: "stub",
      displayName: "UMTUBA Stub Provider",
      available: true,
      models: [
        {
          providerId: "stub",
          modelId: "stub-structured-v1",
          displayName: "Stub Structured V1",
          capabilityClasses: ["chat", "structured"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          contextLimitTokens: 32_000,
          structuredOutputSupport: true,
          toolCallSupport: false,
          streamingSupport,
          available: true,
          costClass: "economy",
          inputCostPer1M: 0,
          outputCostPer1M: 0,
          dataHandlingMax: "confidential",
          defaultTimeoutMs: 2_000,
          fallbackEligible: true,
          latencyClass: "low",
        },
      ],
    });
  }

  providers.push({
    providerId: "openai",
    displayName: "OpenAI-compatible",
    available: input.openaiConfigured,
    models: [
      {
        providerId: "openai",
        modelId: input.openaiDefaultModel,
        displayName: input.openaiDefaultModel,
        capabilityClasses: ["chat", "structured", "tools"],
        inputModalities: ["text"],
        outputModalities: ["text"],
        contextLimitTokens: 128_000,
        structuredOutputSupport: true,
        toolCallSupport: true,
        streamingSupport,
        available: input.openaiConfigured,
        costClass: "economy",
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.6,
        dataHandlingMax: "confidential",
        defaultTimeoutMs: input.defaultTimeoutMs,
        fallbackEligible: true,
        latencyClass: "standard",
      },
      {
        providerId: "openai",
        modelId: "gpt-4o",
        displayName: "GPT-4o",
        capabilityClasses: ["chat", "structured", "tools"],
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        contextLimitTokens: 128_000,
        structuredOutputSupport: true,
        toolCallSupport: true,
        streamingSupport,
        available: input.openaiConfigured,
        costClass: "premium",
        inputCostPer1M: 2.5,
        outputCostPer1M: 10,
        dataHandlingMax: "confidential",
        defaultTimeoutMs: input.defaultTimeoutMs,
        fallbackEligible: false,
        latencyClass: "standard",
      },
    ],
  });

  providers.push({
    providerId: "gemini",
    displayName: "Google Gemini",
    available: geminiConfigured,
    models: [
      {
        providerId: "gemini",
        modelId: geminiDefaultModel,
        displayName: geminiDefaultModel,
        capabilityClasses: ["chat", "structured"],
        inputModalities: ["text"],
        outputModalities: ["text"],
        contextLimitTokens: 1_000_000,
        structuredOutputSupport: true,
        toolCallSupport: false,
        streamingSupport,
        available: geminiConfigured,
        costClass: "economy",
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.6,
        dataHandlingMax: "confidential",
        defaultTimeoutMs: input.defaultTimeoutMs,
        fallbackEligible: true,
        latencyClass: "standard",
      },
    ],
  });

  providers.push({
    providerId: "anthropic",
    displayName: "Anthropic Claude",
    available: anthropicConfigured,
    models: [
      {
        providerId: "anthropic",
        modelId: anthropicDefaultModel,
        displayName: anthropicDefaultModel,
        capabilityClasses: ["chat", "structured"],
        inputModalities: ["text"],
        outputModalities: ["text"],
        contextLimitTokens: 200_000,
        structuredOutputSupport: true,
        toolCallSupport: false,
        streamingSupport,
        available: anthropicConfigured,
        costClass: "economy",
        inputCostPer1M: 1,
        outputCostPer1M: 5,
        dataHandlingMax: "confidential",
        defaultTimeoutMs: input.defaultTimeoutMs,
        fallbackEligible: true,
        latencyClass: "low",
      },
      {
        providerId: "anthropic",
        modelId: "claude-sonnet-5",
        displayName: "Claude Sonnet 5",
        capabilityClasses: ["chat", "structured"],
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        contextLimitTokens: 200_000,
        structuredOutputSupport: true,
        toolCallSupport: false,
        streamingSupport,
        available: anthropicConfigured,
        costClass: "premium",
        inputCostPer1M: 3,
        outputCostPer1M: 15,
        dataHandlingMax: "confidential",
        defaultTimeoutMs: input.defaultTimeoutMs,
        fallbackEligible: false,
        latencyClass: "standard",
      },
    ],
  });

  if (input.localDefaultModel != null && input.localDefaultModel.length > 0) {
    providers.push({
      providerId: "local",
      displayName: "Local / self-hosted (OpenAI-compatible)",
      available: localConfigured,
      models: [
        {
          providerId: "local",
          modelId: input.localDefaultModel,
          displayName: input.localDefaultModel,
          capabilityClasses: ["chat", "structured"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          contextLimitTokens: 32_000,
          structuredOutputSupport: true,
          toolCallSupport: false,
          streamingSupport,
          available: localConfigured,
          costClass: "economy",
          inputCostPer1M: 0,
          outputCostPer1M: 0,
          dataHandlingMax: "confidential",
          defaultTimeoutMs: input.defaultTimeoutMs,
          fallbackEligible: true,
          latencyClass: "low",
        },
      ],
    });
  } else {
    providers.push({
      providerId: "local",
      displayName: "Local / self-hosted (OpenAI-compatible)",
      available: false,
      models: [],
    });
  }

  return providers;
}

export function listAvailableModels(
  providers: AiProviderDefinition[]
): AiModelDefinition[] {
  return providers
    .filter((p) => p.available)
    .flatMap((p) => p.models.filter((m) => m.available));
}

export function findModel(
  providers: AiProviderDefinition[],
  providerId: string,
  modelId: string
): AiModelDefinition | null {
  const provider = providers.find((p) => p.providerId === providerId);
  if (!provider) return null;
  return provider.models.find((m) => m.modelId === modelId) ?? null;
}
