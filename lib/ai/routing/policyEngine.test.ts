import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { loadAiPlatformConfig } from "../config";
import { AiPlatformError } from "../contracts/errors";
import { executeAiGateway } from "../gateway/execute";
import { LEARNING_TUTOR_PROMPTS } from "../capabilities/learning/prompts";
import { runLearningTutorCapability } from "../capabilities/learning/tutorRunner";
import { registerPrompts } from "../prompts/registry";
import { resetAiRunState } from "../runs/lifecycle";
import { resetAiTraceState } from "../tracing/events";
import { resetAiUsageState } from "../usage/accounting";
import { resetAiSessionState } from "../sessions/session";
import { resetAiRateLimitState } from "../safety/hooks";
import {
  AiProviderFoundation,
  createProviderFoundation,
} from "../providers/foundation";
import type { AiModelFoundationDescriptor } from "../providers/foundationTypes";
import type { AiProviderAdapter } from "../providers/adapters";
import { AiModelRegistry, toModelRegistryEntry } from "../models/modelRegistry";
import {
  AiRoutingPolicyEngine,
  createRoutingPolicyEngine,
} from "./policyEngine";
import { createNoopRoutingExtensionHooks } from "./policyTypes";

const USER = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const SECTION = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  resetAiRunState();
  resetAiTraceState();
  resetAiUsageState();
  resetAiSessionState();
  resetAiRateLimitState();
  registerPrompts(LEARNING_TUTOR_PROMPTS);
});

function stubAdapter(providerId = "stub"): AiProviderAdapter {
  return {
    providerId,
    async execute() {
      return {
        text: null,
        structured: { ok: true },
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          cachedTokens: 0,
          audioUnits: null,
          imageUnits: null,
          costMinor: 0,
          costCurrency: "USD",
          costStatus: "estimated",
          modelId: "x",
          providerId,
        },
      };
    },
  };
}

function sampleModel(
  overrides: Partial<AiModelFoundationDescriptor> &
    Pick<AiModelFoundationDescriptor, "providerId" | "modelId">
): AiModelFoundationDescriptor {
  return {
    displayName: overrides.modelId,
    capabilityClasses: ["chat", "structured"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextLimitTokens: 8_000,
    structuredOutputSupport: true,
    toolCallSupport: false,
    streamingSupport: false,
    available: true,
    enabled: true,
    costClass: "economy",
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    dataHandlingMax: "confidential",
    defaultTimeoutMs: 1_000,
    fallbackEligible: true,
    latencyClass: "low",
    ...overrides,
  };
}

function buildEngine(models: AiModelFoundationDescriptor[]) {
  const foundation = new AiProviderFoundation();
  foundation.registerProvider({
    descriptor: {
      providerId: "stub",
      displayName: "Stub",
      enabled: true,
      available: true,
    },
    adapter: stubAdapter(),
  });
  const registry = new AiModelRegistry();
  for (const model of models) {
    foundation.registerModel(model);
    registry.register(
      toModelRegistryEntry(model, {
        priority: model.modelId === "preferred" ? 5 : 20,
        fallbackOrder: model.modelId === "fallback" ? 1 : 50,
      })
    );
  }
  return createRoutingPolicyEngine(foundation, { registry });
}

const baseReq = {
  capabilityId: "platform.test",
  requiredModality: "text" as const,
  requiresStructuredOutput: true,
  requiresTools: false,
  estimatedContextTokens: 100,
  dataClassification: "internal" as const,
  requiredCapabilityClass: "structured" as const,
  allowFallback: true,
};

describe("AiModelRegistry", () => {
  it("registers and looks up models with priority/fallbackOrder", () => {
    const foundation = createProviderFoundation(
      loadAiPlatformConfig({ mode: "stub", allowStub: true, openaiApiKey: null })
    );
    const registry = AiModelRegistry.fromFoundation(foundation);
    const stub = registry.require("stub", "stub-structured-v1");
    expect(stub.supportedCapabilities).toContain("structured");
    expect(stub.enabled).toBe(true);
    expect(typeof stub.priority).toBe("number");
    expect(typeof stub.fallbackOrder).toBe("number");
    expect(stub.contextLimitTokens).toBeGreaterThan(0);
    expect(stub.outputLimitTokens).toBeNull();
  });

  it("rejects duplicate model registration", () => {
    const registry = new AiModelRegistry();
    const entry = toModelRegistryEntry(
      sampleModel({ providerId: "stub", modelId: "m1" })
    );
    registry.register(entry);
    expect(() => registry.register(entry)).toThrow(/already registered/i);
  });
});

describe("Routing Policy Engine", () => {
  it("selects preferred model when eligible", () => {
    const engine = buildEngine([
      sampleModel({ providerId: "stub", modelId: "preferred" }),
      sampleModel({ providerId: "stub", modelId: "other" }),
    ]);
    const decision = engine.resolve({
      ...baseReq,
      preferredModel: { providerId: "stub", modelId: "preferred" },
    });
    expect(decision.modelId).toBe("preferred");
    expect(decision.fallbackUsed).toBe(false);
    expect(decision.reason).toBe("policy_preferred_model");
    expect(decision.policyId).toBe("default_v1");
  });

  it("uses explicit fallback models after preferred miss", () => {
    const engine = buildEngine([
      sampleModel({
        providerId: "stub",
        modelId: "preferred",
        enabled: false,
      }),
      sampleModel({ providerId: "stub", modelId: "fallback" }),
      sampleModel({ providerId: "stub", modelId: "other" }),
    ]);
    const decision = engine.resolve({
      ...baseReq,
      preferredModel: { providerId: "stub", modelId: "preferred" },
      fallbackModels: [{ providerId: "stub", modelId: "fallback" }],
      allowFallback: true,
    });
    expect(decision.modelId).toBe("fallback");
    expect(decision.fallbackUsed).toBe(true);
    expect(decision.reason).toBe("policy_explicit_fallback_model");
  });

  it("rejects disabled preferred model when fallback is disallowed", () => {
    const engine = buildEngine([
      sampleModel({
        providerId: "stub",
        modelId: "preferred",
        enabled: false,
      }),
      sampleModel({ providerId: "stub", modelId: "other" }),
    ]);
    expect(() =>
      engine.resolve({
        ...baseReq,
        preferredModel: { providerId: "stub", modelId: "preferred" },
        allowFallback: false,
      })
    ).toThrow(/disabled or unavailable/i);
  });

  it("rejects unsupported capability fail-closed", () => {
    const engine = buildEngine([
      sampleModel({
        providerId: "stub",
        modelId: "chat-only",
        capabilityClasses: ["chat"],
        structuredOutputSupport: false,
      }),
    ]);
    expect(() =>
      engine.resolve({
        ...baseReq,
        requiresStructuredOutput: true,
        requiredCapabilityClass: "structured",
      })
    ).toThrow(/eligible/i);
  });

  it("rejects unknown model and provider fail-closed", () => {
    const engine = buildEngine([
      sampleModel({ providerId: "stub", modelId: "ok" }),
    ]);
    expect(() =>
      engine.resolve({
        ...baseReq,
        preferredModel: { providerId: "missing", modelId: "x" },
        allowFallback: false,
      })
    ).toThrow(/Unknown provider/i);
    expect(() =>
      engine.resolve({
        ...baseReq,
        preferredModel: { providerId: "stub", modelId: "nope" },
        allowFallback: true,
      })
    ).toThrow(/Unknown model/i);
  });

  it("is deterministic for the same request", () => {
    const engine = createRoutingPolicyEngine(
      createProviderFoundation(
        loadAiPlatformConfig({
          mode: "stub",
          allowStub: true,
          openaiApiKey: null,
        })
      )
    );
    const a = engine.resolve(baseReq);
    const b = engine.resolve(baseReq);
    expect(a.providerId).toBe(b.providerId);
    expect(a.modelId).toBe(b.modelId);
    expect(a.reason).toContain("policy_deterministic");
  });

  it("ranks by priority then fallbackOrder", () => {
    const foundation = new AiProviderFoundation();
    foundation.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
    });
    const low = sampleModel({ providerId: "stub", modelId: "low-pri" });
    const high = sampleModel({ providerId: "stub", modelId: "high-pri" });
    foundation.registerModel(low);
    foundation.registerModel(high);
    const registry = new AiModelRegistry();
    registry.register(toModelRegistryEntry(low, { priority: 30, fallbackOrder: 1 }));
    registry.register(toModelRegistryEntry(high, { priority: 5, fallbackOrder: 99 }));
    const engine = new AiRoutingPolicyEngine({ foundation, registry });
    const decision = engine.resolve(baseReq);
    expect(decision.modelId).toBe("high-pri");
  });

  it("exposes noop extension hooks for future policies", () => {
    const hooks = createNoopRoutingExtensionHooks();
    expect(hooks.scoreCost?.({} as never)).toBeNull();
    expect(hooks.scoreLatency?.({} as never)).toBeNull();
    expect(hooks.scoreRegion?.({} as never)).toBeNull();
    expect(hooks.applyTenantOverrides?.([], "t1")).toEqual([]);
  });
});

describe("gateway + aiService use Routing Policy", () => {
  it("gateway source selects via createRoutingPolicyEngine", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/gateway/execute.ts"),
      "utf8"
    );
    expect(src).toMatch(/createRoutingPolicyEngine/);
    expect(src).toMatch(/routingPolicy\.resolve/);
    expect(src).not.toMatch(/foundation\.resolveRoute/);
    expect(src).not.toMatch(/routeModel\(/);
  });

  it("aiService does not import router or model selection", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/services/aiService.ts"),
      "utf8"
    );
    expect(src).toMatch(/executeAiGateway/);
    expect(src).not.toMatch(/routeModel|createRoutingPolicyEngine|preferredModelId/);
  });

  it("runs gateway stub via policy-backed selection", async () => {
    const result = await executeAiGateway(
      USER,
      {
        capabilityId: "commerce.product_draft_assistant",
        promptId: "commerce.product_draft_assistant",
        userInput: "title: Cedar Bowl\nWarm wood bowl.",
        outputMode: "structured_json",
        context: {
          productDomain: "commerce",
          surface: "test",
          dataClassification: "confidential",
          allowedCapabilities: ["commerce.product_draft_assistant"],
          allowedToolIds: [],
        },
        _test: { forceStub: true, bypassRateLimit: true },
      },
      {
        config: loadAiPlatformConfig({
          mode: "stub",
          allowStub: true,
          openaiApiKey: null,
        }),
        capabilityEligible: true,
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.providerId).toBe("stub");
    expect(result.data.route.reason).toMatch(/policy_/);
  });
});

describe("backward compatibility — Learning Tutor", () => {
  function createTutorFakeSupabase() {
    const lesson = {
      id: LESSON,
      section_id: SECTION,
      name: "Lesson One",
      description: "Basics",
      status: "published",
    };
    const section = { id: SECTION, course_id: COURSE, status: "published" };
    const course = { id: COURSE, name: "Intro AI", status: "published" };
    const blocks = [
      {
        id: "55555555-5555-4555-8555-555555555555",
        lesson_id: LESSON,
        block_type: "rich_text",
        status: "published",
        position: 1,
        content: { text: "Neural networks learn from examples." },
        created_by: USER,
        updated_by: USER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        suspended_at: null,
        archived_at: null,
      },
    ];
    return {
      rpc: vi.fn(async (name: string) => {
        if (name === "has_learning_course_access") {
          return { data: true, error: null };
        }
        if (name === "get_my_learning_lesson_unlock_state") {
          return {
            data: {
              lesson_id: LESSON,
              locked: false,
              cost: null,
              balance: 100,
              unlocked: true,
            },
            error: null,
          };
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } };
      }),
      from: vi.fn((table: string) => {
        const api = {
          select: () => api,
          eq: () => api,
          order: () => api,
          maybeSingle: async () => {
            if (table === "learning_lessons") return { data: lesson, error: null };
            if (table === "learning_sections") return { data: section, error: null };
            if (table === "learning_courses") return { data: course, error: null };
            return { data: null, error: null };
          },
          then: undefined as unknown,
        };
        (api as { then?: unknown }).then = (resolve: (v: unknown) => unknown) => {
          if (table === "learning_lesson_content_blocks") {
            return Promise.resolve(resolve({ data: blocks, error: null }));
          }
          if (table === "learning_activities") {
            return Promise.resolve(resolve({ data: [], error: null }));
          }
          return Promise.resolve(resolve({ data: [], error: null }));
        };
        return api;
      }),
    };
  }

  it("still runs explain_lesson after routing policy layer", async () => {
    const result = await runLearningTutorCapability({
      supabase: createTutorFakeSupabase() as never,
      userId: USER,
      lessonId: LESSON,
      capabilityId: "learning.tutor.explain_lesson",
      forceStub: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.result.explanation).toBeTruthy();
  });
});
