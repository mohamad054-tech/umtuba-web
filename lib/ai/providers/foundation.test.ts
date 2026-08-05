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
} from "./foundation";
import type { AiModelFoundationDescriptor } from "./foundationTypes";
import type { AiProviderAdapter } from "./adapters";

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

const baseRoute = {
  capabilityId: "test.capability",
  requiredModality: "text" as const,
  requiresStructuredOutput: true,
  requiresTools: false,
  estimatedContextTokens: 100,
  dataClassification: "internal" as const,
  allowFallback: true,
  preferredCost: "economy" as const,
};

describe("AiProviderFoundation registration", () => {
  it("registers providers and looks them up", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
      models: [sampleModel({ providerId: "stub", modelId: "stub-a" })],
    });
    expect(f.getProvider("stub")?.displayName).toBe("Stub");
    expect(f.getModel("stub", "stub-a")?.modelId).toBe("stub-a");
    expect(f.listProviders()).toHaveLength(1);
    expect(f.listModels()).toHaveLength(1);
    expect(f.snapshot().executableProviderIds).toEqual(["stub"]);
  });

  it("rejects duplicate provider registration", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "openai",
        displayName: "OpenAI",
        enabled: true,
        available: false,
      },
    });
    expect(() =>
      f.registerProvider({
        descriptor: {
          providerId: "openai",
          displayName: "Again",
          enabled: true,
          available: false,
        },
      })
    ).toThrow(/already registered/i);
  });

  it("rejects duplicate model registration", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
    });
    f.registerModel(sampleModel({ providerId: "stub", modelId: "m1" }));
    expect(() =>
      f.registerModel(sampleModel({ providerId: "stub", modelId: "m1" }))
    ).toThrow(/already registered/i);
  });

  it("rejects model registration for unknown provider", () => {
    const f = new AiProviderFoundation();
    expect(() =>
      f.registerModel(sampleModel({ providerId: "missing", modelId: "m1" }))
    ).toThrow(/Unknown provider/i);
  });
});

describe("AiProviderFoundation fail-closed lookup", () => {
  it("rejects unknown provider and model", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
      models: [sampleModel({ providerId: "stub", modelId: "stub-a" })],
    });
    expect(() => f.requireProvider("gemini")).toThrow(/Unknown provider/i);
    expect(() => f.requireModel("stub", "nope")).toThrow(/Unknown model/i);
    expect(() => f.requireAdapter("openai")).toThrow(/not registered/i);
  });

  it("rejects disabled and unavailable models", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
      models: [
        sampleModel({
          providerId: "stub",
          modelId: "disabled",
          enabled: false,
        }),
        sampleModel({
          providerId: "stub",
          modelId: "unavailable",
          available: false,
        }),
      ],
    });
    expect(() => f.requireEnabledModel("stub", "disabled")).toThrow(
      /disabled or unavailable/i
    );
    expect(() => f.requireEnabledModel("stub", "unavailable")).toThrow(
      /disabled or unavailable/i
    );
  });

  it("rejects provider without adapter even if listed", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "gemini",
        displayName: "Gemini",
        enabled: true,
        available: true,
      },
      adapter: null,
      models: [sampleModel({ providerId: "gemini", modelId: "g1" })],
    });
    expect(() => f.requireEnabledModel("gemini", "g1")).toThrow(
      /no executable adapter/i
    );
  });
});

describe("capability compatibility via foundation selection", () => {
  it("fails closed when modality is unsupported", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
      })
    );
    expect(() =>
      f.resolveRoute({
        ...baseRoute,
        requiredModality: "audio",
      })
    ).toThrow(AiPlatformError);
  });

  it("fails closed when structured output is required but unsupported", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
      models: [
        sampleModel({
          providerId: "stub",
          modelId: "text-only",
          structuredOutputSupport: false,
          capabilityClasses: ["chat"],
        }),
      ],
    });
    expect(() =>
      f.resolveRoute({
        ...baseRoute,
        requiresStructuredOutput: true,
      })
    ).toThrow(/eligible/i);
  });

  it("selects deterministically for the same request", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
      })
    );
    const a = f.resolveRoute(baseRoute);
    const b = f.resolveRoute(baseRoute);
    expect(a.providerId).toBe(b.providerId);
    expect(a.modelId).toBe(b.modelId);
    expect(a.reason).toContain("deterministic");
  });

  it("rejects unknown preferred provider/model fail-closed", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
      })
    );
    expect(() =>
      f.resolveRoute({
        ...baseRoute,
        preferredProviderId: "not-a-provider",
        preferredModelId: "x",
        allowFallback: false,
      })
    ).toThrow(/Unknown provider/i);

    expect(() =>
      f.resolveRoute({
        ...baseRoute,
        preferredProviderId: "stub",
        preferredModelId: "does-not-exist",
        allowFallback: true,
      })
    ).toThrow(/Unknown model/i);
  });

  it("rejects disabled preferred model when fallback is disallowed", () => {
    const f = new AiProviderFoundation();
    f.registerProvider({
      descriptor: {
        providerId: "stub",
        displayName: "Stub",
        enabled: true,
        available: true,
      },
      adapter: stubAdapter(),
      models: [
        sampleModel({
          providerId: "stub",
          modelId: "off",
          enabled: false,
        }),
        sampleModel({
          providerId: "stub",
          modelId: "on",
          enabled: true,
        }),
      ],
    });
    expect(() =>
      f.resolveRoute({
        ...baseRoute,
        preferredProviderId: "stub",
        preferredModelId: "off",
        allowFallback: false,
      })
    ).toThrow(/disabled or unavailable/i);
  });
});

describe("createProviderFoundation seeding", () => {
  it("seeds stub + openai + gemini + anthropic catalog + disabled local placeholder", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
      })
    );
    expect(f.getProvider("stub")?.enabled).toBe(true);
    expect(f.getProvider("openai")).toBeTruthy();
    expect(f.getProvider("gemini")?.enabled).toBe(true);
    expect(f.getProvider("gemini")?.available).toBe(false);
    expect(f.getProvider("anthropic")?.enabled).toBe(true);
    expect(f.getProvider("anthropic")?.available).toBe(false);
    expect(f.getProvider("local")?.enabled).toBe(false);
    expect(f.getAdapter("gemini")).toBeNull();
    expect(f.getAdapter("anthropic")).toBeNull();
    expect(f.getAdapter("local")).toBeNull();
  });

  it("does not expose gemini without key as an executable route", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
      })
    );
    const route = f.resolveRoute(baseRoute);
    expect(["stub", "openai"]).toContain(route.providerId);
    expect(route.providerId).not.toBe("gemini");
    expect(route.providerId).not.toBe("anthropic");
  });

  it("loads gemini provider + adapter when GEMINI_API_KEY is configured", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: null,
        geminiApiKey: "test-gemini-key-not-real",
        anthropicApiKey: null,
        geminiDefaultModel: "gemini-2.5-flash",
      })
    );
    expect(f.getProvider("gemini")?.enabled).toBe(true);
    expect(f.getProvider("gemini")?.available).toBe(true);
    expect(f.getAdapter("gemini")?.providerId).toBe("gemini");
    expect(f.requireEnabledModel("gemini", "gemini-2.5-flash").modelId).toBe(
      "gemini-2.5-flash"
    );
    // OpenAI remains registered but non-executable without its key.
    expect(f.getProvider("openai")?.available).toBe(false);
    expect(f.getAdapter("openai")).toBeNull();
  });

  it("fail-closes gemini when key is absent", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
      })
    );
    expect(() =>
      f.requireEnabledModel("gemini", "gemini-2.5-flash")
    ).toThrow(AiPlatformError);
    expect(() => f.requireAdapter("gemini")).toThrow(/no executable adapter|not registered/i);
  });

  it("registers anthropic adapter when ANTHROPIC_API_KEY is configured", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: "test-anthropic-key",
        anthropicDefaultModel: "claude-haiku-4-5-20251001",
      })
    );
    expect(f.getProvider("anthropic")?.available).toBe(true);
    expect(f.getAdapter("anthropic")?.providerId).toBe("anthropic");
    const route = f.resolveRoute({
      ...baseRoute,
      preferredProviderId: "anthropic",
      preferredModelId: "claude-haiku-4-5-20251001",
      allowFallback: false,
    });
    expect(route.providerId).toBe("anthropic");
    expect(route.modelId).toBe("claude-haiku-4-5-20251001");
  });
});

function createTutorFakeSupabase() {
  const lesson = {
    id: LESSON,
    section_id: SECTION,
    name: "Lesson One",
    description: "Basics",
    status: "published",
  };
  const section = {
    id: SECTION,
    course_id: COURSE,
    status: "published",
  };
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
          if (table === "learning_lessons") {
            return { data: lesson, error: null };
          }
          if (table === "learning_sections") {
            return { data: section, error: null };
          }
          if (table === "learning_courses") {
            return { data: course, error: null };
          }
          return { data: null, error: null };
        },
        then: undefined as unknown,
      };
      (api as { then?: unknown }).then = (
        resolve: (v: unknown) => unknown
      ) => {
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

describe("gateway uses foundation selection (not hardcoded adapters)", () => {
  it("routes structured runs through foundation-backed gateway in stub mode", async () => {
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
          geminiApiKey: null,
        }),
        capabilityEligible: true,
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.providerId).toBe("stub");
    expect(result.data.modelId).toBeTruthy();
  });
});

describe("Learning Tutor backward compatibility", () => {
  it("does not hardcode provider/model names in the tutor capability", () => {
    const tutorSrc = readFileSync(
      join(process.cwd(), "lib/ai/capabilities/learning/tutorRunner.ts"),
      "utf8"
    );
    expect(tutorSrc).not.toMatch(/openai|gemini|anthropic|OPENAI_API_KEY/i);
    expect(tutorSrc).toMatch(/executeAiGateway/);
  });

  it("still runs explain_lesson through Shared Core stub after foundation", async () => {
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
    expect(result.data.mutatesProgress).toBe(false);
  });
});

describe("gateway source uses Provider Foundation", () => {
  it("imports createProviderFoundation and routing policy", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/gateway/execute.ts"),
      "utf8"
    );
    expect(src).toMatch(/createProviderFoundation/);
    expect(src).toMatch(/createRoutingPolicyEngine/);
    expect(src).toMatch(/routingPolicy\.resolve/);
    expect(src).toMatch(/foundation\.requireAdapter/);
    expect(src).not.toMatch(/buildProviderRegistry\(/);
    expect(src).not.toMatch(/resolveProviderAdapters\(/);
    expect(src).not.toMatch(/routeModel\(/);
  });
});
