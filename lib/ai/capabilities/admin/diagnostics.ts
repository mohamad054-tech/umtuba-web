import {
  describeAiConfigStatus,
  loadAiPlatformConfig,
} from "../../config";
import { listPromptDefinitions } from "../../prompts/registry";
import { buildProviderRegistry, listAvailableModels } from "../../models/registry";
import { listTools } from "../../tools/registry";
import { summarizeRunFailures, listRecentRuns } from "../../runs/lifecycle";
import { summarizeUsage } from "../../usage/accounting";
import { countTraceEventsByType } from "../../tracing/events";
import { ensureReferenceToolCatalog } from "../../tools/referenceBootstrap";

export type AiPlatformDiagnostics = {
  config: ReturnType<typeof describeAiConfigStatus>;
  providers: Array<{
    providerId: string;
    available: boolean;
    models: Array<{ modelId: string; available: boolean }>;
  }>;
  availableModelCount: number;
  prompts: Array<{
    promptId: string;
    version: string;
    status: string;
    capabilityId: string;
  }>;
  tools: Array<{
    toolId: string;
    available: boolean;
    mutating: boolean;
    domainOwner: string;
  }>;
  recentRuns: Array<{
    id: string;
    capabilityId: string;
    status: string;
    providerId: string | null;
    modelId: string | null;
    startedAt: string;
    errorCode: string | null;
  }>;
  failureCounts: ReturnType<typeof summarizeRunFailures>;
  safetyBlocks24h: number;
  usageSummary: ReturnType<typeof summarizeUsage>;
  retentionNote: string;
  costAvailabilityNote: string;
};

export function loadAiPlatformDiagnostics(): AiPlatformDiagnostics {
  ensureReferenceToolCatalog();
  const config = loadAiPlatformConfig();
  const status = describeAiConfigStatus(config);
  const providers = buildProviderRegistry({
    openaiConfigured: Boolean(config.openaiApiKey),
    geminiConfigured: Boolean(config.geminiApiKey),
    anthropicConfigured: Boolean(config.anthropicApiKey),
    localConfigured:
      Boolean(config.localBaseUrl) && Boolean(config.localDefaultModel),
    stubEligible: config.allowStub || config.mode === "stub",
    openaiDefaultModel: config.openaiDefaultModel,
    geminiDefaultModel: config.geminiDefaultModel,
    anthropicDefaultModel: config.anthropicDefaultModel,
    localDefaultModel: config.localDefaultModel,
    defaultTimeoutMs: config.defaultTimeoutMs,
  });

  return {
    config: status,
    providers: providers.map((p) => ({
      providerId: p.providerId,
      available: p.available,
      models: p.models.map((m) => ({
        modelId: m.modelId,
        available: m.available,
      })),
    })),
    availableModelCount: listAvailableModels(providers).length,
    prompts: listPromptDefinitions().map((p) => ({
      promptId: p.promptId,
      version: p.version,
      status: p.status,
      capabilityId: String(p.capabilityId),
    })),
    tools: listTools().map((t) => ({
      toolId: t.toolId,
      available: t.available,
      mutating: t.mutating,
      domainOwner: t.domainOwner,
    })),
    recentRuns: listRecentRuns(25).map((r) => ({
      id: r.id,
      capabilityId: r.capabilityId,
      status: r.status,
      providerId: r.providerId,
      modelId: r.modelId,
      startedAt: r.startedAt,
      errorCode: r.errorCode,
    })),
    failureCounts: summarizeRunFailures(200),
    safetyBlocks24h: countTraceEventsByType("safety_block"),
    usageSummary: summarizeUsage(200),
    retentionNote:
      "In-process run/trace/usage buffers are ephemeral until migration tables are applied. DB rows (when present) retain classification + timestamps for bounded retention.",
    costAvailabilityNote:
      "Cost is provider_reported, estimated, or unavailable — never fabricated.",
  };
}
