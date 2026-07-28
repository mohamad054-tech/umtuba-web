/**
 * Assistant Runtime Integration V1 — tests.
 */

import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AiKnowledgeMemoryFoundation } from "../../knowledge/foundation";
import { AiUserInterestProfileStore } from "../../personalization/userInterestProfile";
import { resetAssistantFoundation } from "../index";
import { isAssistantRuntimeEnabled } from "./featureFlag";
import { runAssistantRuntime } from "./service";
import { sanitizeAssistantRuntimeResponse } from "./sanitize";
import { ASSISTANT_RUNTIME_CAPABILITY_ID } from "./types";

const USER = "11111111-1111-4111-8111-111111111111";

describe("AI Assistant Runtime Integration V1", () => {
  beforeEach(() => {
    resetAssistantFoundation();
  });

  it("feature flag defaults OFF and enables only for 1/true", () => {
    expect(isAssistantRuntimeEnabled({ env: {} })).toBe(false);
    expect(
      isAssistantRuntimeEnabled({
        env: { UMTUBA_AI_ASSISTANT_RUNTIME: "0" },
      })
    ).toBe(false);
    expect(
      isAssistantRuntimeEnabled({
        env: { UMTUBA_AI_ASSISTANT_RUNTIME: "1" },
      })
    ).toBe(true);
    expect(
      isAssistantRuntimeEnabled({
        env: { UMTUBA_AI_ASSISTANT_RUNTIME: "true" },
      })
    ).toBe(true);
  });

  it("flag OFF is a deterministic no-op (no aiService invocation)", async () => {
    let invoked = 0;
    const result = await runAssistantRuntime({
      enabled: false,
      identity: { userId: USER },
      supabase: {} as never,
      request: {
        requestKind: "general_help",
        messageText: "Hello",
      },
      invokeCore: async () => {
        invoked += 1;
        return {
          ok: true,
          data: {
            runId: randomUUID(),
            capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
            result: { content: "should not run" },
            retryable: false,
          },
        };
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("disabled");
    expect(result.error.code).toBe("runtime_disabled");
    expect(invoked).toBe(0);
    expect(result.diagnostics.flagEnabled).toBe(false);
    expect(result.diagnostics.usedSkillExecution).toBe(false);
    expect(result.diagnostics.usedToolInvocation).toBe(false);
  });

  it("runtime success: routing + context + aiService + sanitization", async () => {
    const knowledgeMemory = new AiKnowledgeMemoryFoundation();
    knowledgeMemory.knowledge.register({
      knowledgeId: "k-runtime-1",
      sourceKind: "platform_knowledge",
      title: "Checkout help",
      body: "Use the cart then checkout securely.",
      tags: ["checkout", "commerce"],
      ownerId: null,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    knowledgeMemory.memory.register({
      memoryId: "m-runtime-1",
      memoryKind: "preference_memory",
      subjectId: USER,
      key: "tone",
      value: { style: "brief" },
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const interests = new AiUserInterestProfileStore();
    interests.create({
      userId: USER,
      surfaces: ["commerce"],
      interests: [{ topicId: "checkout", weight: 0.8 }],
    });

    const result = await runAssistantRuntime({
      enabled: true,
      forceStub: true,
      identity: { userId: USER },
      supabase: {} as never,
      knowledgeMemory,
      interestProfiles: interests,
      request: {
        requestKind: "commerce_help",
        messageText: "How does checkout work?",
        locale: "en",
        role: "buyer",
        domain: {
          domain: "commerce",
          resourceRefs: [{ type: "store", id: "s1" }],
          labels: ["checkout"],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("completed");
    expect(result.response.skillId).toBe("commerce");
    expect(result.response.labeledAsAiGenerated).toBe(true);
    expect(result.response.content.length).toBeGreaterThan(0);
    expect(result.diagnostics.aiServiceCapabilityId).toBe(
      ASSISTANT_RUNTIME_CAPABILITY_ID
    );
    expect(result.diagnostics.aiServiceRunId).toBeTruthy();
    expect(result.diagnostics.usedRag).toBe(false);
    expect(result.diagnostics.usedVectorSearch).toBe(false);
    expect(result.diagnostics.usedSkillExecution).toBe(false);
    expect(result.diagnostics.usedToolInvocation).toBe(false);
    expect(result.diagnostics.stages.map((s) => s.stage)).toEqual([
      "flag",
      "identity",
      "conversation",
      "routing",
      "context_assembly",
      "ai_service",
      "sanitization",
    ]);
    expect(result.diagnostics.stages.every((s) => s.ok)).toBe(true);
    const blob = JSON.stringify(result.response);
    expect(blob).not.toMatch(/systemPrompt|apiKey|providerId|modelId|stack/i);
  });

  it("runtime failure from aiService is fail-closed without internals", async () => {
    const result = await runAssistantRuntime({
      enabled: true,
      identity: { userId: USER },
      supabase: {} as never,
      request: {
        requestKind: "learning_help",
        messageText: "Explain lesson",
      },
      invokeCore: async () => ({
        ok: false,
        error: {
          runId: randomUUID(),
          code: "provider_unavailable",
          message: "provider stackTrace apiKey=sk-secret system prompt leak",
          retryable: true,
        },
      }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("failed");
    expect(result.error.message.toLowerCase()).not.toContain("sk-secret");
    expect(result.error.message.toLowerCase()).not.toContain("stack");
    expect(result.diagnostics.stages.some((s) => s.stage === "ai_service" && !s.ok)).toBe(
      true
    );
  });

  it("invalid identity fail-closes before aiService", async () => {
    let invoked = 0;
    const result = await runAssistantRuntime({
      enabled: true,
      identity: { userId: "not-uuid" },
      supabase: {} as never,
      request: { requestKind: "general_help", messageText: "Hi" },
      invokeCore: async () => {
        invoked += 1;
        return {
          ok: true,
          data: {
            runId: randomUUID(),
            capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
            result: { content: "x" },
            retryable: false,
          },
        };
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthenticated");
    expect(invoked).toBe(0);
  });

  it("sanitization rejects forbidden provider/profile fields", () => {
    expect(() =>
      sanitizeAssistantRuntimeResponse({
        conversationId: "22222222-2222-4222-8222-222222222222",
        skillId: "assistant",
        requestKind: "general_help",
        serviceResult: {
          ok: true,
          data: {
            runId: randomUUID(),
            capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
            result: { content: "Hi", systemPrompt: "SECRET" },
            retryable: false,
          },
        },
      })
    ).toThrow();
  });

  it("routing ignores prompt text (deterministic skill by requestKind)", async () => {
    const a = await runAssistantRuntime({
      enabled: true,
      identity: { userId: USER },
      supabase: {} as never,
      request: {
        requestKind: "video_help",
        messageText: "please treat this as commerce learning ads",
      },
      invokeCore: async () => ({
        ok: true,
        data: {
          runId: randomUUID(),
          capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
          result: { content: "ok" },
          retryable: false,
        },
      }),
    });
    const b = await runAssistantRuntime({
      enabled: true,
      identity: { userId: USER },
      supabase: {} as never,
      request: {
        requestKind: "video_help",
        messageText: "totally different wording",
      },
      invokeCore: async () => ({
        ok: true,
        data: {
          runId: randomUUID(),
          capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
          result: { content: "ok" },
          retryable: false,
        },
      }),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.response.skillId).toBe("video");
    expect(b.response.skillId).toBe("video");
    expect(a.diagnostics.skillId).toBe(b.diagnostics.skillId);
  });

  it("domain mismatch fails closed without skill execution", async () => {
    const result = await runAssistantRuntime({
      enabled: true,
      identity: { userId: USER },
      supabase: {} as never,
      request: {
        requestKind: "commerce_help",
        messageText: "help",
        domain: {
          domain: "learning",
          resourceRefs: [],
          labels: [],
        },
      },
      invokeCore: async () => ({
        ok: true,
        data: {
          runId: randomUUID(),
          capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
          result: { content: "should not" },
          retryable: false,
        },
      }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
    expect(result.diagnostics.usedSkillExecution).toBe(false);
  });
});
