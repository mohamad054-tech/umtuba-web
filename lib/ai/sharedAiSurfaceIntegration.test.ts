/**
 * Shared AI Surface Integration V1 — focused routing / boundary proofs.
 * Does not invent product surfaces; asserts existing ones stay centralized.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPlatformError } from "./contracts/errors";
import { loadAiPlatformConfig } from "./config";
import { LEARNING_TUTOR_CAPABILITIES } from "./capabilities/learning/tutorRunner";
import { createProviderFoundation } from "./providers/foundation";
import { resolveProviderAdapters } from "./providers/adapters";
import { aiService } from "./services/aiService";
import { createAiServiceTranslationPort } from "../translationStudio/ai/translationAiPort";
import { createTranslationStudioWorkflow } from "../translationStudio/workflow/workflowService";
import { resetAiRateLimitState } from "./safety/hooks";

afterEach(() => {
  resetAiRateLimitState();
  vi.restoreAllMocks();
});

const CENTRAL_CAPABILITIES = [
  "commerce.product_draft_assistant",
  "platform.diagnostics_probe",
  "platform.translation_suggest",
  "assistant.runtime_turn",
  ...LEARNING_TUTOR_CAPABILITIES,
] as const;

describe("Shared AI Surface Integration V1", () => {
  it("registers all real product capabilities on the Shared AI service path", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/services/aiService.ts"),
      "utf8"
    );
    expect(src).toContain("commerce.product_draft_assistant");
    expect(src).toContain("platform.diagnostics_probe");
    expect(src).toContain("platform.translation_suggest");
    expect(src).toContain("assistant.runtime_turn");
    expect(src).toContain("LEARNING_TUTOR_CAPABILITIES");
    expect(src).toMatch(/runLearningTutorCapability/);
    expect(src).toMatch(/runProductDraftAssistant|executeAiGateway/);
    for (const capabilityId of LEARNING_TUTOR_CAPABILITIES) {
      expect(CENTRAL_CAPABILITIES).toContain(capabilityId);
    }
  });

  it("routes structured diagnostics to Gemini when preferred and configured", () => {
    const foundation = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: null,
        geminiApiKey: "test-gemini-key",
        anthropicApiKey: null,
        localBaseUrl: null,
        localDefaultModel: null,
        geminiDefaultModel: "gemini-3.5-flash-lite",
      })
    );
    expect(foundation.snapshot().executableProviderIds).toContain("gemini");
    const route = foundation.resolveRoute({
      capabilityId: "platform.diagnostics_probe",
      preferredProviderId: "gemini",
      preferredModelId: "gemini-3.5-flash-lite",
      allowFallback: false,
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 64,
      dataClassification: "internal",
    });
    expect(route.providerId).toBe("gemini");
    expect(route.modelId).toBe("gemini-3.5-flash-lite");
  });

  it("allows Gemini as an eligible fallback for learning structured runs", () => {
    const foundation = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: "sk-test",
        geminiApiKey: "test-gemini-key",
        anthropicApiKey: null,
        geminiDefaultModel: "gemini-3.5-flash-lite",
        openaiDefaultModel: "gpt-4o-mini",
      })
    );
    const route = foundation.resolveRoute({
      capabilityId: "learning.tutor.explain_lesson",
      preferredProviderId: "gemini",
      preferredModelId: "gemini-3.5-flash-lite",
      allowFallback: true,
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 512,
      dataClassification: "confidential",
    });
    expect(route.providerId).toBe("gemini");
  });

  it("fail-closes when no live provider key is configured", () => {
    const adapters = resolveProviderAdapters(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        localBaseUrl: null,
        localDefaultModel: null,
      })
    );
    expect(adapters.size).toBe(0);
    const foundation = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        localBaseUrl: null,
        localDefaultModel: null,
      })
    );
    expect(() =>
      foundation.resolveRoute({
        capabilityId: "platform.diagnostics_probe",
        allowFallback: true,
        requiredModality: "text",
        requiresStructuredOutput: true,
        requiresTools: false,
        estimatedContextTokens: 32,
        dataClassification: "internal",
      })
    ).toThrow(AiPlatformError);
  });

  it("maps Gemini provider errors without leaking secrets", async () => {
    const { createGeminiAdapter } = await import("./providers/geminiAdapter");
    const secret = "AQ.super-secret-integration-key-do-not-leak";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => `unauthorized ${secret}`,
      }))
    );
    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: secret,
        openaiApiKey: null,
        allowStub: false,
      })
    );
    await expect(
      adapter.execute({
        providerId: "gemini",
        modelId: "gemini-3.5-flash-lite",
        messages: [{ role: "user", content: "ping" }],
        structured: true,
        timeoutMs: 5_000,
        userId: "11111111-1111-4111-8111-111111111111",
        runId: "22222222-2222-4222-8222-222222222222",
        capabilityId: "platform.diagnostics_probe",
        workspaceId: null,
      })
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(AiPlatformError);
      const message = String((err as Error).message);
      expect(message).not.toContain(secret);
      return true;
    });
  });

  it("Translation Studio live suggestions go through aiService capability", async () => {
    const runCapability = vi.fn(async () => ({
      ok: true as const,
      data: {
        result: {
          candidateText: "مرحبا",
          confidence: 0.81,
          notes: "via shared core",
        },
      },
    }));
    const ai = createAiServiceTranslationPort(runCapability);
    const wf = createTranslationStudioWorkflow({ ephemeral: true, ai });
    const value = wf
      .getSnapshot()
      .values.find((v) => v.language === "ar" && v.status === "approved");
    expect(value).toBeTruthy();

    // Force AI path: wipe memory hits by using a unique source via existing key
    // Pipeline may reuse memory — assert port wiring via direct propose path.
    const suggestion = await ai.suggest({
      sourceText: "Hello Shared AI",
      targetLanguage: "ar",
    });
    expect(runCapability).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "platform.translation_suggest",
      })
    );
    expect(suggestion.candidateText).toBe("مرحبا");
    expect(ai.kind).toBe("ai_service");
  });

  it("admin translation action imports Shared AI service, not provider adapters", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/translationStudio.ts"),
      "utf8"
    );
    expect(src).toMatch(/aiService\.runCapability|from ["'].*aiService["']/);
    expect(src).toMatch(/createAiServiceTranslationPort/);
    expect(src).not.toMatch(/createGeminiAdapter|createOpenAiCompatibleAdapter/);
    expect(src).not.toMatch(/generativelanguage\.googleapis\.com|api\.openai\.com/);
  });

  it("learning tutor server action stays on integration boundary", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/learningTutor.ts"),
      "utf8"
    );
    expect(src).toMatch(/learningTutorServerActions/);
    expect(src).not.toMatch(/providers\/|createGeminiAdapter|executeAiGateway/);
  });

  it("documents intentional non-AI / deferred surfaces", () => {
    // Content hooks are event contracts, not LLM generation.
    const hooks = readFileSync(
      join(process.cwd(), "lib/content/services/hookContracts.ts"),
      "utf8"
    );
    expect(hooks).toMatch(/future Search \/ Notifications \/ Analytics \/ AI/);
    expect(hooks).not.toMatch(/executeAiGateway|runCapability/);

    // Hub coming-soon cards are placeholders without Core capabilities.
    const hub = readFileSync(
      join(process.cwd(), "lib/ai/hub/capabilityRegistry.ts"),
      "utf8"
    );
    expect(hub).toMatch(/coming_soon/);
    expect(hub).toMatch(/creator\.assist_coming_soon/);

    // Commerce seller UI intentionally not shipped on this lineage.
    expect(() =>
      readFileSync(
        join(process.cwd(), "app/actions/aiProductDraft.ts"),
        "utf8"
      )
    ).toThrow();
  });

  it("aiService rejects unknown capabilities fail-closed", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "creator.assist_coming_soon",
        input: { text: "hi" },
        context: {
          surface: "test",
          productDomain: "platform",
        },
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: {} as any,
        userId: "11111111-1111-4111-8111-111111111111",
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Unknown capability/);
    }
  });

  it("scans production TS for direct provider domains outside adapters", () => {
    const allowed = new Set([
      "lib/ai/providers/adapters.ts",
      "lib/ai/providers/geminiAdapter.ts",
      "lib/ai/providers/anthropicAdapter.ts",
      "lib/ai/providers/localAdapter.ts",
      "lib/ai/config.ts",
    ]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return;
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".git") continue;
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name) || name.includes(".test.")) continue;
        const rel = relative(process.cwd(), full).replace(/\\/g, "/");
        if (allowed.has(rel)) continue;
        const src = readFileSync(full, "utf8");
        if (
          /api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com/.test(
            src
          )
        ) {
          offenders.push(rel);
        }
      }
    };
    walk(join(process.cwd(), "lib"));
    walk(join(process.cwd(), "app"));
    expect(offenders).toEqual([]);
  });
});
