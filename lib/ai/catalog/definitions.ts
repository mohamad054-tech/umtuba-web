import { LEARNING_TUTOR_CAPABILITIES } from "../capabilities/learning/tutorRunner";
import { AI_CAPABILITY_CATALOG as PRIVATE_AI_DOMAIN_CATALOG } from "../../privateAi/capabilities";
import type { AiCapabilityCatalogEntry } from "./types";

const NOW = "1970-01-01T00:00:00.000Z";

function basePolicies(partial?: Partial<AiCapabilityCatalogEntry["executionPolicy"]>): {
  timeoutPolicy: AiCapabilityCatalogEntry["timeoutPolicy"];
  retryPolicy: AiCapabilityCatalogEntry["retryPolicy"];
  budgetPolicy: AiCapabilityCatalogEntry["budgetPolicy"];
  quotaPolicy: AiCapabilityCatalogEntry["quotaPolicy"];
  auditPolicy: AiCapabilityCatalogEntry["auditPolicy"];
  executionPolicy: AiCapabilityCatalogEntry["executionPolicy"];
} {
  const executionPolicy = {
    timeoutMs: 30_000,
    maxAttempts: 2,
    retryDelayMs: 500,
    budgetUnits: 1,
    quotaPerDay: null as number | null,
    auditRequired: true,
    requireStructuredOutput: false,
    allowStreaming: false,
    ...partial,
  };
  return {
    timeoutPolicy: {
      defaultTimeoutMs: executionPolicy.timeoutMs ?? 30_000,
      maxTimeoutMs: 120_000,
    },
    retryPolicy: {
      maxAttempts: executionPolicy.maxAttempts ?? 2,
      retryDelayMs: executionPolicy.retryDelayMs ?? 500,
    },
    budgetPolicy: { defaultUnits: executionPolicy.budgetUnits ?? 1 },
    quotaPolicy: { dailyHint: executionPolicy.quotaPerDay },
    auditPolicy: {
      required: executionPolicy.auditRequired,
      retainDays: 90,
    },
    executionPolicy,
  };
}

function sharedEntry(
  input: Omit<
    AiCapabilityCatalogEntry,
    | "timeoutPolicy"
    | "retryPolicy"
    | "budgetPolicy"
    | "quotaPolicy"
    | "auditPolicy"
    | "executionPolicy"
    | "registeredAt"
    | "updatedAt"
    | "deprecated"
    | "deprecatedReason"
    | "replacementCapabilityId"
    | "privateAiDomainId"
    | "executable"
    | "executionSurface"
  > & {
    executionPolicy?: Partial<AiCapabilityCatalogEntry["executionPolicy"]>;
    privateAiDomainId?: string | null;
    deprecated?: boolean;
    deprecatedReason?: string | null;
    replacementCapabilityId?: string | null;
    executable?: boolean;
    executionSurface?: AiCapabilityCatalogEntry["executionSurface"];
  }
): AiCapabilityCatalogEntry {
  const policies = basePolicies(input.executionPolicy);
  return {
    capabilityId: input.capabilityId,
    displayName: input.displayName,
    description: input.description,
    category: input.category,
    owner: input.owner,
    version: input.version,
    stability: input.stability,
    visibility: input.visibility,
    lifecycle: input.lifecycle,
    executable: input.executable ?? true,
    executionSurface: input.executionSurface ?? "shared_ai_service",
    requiredPermissions: input.requiredPermissions,
    supportedProviders: input.supportedProviders,
    supportedRuntimes: input.supportedRuntimes,
    requiredModels: input.requiredModels,
    structuredOutputSupport: input.structuredOutputSupport,
    streamingSupport: input.streamingSupport,
    ...policies,
    deprecated: input.deprecated ?? false,
    deprecatedReason: input.deprecatedReason ?? null,
    replacementCapabilityId: input.replacementCapabilityId ?? null,
    documentation: input.documentation,
    privateAiDomainId: input.privateAiDomainId ?? null,
    registeredAt: NOW,
    updatedAt: NOW,
  };
}

const TUTOR_DISPLAY: Record<string, { name: string; description: string }> = {
  "learning.tutor.explain_lesson": {
    name: "Explain Lesson",
    description: "Learning tutor explains a published lesson for the learner.",
  },
  "learning.tutor.summarize_lesson": {
    name: "Summarize Lesson",
    description: "Learning tutor summarizes a published lesson.",
  },
  "learning.tutor.answer_question": {
    name: "Answer Question",
    description: "Learning tutor answers a learner question with grounding.",
  },
  "learning.tutor.generate_practice": {
    name: "Generate Practice",
    description: "Learning tutor generates practice prompts for a lesson.",
  },
  "learning.tutor.explain_wrong_answer": {
    name: "Explain Wrong Answer",
    description: "Learning tutor explains a wrong attempt without revealing keys.",
  },
  "learning.tutor.give_hint": {
    name: "Give Hint",
    description: "Learning tutor provides a bounded hint.",
  },
  "learning.tutor.explain_again": {
    name: "Explain Again",
    description: "Learning tutor re-explains with alternate framing.",
  },
};

/**
 * Built-in catalog from real project capabilities only.
 * No invented product capabilities.
 */
export function buildBuiltinCapabilityCatalogEntries(): AiCapabilityCatalogEntry[] {
  const sharedProviders = [
    "openai",
    "gemini",
    "anthropic",
    "local",
    "stub",
  ];
  const sharedRuntimes = ["shared_ai_gateway"];

  const core: AiCapabilityCatalogEntry[] = [
    sharedEntry({
      capabilityId: "commerce.product_draft_assistant",
      displayName: "Product Draft Assistant",
      description:
        "Commerce product draft assistance via Shared AI aiService.",
      category: "commerce",
      owner: "commerce",
      version: "1.0.0",
      stability: "stable",
      visibility: "authenticated",
      lifecycle: "active",
      requiredPermissions: ["authenticated", "commerce.product_read"],
      supportedProviders: sharedProviders,
      supportedRuntimes: sharedRuntimes,
      requiredModels: [],
      structuredOutputSupport: true,
      streamingSupport: false,
      privateAiDomainId: "commerce",
      documentation: {
        summary: "Registered in aiService → runProductDraftAssistant.",
        docsPath: "lib/ai/capabilities/commerce/productDraftAssistant.ts",
        sourceModule: "lib/ai/services/aiService.ts",
      },
      executionPolicy: { requireStructuredOutput: true },
    }),
    sharedEntry({
      capabilityId: "platform.translation_suggest",
      displayName: "Translation Suggest",
      description:
        "Platform translation suggestions used by Translation Studio.",
      category: "translation",
      owner: "platform",
      version: "1.0.0",
      stability: "stable",
      visibility: "authenticated",
      lifecycle: "active",
      requiredPermissions: ["authenticated"],
      supportedProviders: sharedProviders,
      supportedRuntimes: sharedRuntimes,
      requiredModels: [],
      structuredOutputSupport: true,
      streamingSupport: false,
      privateAiDomainId: "translation",
      documentation: {
        summary: "aiService → gateway; consumed by Translation Studio port.",
        docsPath: "lib/translationStudio/ai/translationAiPort.ts",
        sourceModule: "lib/ai/services/aiService.ts",
      },
    }),
    sharedEntry({
      capabilityId: "platform.diagnostics_probe",
      displayName: "Diagnostics Probe",
      description: "Internal Shared AI diagnostics probe (admin).",
      category: "admin",
      owner: "platform",
      version: "1.0.0",
      stability: "stable",
      visibility: "admin",
      lifecycle: "active",
      requiredPermissions: ["platform_admin"],
      supportedProviders: sharedProviders,
      supportedRuntimes: sharedRuntimes,
      requiredModels: [],
      structuredOutputSupport: true,
      streamingSupport: false,
      documentation: {
        summary: "aiService diagnostics path via executeAiGateway.",
        docsPath: "lib/ai/capabilities/admin/diagnostics.ts",
        sourceModule: "lib/ai/services/aiService.ts",
      },
    }),
    sharedEntry({
      capabilityId: "assistant.runtime_turn",
      displayName: "Assistant Runtime Turn",
      description: "Shared AI assistant runtime turn capability.",
      category: "assistant",
      owner: "platform",
      version: "1.0.0",
      stability: "beta",
      visibility: "authenticated",
      lifecycle: "active",
      requiredPermissions: ["authenticated"],
      supportedProviders: sharedProviders,
      supportedRuntimes: [...sharedRuntimes, "assistant_runtime"],
      requiredModels: [],
      structuredOutputSupport: false,
      streamingSupport: true,
      documentation: {
        summary: "aiService / runAssistantRuntime entry.",
        docsPath: "lib/ai/assistant/runtime/service.ts",
        sourceModule: "lib/ai/services/aiService.ts",
      },
      executionPolicy: { allowStreaming: true },
    }),
  ];

  const tutors = LEARNING_TUTOR_CAPABILITIES.map((id) =>
    sharedEntry({
      capabilityId: id,
      displayName: TUTOR_DISPLAY[id]?.name ?? id,
      description:
        TUTOR_DISPLAY[id]?.description ??
        "Learning tutor capability via Shared AI.",
      category: "learning",
      owner: "learning",
      version: "1.0.0",
      stability: "stable",
      visibility: "authenticated",
      lifecycle: "active",
      requiredPermissions: ["authenticated", "learning.enrolled"],
      supportedProviders: sharedProviders,
      supportedRuntimes: [...sharedRuntimes, "learning_tutor"],
      requiredModels: [],
      structuredOutputSupport: true,
      streamingSupport: false,
      privateAiDomainId: "learning",
      documentation: {
        summary: "aiService → runLearningTutorCapability.",
        docsPath: "lib/ai/capabilities/learning/tutorRunner.ts",
        sourceModule: "lib/ai/services/aiService.ts",
      },
    })
  );

  const privateDomains = PRIVATE_AI_DOMAIN_CATALOG.map((c) =>
    sharedEntry({
      capabilityId: `private_ai.domain.${c.id}`,
      displayName: `Private AI · ${c.label}`,
      description: c.description,
      category: "private_ai",
      owner: "private_ai",
      version: "1.0.0",
      stability: "stable",
      visibility: "admin",
      lifecycle: "registered",
      executable: false,
      executionSurface: "private_ai_routing",
      requiredPermissions: ["platform_admin", "private_ai.read"],
      supportedProviders: [
        "external-provider-contract",
        "umtuba-private",
        "umtuba-local",
      ],
      supportedRuntimes: ["private_ai_runtime"],
      requiredModels: [],
      structuredOutputSupport: true,
      streamingSupport: true,
      privateAiDomainId: c.id,
      documentation: {
        summary:
          "Private AI domain taxonomy used by routing/adapters — not aiService.",
        docsPath: "lib/privateAi/capabilities.ts",
        sourceModule: "lib/privateAi/capabilities.ts",
      },
    })
  );

  const hubPlaceholders: AiCapabilityCatalogEntry[] = [
    "creator.assist_coming_soon",
    "search.assist_coming_soon",
    "world.assist_coming_soon",
    "marketing.assist_coming_soon",
    "ads.assist_coming_soon",
    "my_ai.space_coming_soon",
  ].map((id) =>
    sharedEntry({
      capabilityId: id,
      displayName: id,
      description:
        "Hub display placeholder already present in AI Hub registry — not executable.",
      category: id.startsWith("creator.")
        ? "creator"
        : id.startsWith("ads.") || id.startsWith("marketing.")
          ? "analytics"
          : "system",
      owner: "platform",
      version: "0.0.0",
      stability: "experimental",
      visibility: "hub",
      lifecycle: "planned",
      executable: false,
      executionSurface: "hub_placeholder",
      requiredPermissions: [],
      supportedProviders: [],
      supportedRuntimes: [],
      requiredModels: [],
      structuredOutputSupport: false,
      streamingSupport: false,
      documentation: {
        summary: "Listed in lib/ai/hub/capabilityRegistry.ts as coming soon.",
        docsPath: "lib/ai/hub/capabilityRegistry.ts",
        sourceModule: "lib/ai/hub/capabilityRegistry.ts",
      },
    })
  );

  return [...core, ...tutors, ...privateDomains, ...hubPlaceholders];
}

/** Executable Shared AI capability IDs (active + executable). */
export function listExecutableSharedCapabilityIds(): string[] {
  return buildBuiltinCapabilityCatalogEntries()
    .filter(
      (e) =>
        e.executable &&
        e.executionSurface === "shared_ai_service" &&
        e.lifecycle === "active"
    )
    .map((e) => e.capabilityId);
}
