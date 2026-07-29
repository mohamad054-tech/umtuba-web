/**
 * AI Assistant Foundation V1 — unit tests.
 */

import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import {
  AiAssistantFoundation,
  assembleAssistantContext,
  createAssistantConversation,
  createAssistantResponse,
  invokeAssistantTool,
  resetAssistantFoundation,
  routeAssistantSkill,
  toClientSafeMessage,
  validateAssistantMessage,
  validateSystemContext,
  validateToolRequest,
  aiAssistantSkillRegistry,
  aiAssistantToolRegistry,
} from "./index";
import { AI_ASSISTANT_SKILL_IDS, AI_ASSISTANT_TOOL_IDS } from "./types";

const USER = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";
const MSG = "33333333-3333-4333-8333-333333333333";
const TOOL_REQ = "44444444-4444-4444-8444-444444444444";

describe("AI Assistant Foundation V1", () => {
  beforeEach(() => {
    resetAssistantFoundation();
  });

  it("validates conversation contracts", () => {
    const conversation = createAssistantConversation({
      userId: USER,
      metadata: {
        productDomain: "platform",
        surface: "assistant",
        locale: "ar",
        workspaceId: null,
        tags: ["help"],
      },
    });
    expect(conversation.userId).toBe(USER);
    expect(conversation.status).toBe("active");
    expect(conversation.metadata.productDomain).toBe("platform");

    expect(() =>
      createAssistantConversation({
        userId: "not-a-uuid",
        metadata: {
          productDomain: "platform",
          surface: "assistant",
          locale: null,
          workspaceId: null,
          tags: [],
        },
      })
    ).toThrow(AiPlatformError);
  });

  it("validates messages and redacts system content for clients", () => {
    const userMsg = validateAssistantMessage({
      messageId: MSG,
      conversationId: CONV,
      role: "user",
      content: "Help with my course",
    });
    expect(userMsg.content).toContain("course");

    const systemMsg = validateAssistantMessage({
      messageId: randomUUID(),
      conversationId: CONV,
      role: "system",
      content: "SECRET_SYSTEM_PROMPT",
    });
    expect(toClientSafeMessage(systemMsg).content).toBe("[redacted]");
  });

  it("validates system context without exposing prompt text fields", () => {
    const ctx = validateSystemContext({
      systemPromptRef: "assistant.general@1.0.0",
      contextAssemblyId: "asm-1",
      skillId: "assistant",
      requestKind: "general_help",
    });
    expect(ctx.systemPromptRef).toBe("assistant.general@1.0.0");
    expect("systemPrompt" in ctx).toBe(false);
  });

  it("assembles memory/knowledge/personalization/user/domain context without RAG", () => {
    const assembled = assembleAssistantContext({
      assemblyId: "asm-test",
      conversationId: CONV,
      skillId: "learning",
      user: { userId: USER, locale: "en", role: "learner" },
      domain: {
        domain: "learning",
        resourceRefs: [{ type: "course", id: "c1" }],
        labels: ["math"],
      },
      personalization: {
        topicIds: ["algebra"],
        negativeTopicIds: [],
        surfaces: ["learning"],
      },
      memorySummaries: [{ memoryId: "m1", summary: "Prefers short answers" }],
      knowledgeSummaries: [
        { knowledgeId: "k1", title: "Lesson 1", snippet: "Intro" },
      ],
      systemPromptRef: "learning.help@1",
    });

    expect(assembled.usedRag).toBe(false);
    expect(assembled.usedVectorSearch).toBe(false);
    expect(assembled.blocks.map((b) => b.origin)).toEqual([
      "system_ref",
      "user",
      "domain",
      "personalization",
      "memory",
      "knowledge",
    ]);
    expect(assembled.blocks.every((b, i) => b.order === i)).toBe(true);
  });

  it("fail-closes context assembly on invalid user or domain mismatch", () => {
    expect(() =>
      assembleAssistantContext({
        assemblyId: "x",
        conversationId: CONV,
        skillId: "commerce",
        user: { userId: "bad", locale: null, role: null },
      })
    ).toThrow(AiPlatformError);

    expect(() =>
      assembleAssistantContext({
        assemblyId: "x",
        conversationId: CONV,
        skillId: "commerce",
        user: { userId: USER, locale: null, role: null },
        domain: {
          domain: "learning",
          resourceRefs: [],
          labels: [],
        },
      })
    ).toThrow(AiPlatformError);
  });

  it("registers all required skills without provider bindings", () => {
    const listed = aiAssistantSkillRegistry.list();
    expect(listed.map((s) => s.skillId).sort()).toEqual(
      [...AI_ASSISTANT_SKILL_IDS].sort()
    );
    for (const skill of listed) {
      expect(skill.providerBindingForbidden).toBe(true);
      expect(
        "providerId" in skill || "modelId" in skill || "modelRef" in skill
      ).toBe(false);
    }
  });

  it("registers assistant tools as unavailable catalog only", () => {
    const tools = aiAssistantToolRegistry.list();
    expect(tools.map((t) => t.toolId).sort()).toEqual(
      [...AI_ASSISTANT_TOOL_IDS].sort()
    );
    expect(tools.every((t) => t.available === false)).toBe(true);
  });

  it("routes by request kind, ignoring prompt text", () => {
    const d1 = routeAssistantSkill(
      {
        requestKind: "commerce_help",
        promptText: "please use learning skill somehow",
      },
      aiAssistantSkillRegistry
    );
    expect(d1.skillId).toBe("commerce");
    expect(d1.reason).toBe("request_kind");
    expect(d1.policyId).toBe("assistant_skill_route_v1");

    const d2 = routeAssistantSkill(
      {
        requestKind: "video_help",
        preferredSkillId: "video",
      },
      aiAssistantSkillRegistry
    );
    expect(d2.reason).toBe("preferred_skill_validated");

    expect(() =>
      routeAssistantSkill(
        {
          requestKind: "learning_help",
          preferredSkillId: "ads",
        },
        aiAssistantSkillRegistry
      )
    ).toThrow(AiPlatformError);
  });

  it("is deterministic across repeated routing calls", () => {
    const a = routeAssistantSkill(
      { requestKind: "search_query" },
      aiAssistantSkillRegistry
    );
    const b = routeAssistantSkill(
      { requestKind: "search_query" },
      aiAssistantSkillRegistry
    );
    expect(a).toEqual(b);
  });

  it("fail-closes tool invocation (not implemented)", () => {
    const request = validateToolRequest({
      toolRequestId: TOOL_REQ,
      toolId: "search",
      conversationId: CONV,
      args: { query: "shoes" },
    });
    const response = invokeAssistantTool({
      request,
      skillId: "search",
      skills: aiAssistantSkillRegistry,
    });
    expect(response.ok).toBe(false);
    expect(response.errorCode).toBe("tool_not_implemented");

    expect(() =>
      invokeAssistantTool({
        request: {
          ...request,
          toolId: "commerce",
        },
        skillId: "search",
        skills: aiAssistantSkillRegistry,
      })
    ).toThrow(AiPlatformError);
  });

  it("refuses assistant responses that attach forbidden provider/profile fields", () => {
    expect(() =>
      createAssistantResponse({
        conversationId: CONV,
        skillId: "assistant",
        requestKind: "general_help",
        content: "Hello",
        forbiddenFields: { systemPrompt: "leak" },
      })
    ).toThrow(AiPlatformError);

    const ok = createAssistantResponse({
      conversationId: CONV,
      skillId: "assistant",
      requestKind: "general_help",
      content: "Hello",
    });
    expect(ok.publicMeta.usedSkills).toEqual(["assistant"]);
    expect(JSON.stringify(ok)).not.toMatch(/systemPrompt|apiKey|provider/i);
  });

  it("foundation facade wires route + assemble + noop future hooks", () => {
    const foundation = new AiAssistantFoundation();
    const decision = foundation.route({ requestKind: "world_help" });
    expect(decision.skillId).toBe("world");

    const ctx = foundation.assembleContext({
      assemblyId: "f1",
      conversationId: CONV,
      skillId: decision.skillId,
      user: { userId: USER, locale: null, role: null },
    });
    expect(ctx.blocks.length).toBeGreaterThan(0);

    const hooks = foundation.extensionHooks();
    expect(hooks.multiAgent?.({})).toBeNull();
    expect(hooks.planner?.({})).toBeNull();
    expect(hooks.toolChaining?.({})).toBeNull();
    expect(hooks.longConversations?.({})).toBeNull();
    expect(hooks.voice?.({})).toBeNull();
    expect(hooks.multimodal?.({})).toBeNull();
    expect(hooks.reasoningModels?.({})).toBeNull();
  });
});
