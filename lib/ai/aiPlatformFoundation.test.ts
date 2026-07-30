import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { loadAiPlatformConfig } from "./config";
import {
  assertCapabilityAllowed,
  buildTrustedContext,
} from "./context/envelope";
import {
  evaluateProductDraftSuggestion,
  listEvaluations,
  recordEvaluation,
  resetAiEvaluationState,
} from "./evaluations/hooks";
import { executeAiGateway } from "./gateway/execute";
import {
  listRecentRuns,
  resetAiRunState,
  summarizeRunFailures,
} from "./runs/lifecycle";
import {
  AI_MEMORY_POLICIES,
  assertMemoryPermission,
  createInMemoryAiMemoryStore,
  resetAiMemoryState,
} from "./memory/policy";
import {
  listPromptDefinitions,
  resolvePrompt,
  validateStructuredAgainstPrompt,
} from "./prompts/registry";
import {
  buildProviderRegistry,
  listAvailableModels,
} from "./models/registry";
import { routeModel } from "./routing/router";
import {
  assertRateLimit,
  redactForTrace,
  resetAiRateLimitState,
  runPostExecutionPolicy,
} from "./safety/hooks";
import {
  assertSessionWorkspace,
  createAiSession,
  getAiSessionForUser,
  resetAiSessionState,
} from "./sessions/session";
import {
  installReferenceTools,
  invokeTool,
  listTools,
} from "./tools/registry";
import {
  listRecentTraceEvents,
  resetAiTraceState,
} from "./tracing/events";
import {
  listRecentUsage,
  resetAiUsageState,
  summarizeUsage,
} from "./usage/accounting";
import { resetUsageTrackingFoundation } from "./usage/trackingFoundation";
import { loadAiPlatformDiagnostics } from "./capabilities/admin/diagnostics";
import { AiPlatformError } from "./contracts/errors";
import { aiService } from "./services/aiService";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const STORE_A = "33333333-3333-4333-8333-333333333333";
const STORE_B = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  resetAiRunState();
  resetAiTraceState();
  resetAiUsageState();
  resetUsageTrackingFoundation();
  resetAiSessionState();
  resetAiMemoryState();
  resetAiEvaluationState();
  resetAiRateLimitState();
});

describe("provider/model registry", () => {
  it("lists stub and openai models based on config", () => {
    const providers = buildProviderRegistry({
      openaiConfigured: true,
      geminiConfigured: false,
      anthropicConfigured: false,
      localConfigured: false,
      stubEligible: true,
      openaiDefaultModel: "gpt-4o-mini",
      geminiDefaultModel: "gemini-2.5-flash",
      anthropicDefaultModel: "claude-haiku-4-5-20251001",
      localDefaultModel: null,
      defaultTimeoutMs: 1000,
    });
    expect(providers.some((p) => p.providerId === "stub")).toBe(true);
    expect(providers.some((p) => p.providerId === "openai" && p.available)).toBe(
      true
    );
    expect(listAvailableModels(providers).length).toBeGreaterThan(0);
  });

  it("marks openai unavailable without key", () => {
    const providers = buildProviderRegistry({
      openaiConfigured: false,
      geminiConfigured: false,
      anthropicConfigured: false,
      localConfigured: false,
      stubEligible: false,
      openaiDefaultModel: "gpt-4o-mini",
      geminiDefaultModel: "gemini-2.5-flash",
      anthropicDefaultModel: "claude-haiku-4-5-20251001",
      localDefaultModel: null,
      defaultTimeoutMs: 1000,
    });
    expect(listAvailableModels(providers)).toHaveLength(0);
  });

  it("lists gemini models when configured", () => {
    const providers = buildProviderRegistry({
      openaiConfigured: false,
      geminiConfigured: true,
      anthropicConfigured: false,
      localConfigured: false,
      stubEligible: false,
      openaiDefaultModel: "gpt-4o-mini",
      geminiDefaultModel: "gemini-2.5-flash",
      anthropicDefaultModel: "claude-haiku-4-5-20251001",
      localDefaultModel: null,
      defaultTimeoutMs: 1000,
    });
    expect(providers.some((p) => p.providerId === "gemini" && p.available)).toBe(
      true
    );
    expect(
      listAvailableModels(providers).every((m) => m.providerId === "gemini")
    ).toBe(true);
  });

  it("lists anthropic models when configured", () => {
    const providers = buildProviderRegistry({
      openaiConfigured: false,
      geminiConfigured: false,
      anthropicConfigured: true,
      localConfigured: false,
      stubEligible: false,
      openaiDefaultModel: "gpt-4o-mini",
      geminiDefaultModel: "gemini-2.5-flash",
      anthropicDefaultModel: "claude-haiku-4-5-20251001",
      localDefaultModel: null,
      defaultTimeoutMs: 1000,
    });
    expect(
      providers.some((p) => p.providerId === "anthropic" && p.available)
    ).toBe(true);
    expect(
      listAvailableModels(providers).every((m) => m.providerId === "anthropic")
    ).toBe(true);
  });

  it("lists local models only when operator model + configured", () => {
    const providers = buildProviderRegistry({
      openaiConfigured: false,
      geminiConfigured: false,
      anthropicConfigured: false,
      localConfigured: true,
      stubEligible: false,
      openaiDefaultModel: "gpt-4o-mini",
      geminiDefaultModel: "gemini-2.5-flash",
      anthropicDefaultModel: "claude-haiku-4-5-20251001",
      localDefaultModel: "operator-hosted-model",
      defaultTimeoutMs: 1000,
    });
    expect(providers.some((p) => p.providerId === "local" && p.available)).toBe(
      true
    );
    expect(
      listAvailableModels(providers).every((m) => m.providerId === "local")
    ).toBe(true);
  });
});

describe("deterministic routing", () => {
  const providers = buildProviderRegistry({
    openaiConfigured: true,
    geminiConfigured: false,
    anthropicConfigured: false,
    localConfigured: false,
    stubEligible: true,
    openaiDefaultModel: "gpt-4o-mini",
    geminiDefaultModel: "gemini-2.5-flash",
    anthropicDefaultModel: "claude-haiku-4-5-20251001",
    localDefaultModel: null,
    defaultTimeoutMs: 1000,
  });

  it("picks an economy structured model by default", () => {
    const decision = routeModel(providers, {
      capabilityId: "commerce.product_draft_assistant",
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 1000,
      dataClassification: "confidential",
      allowFallback: true,
      preferredCost: "economy",
    });
    expect(decision.providerId).toBeTruthy();
    expect(decision.reason).toContain("deterministic");
  });

  it("fails closed for unsupported modality", () => {
    expect(() =>
      routeModel(providers, {
        capabilityId: "x",
        requiredModality: "audio",
        requiresStructuredOutput: false,
        requiresTools: false,
        estimatedContextTokens: 10,
        dataClassification: "public",
        allowFallback: true,
      })
    ).toThrow(AiPlatformError);
  });

  it("never routes restricted data to a lower max model", () => {
    expect(() =>
      routeModel(providers, {
        capabilityId: "x",
        requiredModality: "text",
        requiresStructuredOutput: true,
        requiresTools: false,
        estimatedContextTokens: 10,
        dataClassification: "restricted",
        allowFallback: true,
      })
    ).toThrow(/eligible|No eligible/i);
  });

  it("supports bounded fallback after preference miss", () => {
    const decision = routeModel(providers, {
      capabilityId: "x",
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 10,
      dataClassification: "internal",
      preferredProviderId: "openai",
      preferredModelId: "does-not-exist",
      allowFallback: true,
    });
    expect(decision.fallbackUsed).toBe(true);
  });
});

describe("prompt registry", () => {
  it("resolves active versioned prompts", () => {
    const prompt = resolvePrompt({
      promptId: "commerce.product_draft_assistant",
    });
    expect(prompt.version).toBe("1.0.0");
    expect(prompt.status).toBe("active");
    expect(listPromptDefinitions().length).toBeGreaterThan(0);
  });

  it("rejects missing prompts", () => {
    expect(() => resolvePrompt({ promptId: "missing.prompt" })).toThrow(
      /not registered/i
    );
  });

  it("validates structured product draft output", () => {
    const prompt = resolvePrompt({
      promptId: "commerce.product_draft_assistant",
    });
    const ok = validateStructuredAgainstPrompt(prompt, {
      title: "Nice mug",
      description: "A sturdy ceramic mug for daily coffee.",
      tags: ["mug", "ceramic"],
      seoTitle: "Nice mug",
      seoDescription: "Buy a sturdy ceramic mug.",
    });
    expect(ok.ok).toBe(true);
    const bad = validateStructuredAgainstPrompt(prompt, { title: "x" });
    expect(bad.ok).toBe(false);
  });
});

describe("context and authorization", () => {
  it("builds trusted context and rejects client capability elevation", () => {
    const ctx = buildTrustedContext({
      userId: USER_A,
      productDomain: "commerce",
      surface: "seller.product_editor",
      dataClassification: "confidential",
      allowedCapabilities: ["commerce.product_draft_assistant"],
      allowedToolIds: [],
      storeId: STORE_A,
    });
    expect(ctx.userId).toBe(USER_A);
    expect(() =>
      assertCapabilityAllowed(ctx, "platform.diagnostics_probe")
    ).toThrow(/not allowed/i);
  });

  it("rejects non-uuid user", () => {
    expect(() =>
      buildTrustedContext({
        userId: "not-a-uuid",
        productDomain: "commerce",
        surface: "x",
        dataClassification: "public",
        allowedCapabilities: [],
        allowedToolIds: [],
      })
    ).toThrow(/Valid user/i);
  });
});

describe("tools", () => {
  beforeEach(() => {
    installReferenceTools({
      readSellerStoreSummary: async () => ({
        ok: true,
        data: { storeId: STORE_A, name: "Demo" },
      }),
      readProductDraft: async () => ({
        ok: true,
        data: { productId: "p", title: "T" },
      }),
      readUserPreferences: async ({ userId }) => ({
        ok: true,
        data: { userId },
      }),
    });
  });

  it("allows read-only allowlisted tools with permissions", async () => {
    const result = await invokeTool({
      toolId: "read_seller_store_summary",
      args: { storeId: STORE_A },
      userId: USER_A,
      permissions: ["store.catalog.read"],
      allowlist: ["read_seller_store_summary"],
    });
    expect(result.ok).toBe(true);
  });

  it("denies tools not on allowlist", async () => {
    await expect(
      invokeTool({
        toolId: "read_seller_store_summary",
        args: { storeId: STORE_A },
        userId: USER_A,
        permissions: ["store.catalog.read"],
        allowlist: [],
      })
    ).rejects.toThrow(/allowlist/i);
  });

  it("denies mutating tools in V1", async () => {
    await expect(
      invokeTool({
        toolId: "mutating_forbidden_example",
        args: {},
        userId: USER_A,
        permissions: ["platform.admin"],
        allowlist: ["mutating_forbidden_example"],
      })
    ).rejects.toThrow(/Mutating/i);
  });

  it("lists reference tools", () => {
    expect(listTools().some((t) => t.toolId === "read_product_draft")).toBe(
      true
    );
  });
});

describe("gateway end-to-end (stub)", () => {
  it("completes product draft structured run", async () => {
    const result = await executeAiGateway(
      USER_A,
      {
        capabilityId: "commerce.product_draft_assistant",
        promptId: "commerce.product_draft_assistant",
        userInput: "title: Handmade Cedar Bowl\nWarm wood bowl for salads.",
        outputMode: "structured_json",
        context: {
          productDomain: "commerce",
          surface: "test",
          dataClassification: "confidential",
          allowedCapabilities: ["commerce.product_draft_assistant"],
          allowedToolIds: [],
          storeId: STORE_A,
        },
        _test: { forceStub: true, bypassRateLimit: true },
      },
      { capabilityEligible: true, permissions: [] }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.structured?.title).toBeTruthy();
    expect(result.data.usage.costStatus).toBeTruthy();
    expect(listRecentRuns().length).toBe(1);
    expect(listRecentUsage().length).toBe(1);
    expect(listRecentTraceEvents().some((e) => e.type === "completion")).toBe(
      true
    );
    expect(listEvaluations().length).toBe(1);
  });

  it("fails when unauthenticated", async () => {
    const result = await executeAiGateway(null, {
      capabilityId: "commerce.product_draft_assistant",
      promptId: "commerce.product_draft_assistant",
      userInput: "x",
      outputMode: "structured_json",
      context: {
        productDomain: "commerce",
        surface: "test",
        dataClassification: "confidential",
        allowedCapabilities: ["commerce.product_draft_assistant"],
        allowedToolIds: [],
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unauthenticated");
  });

  it("blocks ineligible accounts", async () => {
    const result = await executeAiGateway(
      USER_A,
      {
        capabilityId: "commerce.product_draft_assistant",
        promptId: "commerce.product_draft_assistant",
        userInput: "title: Bowl",
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
      { capabilityEligible: false }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("safety_block");
  });

  it("enforces rate limits", async () => {
    const config = loadAiPlatformConfig({
      mode: "stub",
      allowStub: true,
      rateLimitPerMinute: 1,
    });
    const req = {
      capabilityId: "commerce.product_draft_assistant" as const,
      promptId: "commerce.product_draft_assistant",
      userInput: "title: Bowl",
      outputMode: "structured_json" as const,
      context: {
        productDomain: "commerce",
        surface: "test",
        dataClassification: "confidential" as const,
        allowedCapabilities: ["commerce.product_draft_assistant"],
        allowedToolIds: [] as string[],
      },
      _test: { forceStub: true },
    };
    const first = await executeAiGateway(USER_A, req, {
      config,
      capabilityEligible: true,
    });
    expect(first.ok).toBe(true);
    const second = await executeAiGateway(USER_A, req, {
      config,
      capabilityEligible: true,
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("rate_limited");
  });

  it("fails closed with no provider when not forced to stub", async () => {
    const result = await executeAiGateway(
      USER_A,
      {
        capabilityId: "commerce.product_draft_assistant",
        promptId: "commerce.product_draft_assistant",
        userInput: "title: Bowl",
        outputMode: "structured_json",
        context: {
          productDomain: "commerce",
          surface: "test",
          dataClassification: "confidential",
          allowedCapabilities: ["commerce.product_draft_assistant"],
          allowedToolIds: [],
        },
      },
      {
        config: loadAiPlatformConfig({
          mode: "disabled",
          allowStub: false,
          openaiApiKey: null,
        }),
        capabilityEligible: true,
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_provider_configured");
  });
});

describe("aiService.runCapability boundary", () => {
  it("exposes diagnostics probe through the stable service entry", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "platform.diagnostics_probe",
        input: { text: "ping" },
        context: {
          productDomain: "platform",
          surface: "test.service",
        },
      },
      {
        supabase: {} as never,
        userId: USER_A,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.runId).toBeTruthy();
    expect(result.data.capabilityId).toBe("platform.diagnostics_probe");
    expect(result.data.result).toBeTruthy();
  });

  it("fails closed without auth", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "platform.diagnostics_probe",
        input: { text: "ping" },
        context: { productDomain: "platform", surface: "test" },
      },
      { supabase: {} as never, userId: null }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthenticated");
  });
});

describe("safety / redaction / post policy", () => {
  it("redacts secrets from traces", () => {
    const redacted = redactForTrace(
      { api_key: "sk-secret", note: "ok" },
      "internal"
    );
    expect(redacted.api_key).toBe("[REDACTED]");
    expect(redacted.note).toBe("ok");
  });

  it("blocks price/inventory fields in product draft output", () => {
    const prompt = resolvePrompt({
      promptId: "commerce.product_draft_assistant",
    });
    expect(() =>
      runPostExecutionPolicy({
        prompt,
        text: null,
        structured: {
          title: "x",
          description: "y",
          tags: [],
          seoTitle: "x",
          seoDescription: "y",
          price: 12,
        },
      })
    ).toThrow(/price|inventory|publish/i);
  });

  it("assertRateLimit throws when exceeded", () => {
    assertRateLimit({
      userId: USER_A,
      capabilityId: "c",
      limitPerMinute: 1,
      nowMs: 1000,
    });
    expect(() =>
      assertRateLimit({
        userId: USER_A,
        capabilityId: "c",
        limitPerMinute: 1,
        nowMs: 1001,
      })
    ).toThrow(/rate limit/i);
  });
});

describe("session ownership", () => {
  it("rejects cross-user session access", () => {
    const session = createAiSession({
      userId: USER_A,
      productDomain: "commerce",
      workspaceId: STORE_A,
    });
    expect(() => getAiSessionForUser(session.id, USER_B)).toThrow(
      /does not belong/i
    );
  });

  it("rejects cross-workspace session use", () => {
    const session = createAiSession({
      userId: USER_A,
      productDomain: "commerce",
      workspaceId: STORE_A,
    });
    expect(() => assertSessionWorkspace(session, STORE_B)).toThrow(
      /Cross-workspace/i
    );
  });
});

describe("memory policy foundation", () => {
  it("requires confirmation for user preference writes", async () => {
    expect(() =>
      assertMemoryPermission({
        scope: "user_preference",
        action: "write",
        permissions: ["ai.memory.user.write"],
        confirmed: false,
      })
    ).toThrow(/confirmation/i);
    assertMemoryPermission({
      scope: "user_preference",
      action: "write",
      permissions: ["ai.memory.user.write"],
      confirmed: true,
    });
    const store = createInMemoryAiMemoryStore();
    const row = await store.set({
      scope: "session",
      ownerId: USER_A,
      key: "last_surface",
      value: { surface: "seller.product_editor" },
      dataClassification: "internal",
      provenance: "test",
      confidence: 1,
    });
    expect(row.id).toBeTruthy();
    expect(AI_MEMORY_POLICIES.session.autoPersistConversations).toBe(false);
  });
});

describe("evaluation + diagnostics", () => {
  it("scores product draft suggestions and exposes diagnostics", () => {
    const scored = evaluateProductDraftSuggestion({
      title: "Handmade Cedar Bowl",
      description: "A warm wooden bowl for salads and sharing.",
      tags: ["bowl", "wood"],
      seoTitle: "Handmade Cedar Bowl",
      seoDescription: "Warm wooden salad bowl.",
    });
    expect(scored.score).toBeGreaterThan(0.5);
    recordEvaluation({
      runId: USER_A,
      promptId: "commerce.product_draft_assistant",
      promptVersion: "1.0.0",
      modelId: "stub",
      capabilityId: "commerce.product_draft_assistant",
      runOutcome: "completed",
      schemaValid: true,
      toolSuccess: null,
      latencyMs: 12,
      safetyOutcome: "allowed",
      userFeedback: null,
      testCaseId: "unit",
      score: scored.score,
    });
    const diag = loadAiPlatformDiagnostics();
    expect(diag.prompts.length).toBeGreaterThan(0);
    expect(diag.costAvailabilityNote).toMatch(/never fabricated/i);
    expect(summarizeRunFailures().completed).toBeGreaterThanOrEqual(0);
    expect(summarizeUsage().runs).toBeGreaterThanOrEqual(0);
  });
});

describe("reference capability invariants", () => {
  it("commerce capability never mutates critical commerce state", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/ai/capabilities/commerce/productDraftAssistant.ts"
      ),
      "utf8"
    );
    expect(src).toMatch(/runProductDraftAssistant/);
    expect(src).not.toMatch(/updateDraftProduct|submitProduct|amount_minor/);
    expect(src).toMatch(/canAlterPrice: false/);
    expect(src).toMatch(/autoSaved: false/);
  });

  it("does not ship seller editor UI integration from Desktop AI ownership", () => {
    expect(() =>
      readFileSync(
        join(
          process.cwd(),
          "app/components/store/ProductDraftAssistantPanel.tsx"
        ),
        "utf8"
      )
    ).toThrow();
    expect(() =>
      readFileSync(join(process.cwd(), "app/actions/aiProductDraft.ts"), "utf8")
    ).toThrow();
  });
});

describe("migration contract", () => {
  it("defines shared AI tables with FORCE RLS and no client writes", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260871_ai_core_platform_foundation_v1.sql"
      ),
      "utf8"
    );
    for (const table of [
      "ai_sessions",
      "ai_runs",
      "ai_run_events",
      "ai_usage_records",
      "ai_evaluations",
      "ai_memory_records",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`force row level security`);
    }
    expect(sql).toMatch(/revoke all on table public\.ai_runs/);
    expect(sql).toMatch(
      /cost_status in \('provider_reported', 'estimated', 'unavailable'\)/
    );
    expect(sql).not.toMatch(
      /grant insert on table public\.ai_runs to authenticated/i
    );
  });
});

describe("admin diagnostics route authorization source", () => {
  it("uses platform admin DB authority and avoids secrets", () => {
    const src = readFileSync(
      join(process.cwd(), "app/admin/ai/page.tsx"),
      "utf8"
    );
    expect(src).toMatch(/assertPlatformAdminDb/);
    expect(src).not.toMatch(/OPENAI_API_KEY/);
    expect(src).not.toMatch(/sk-/);
    expect(src).not.toMatch(/AdminStoreShell/);
  });
});
