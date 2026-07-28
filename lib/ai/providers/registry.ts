import type {
  AiCostClass,
  AiDataClassification,
  AiLatencyClass,
  AiModality,
} from "../types";

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
  stubEligible: boolean;
  openaiDefaultModel: string;
  defaultTimeoutMs: number;
}): AiProviderDefinition[] {
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
          streamingSupport: false,
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
        streamingSupport: false,
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
        streamingSupport: false,
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
