import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resetCapabilityCatalogRegistryForTests } from "../catalog";
import { getCapabilityCatalogRegistry } from "../catalog";
import {
  aiPolicyRegistry,
  resetPolicyGovernanceFoundation,
} from "../policy";
import { resetUsageQuotasBillingFoundation } from "../usage/usageFoundation";
import {
  resetUnifiedCapabilityExecution,
  aiUnifiedExecutionStore,
} from "../execution";
import { resetAiOrchestrationFoundation } from "../orchestration";
import {
  AI_CREATOR_STUDIO_VERSION,
  CREATOR_DESCRIPTION_CONTRACT,
  CREATOR_HASHTAG_CONTRACT,
  CREATOR_MODERATION_CONTRACT,
  CREATOR_REWRITE_CONTRACT,
  CREATOR_SEO_CONTRACT,
  CREATOR_STUDIO_CAPABILITY_ID,
  CREATOR_SUGGESTION_CONTRACT,
  CREATOR_TEMPLATE_KINDS,
  CREATOR_TITLE_CONTRACT,
  CREATOR_TRANSLATION_CONTRACT,
  buildCreatorPromptTemplates,
  creatorStudioStore,
  creatorStudioTemplateRegistry,
  resetCreatorStudioFoundation,
  runCreatorStudioRequest,
} from "./index";

const ROOT = process.cwd();

afterEach(() => {
  resetCreatorStudioFoundation();
  resetUnifiedCapabilityExecution();
  resetAiOrchestrationFoundation();
  resetPolicyGovernanceFoundation();
  resetUsageQuotasBillingFoundation();
  resetCapabilityCatalogRegistryForTests();
});

describe("AI Creator Studio Foundation V1", () => {
  it("exposes foundation version and capability id", () => {
    expect(AI_CREATOR_STUDIO_VERSION).toBe("ai-creator-studio-foundation-v1");
    expect(CREATOR_STUDIO_CAPABILITY_ID).toBe("creator.studio.assist");
  });

  it("template registry lists eight creator templates", () => {
    const templates = creatorStudioTemplateRegistry.list();
    expect(templates).toHaveLength(8);
    expect(templates.map((t) => t.kind).sort()).toEqual(
      [...CREATOR_TEMPLATE_KINDS].sort()
    );
    for (const t of templates) {
      expect(t.enabled).toBe(true);
      expect(t.capabilityId).toBe(CREATOR_STUDIO_CAPABILITY_ID);
      expect(t.policyBindingHint).toBe(
        `binding.${CREATOR_STUDIO_CAPABILITY_ID}.v1`
      );
      expect(t.supportedOperations).toContain("draft");
      expect(t.supportedOperations).toContain("moderation_preview");
      expect(t.promptContract.systemHint).toMatch(/no live inference/i);
    }
  });

  it("buildCreatorPromptTemplates matches registry contents", () => {
    const built = buildCreatorPromptTemplates();
    expect(built.map((t) => t.templateId)).toEqual(
      creatorStudioTemplateRegistry.list().map((t) => t.templateId)
    );
  });

  it("request model builds content requests with required fields", () => {
    const session = creatorStudioStore.createSession({
      userId: "u1",
      tenantId: "t1",
    });
    const request = creatorStudioStore.buildRequest({
      sessionId: session.sessionId,
      templateId: "tpl.post.v1",
      operation: "draft",
      prompt: "Hello creators",
      locale: "en",
      targetLocale: null,
      outputKind: "plain_text",
      structuredOutput: false,
      userId: "u1",
      tenantId: "t1",
    });
    expect(request.requestId).toMatch(/^creq_/);
    expect(request.prompt).toBe("Hello creators");
    expect(request.operation).toBe("draft");
    expect(request.templateId).toBe("tpl.post.v1");
  });

  it("result model returns mock_ready with mock output only", () => {
    const session = creatorStudioStore.createSession({
      userId: "u1",
      tenantId: "t1",
    });
    const { result } = runCreatorStudioRequest({
      sessionId: session.sessionId,
      templateId: "tpl.post.v1",
      operation: "draft",
      prompt: "Draft a post about UMTUBA",
    });
    expect(result.status).toBe("mock_ready");
    expect(result.mockOutput).toMatch(/Creator Studio Foundation mock/);
    expect(result.mockOutput).not.toMatch(/gemini|openai|anthropic/i);
    expect(result.unifiedExecutionId).toBeTruthy();
    expect(result.unifiedResult).toBe("ready_for_execution");
  });

  it("sessions, favorites, drafts, history, and versions work", () => {
    const session = creatorStudioStore.getOrCreateSession({
      userId: "u1",
      tenantId: "t1",
    });
    const again = creatorStudioStore.getOrCreateSession({
      userId: "u1",
      tenantId: "t1",
    });
    expect(again.sessionId).toBe(session.sessionId);

    const fav = creatorStudioStore.toggleFavorite(
      session.sessionId,
      "tpl.video.v1"
    );
    expect(fav.favoriteTemplateIds).toContain("tpl.video.v1");

    const draft = creatorStudioStore.createDraft({
      sessionId: session.sessionId,
      templateId: "tpl.article.v1",
      title: "Article draft",
      prompt: "Outline an article",
    });
    expect(draft.latestVersion).toBe(1);
    expect(draft.versions).toHaveLength(1);

    const { result } = runCreatorStudioRequest({
      sessionId: session.sessionId,
      templateId: "tpl.article.v1",
      operation: "rewrite",
      prompt: "Make it clearer",
      draftId: draft.draftId,
    });
    expect(result.status).toBe("mock_ready");

    const drafts = creatorStudioStore.listDrafts(session.sessionId);
    expect(drafts[0]?.latestVersion).toBe(2);
    expect(drafts[0]?.versions).toHaveLength(2);

    const history = creatorStudioStore.listHistory(session.sessionId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.at(-1)?.operation).toBe("rewrite");
  });

  it("suggestion / rewrite / title / description / hashtag / seo contracts", () => {
    expect(CREATOR_SUGGESTION_CONTRACT.contractId).toBe("suggestion.v1");
    expect(CREATOR_SUGGESTION_CONTRACT.maxSuggestions).toBe(5);
    expect(CREATOR_REWRITE_CONTRACT.modes).toEqual([
      "shorter",
      "clearer",
      "more_engaging",
    ]);
    expect(CREATOR_TITLE_CONTRACT.maxLength).toBe(80);
    expect(CREATOR_DESCRIPTION_CONTRACT.maxLength).toBe(500);
    expect(CREATOR_HASHTAG_CONTRACT.maxTags).toBe(12);
    expect(CREATOR_SEO_CONTRACT.fields).toEqual([
      "title",
      "description",
      "keywords",
    ]);
  });

  it("translation and moderation contracts", () => {
    expect(CREATOR_TRANSLATION_CONTRACT.requiresTargetLocale).toBe(true);
    expect(CREATOR_MODERATION_CONTRACT.labels).toEqual([
      "safe",
      "needs_review",
      "blocked_preview",
    ]);

    const session = creatorStudioStore.createSession({
      userId: "u1",
      tenantId: "t1",
    });
    expect(() =>
      runCreatorStudioRequest({
        sessionId: session.sessionId,
        templateId: "tpl.post.v1",
        operation: "translate",
        prompt: "Hello",
      })
    ).toThrow(/targetLocale/i);

    const translated = runCreatorStudioRequest({
      sessionId: session.sessionId,
      templateId: "tpl.post.v1",
      operation: "translate",
      prompt: "Hello",
      targetLocale: "ar",
      outputKind: "translation",
    });
    expect(translated.result.status).toBe("mock_ready");

    const moderation = runCreatorStudioRequest({
      sessionId: session.sessionId,
      templateId: "tpl.story_caption.v1",
      operation: "moderation_preview",
      prompt: "Check this caption",
      outputKind: "moderation_preview",
    });
    expect(moderation.result.status).toBe("mock_ready");
    expect(moderation.result.mockOutput).toMatch(/moderation_preview/);
  });

  it("routes every request through Unified Capability Execution only", () => {
    const before = aiUnifiedExecutionStore.listRecent(100).length;
    const session = creatorStudioStore.createSession({
      userId: "u1",
      tenantId: "t1",
    });
    const { unifiedExecutionId, result } = runCreatorStudioRequest({
      sessionId: session.sessionId,
      templateId: "tpl.bio.v1",
      operation: "generate_title",
      prompt: "Bio for a travel creator",
      structuredOutput: true,
    });
    expect(unifiedExecutionId).toBe(result.unifiedExecutionId);
    const recent = aiUnifiedExecutionStore.listRecent(100);
    expect(recent.length).toBe(before + 1);
    const last = recent.at(-1);
    expect(last?.context.capabilityId).toBe(CREATOR_STUDIO_CAPABILITY_ID);
    expect(last?.audit.capabilityId).toBe(CREATOR_STUDIO_CAPABILITY_ID);
    expect(last?.result).toBe("ready_for_execution");
    expect(result.structuredMock).toMatchObject({
      status: "mock_only",
    });
  });

  it("maps capability and policy binding correctly", () => {
    const cap = getCapabilityCatalogRegistry().lookup(
      CREATOR_STUDIO_CAPABILITY_ID
    );
    expect(cap).toBeTruthy();
    expect(cap?.executable).toBe(true);
    expect(cap?.lifecycle).toBe("active");
    expect(cap?.category).toBe("creator");
    expect(cap?.documentation.sourceModule).toContain("creatorStudio");

    const binding = aiPolicyRegistry.getBinding(CREATOR_STUDIO_CAPABILITY_ID);
    expect(binding?.policyId).toBe(
      `binding.${CREATOR_STUDIO_CAPABILITY_ID}.v1`
    );
    expect(binding?.capabilityId).toBe(CREATOR_STUDIO_CAPABILITY_ID);
  });

  it("service source does not import providers or call network APIs", () => {
    const service = readFileSync(
      join(ROOT, "lib/ai/creatorStudio/service.ts"),
      "utf8"
    );
    expect(service).toMatch(/executeUnifiedCapability/);
    expect(service).not.toMatch(/from ["'].*providers/);
    expect(service).not.toMatch(/gemini|openai|anthropic|fetch\(/i);
    expect(service).not.toMatch(/runCapability\(/);

    for (const rel of [
      "lib/ai/creatorStudio/types.ts",
      "lib/ai/creatorStudio/templates.ts",
      "lib/ai/creatorStudio/registry.ts",
      "lib/ai/creatorStudio/index.ts",
      "app/creator/studio/actions.ts",
      "app/creator/studio/page.tsx",
      "app/creator/studio/CreatorStudioClient.tsx",
      "app/admin/ai/creator-studio/page.tsx",
    ]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src).not.toMatch(/from ["'].*\/providers/);
      expect(src).not.toMatch(/\bgemini\b|\bopenai\b|\banthropic\b/i);
    }
  });

  it("foundation UI routes exist", () => {
    expect(existsSync(join(ROOT, "app/creator/studio/page.tsx"))).toBe(true);
    expect(
      existsSync(join(ROOT, "app/admin/ai/creator-studio/page.tsx"))
    ).toBe(true);
    const routes = readFileSync(join(ROOT, "app/lib/nav/routes.ts"), "utf8");
    expect(routes).toMatch(/creatorStudio:\s*"\/creator\/studio"/);
  });

  it("rejects empty prompt and unknown session", () => {
    expect(() =>
      runCreatorStudioRequest({
        sessionId: "missing",
        templateId: "tpl.post.v1",
        operation: "draft",
        prompt: "x",
      })
    ).toThrow(/session/i);

    const session = creatorStudioStore.createSession({
      userId: "u1",
      tenantId: "t1",
    });
    expect(() =>
      runCreatorStudioRequest({
        sessionId: session.sessionId,
        templateId: "tpl.post.v1",
        operation: "draft",
        prompt: "   ",
      })
    ).toThrow(/prompt/i);
  });
});
