/**
 * Assistant Runtime Service — orchestrates Foundation → Shared AI Core cycle.
 * No Chat UI. No skill/tool execution. Feature-flagged.
 */

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiPlatformError } from "../../contracts/errors";
import type { AiServiceResult, AiServiceRunRequest } from "../../contracts/public";
import { isAiUuid } from "../../context/envelope";
import {
  aiKnowledgeMemoryFoundation,
  type AiKnowledgeMemoryFoundation,
} from "../../knowledge/foundation";
import {
  aiUserInterestProfiles,
  type AiUserInterestProfileStore,
} from "../../personalization/userInterestProfile";
import { runCapability } from "../../services/aiService";
import { assembleAssistantContext } from "../contextAssembly";
import {
  createAssistantConversation,
  validateSystemContext,
} from "../conversation";
import { routeAssistantSkill } from "../routing";
import {
  aiAssistantSkillRegistry,
  type AiAssistantSkillRegistry,
} from "../skillRegistry";
import { buildRuntimeContextAssemblyInput } from "./contextSources";
import { isAssistantRuntimeEnabled } from "./featureFlag";
import {
  sanitizeAssistantRuntimeResponse,
  sanitizeRuntimeFailureMessage,
} from "./sanitize";
import {
  ASSISTANT_RUNTIME_CAPABILITY_ID,
  type AiAssistantRuntimeDiagnostics,
  type AiAssistantRuntimeError,
  type AiAssistantRuntimeIdentity,
  type AiAssistantRuntimeRequest,
  type AiAssistantRuntimeResult,
  type AiAssistantRuntimeStageDiagnostic,
} from "./types";

export type AiAssistantRuntimeInvokeCore = (input: {
  request: AiServiceRunRequest;
  userId: string;
  forceStub?: boolean;
  supabase: SupabaseClient;
}) => Promise<AiServiceResult>;

export type AiAssistantRuntimeRouter = {
  route: typeof routeAssistantSkill;
  assembleContext: typeof assembleAssistantContext;
  skills: AiAssistantSkillRegistry;
};

export type RunAssistantRuntimeInput = {
  request: AiAssistantRuntimeRequest;
  identity: AiAssistantRuntimeIdentity;
  supabase: SupabaseClient;
  /** Test override — default reads UMTUBA_AI_ASSISTANT_RUNTIME. */
  enabled?: boolean;
  forceStub?: boolean;
  router?: AiAssistantRuntimeRouter;
  knowledgeMemory?: AiKnowledgeMemoryFoundation;
  interestProfiles?: AiUserInterestProfileStore;
  invokeCore?: AiAssistantRuntimeInvokeCore;
};

function emptyDiagnostics(
  runtimeId: string,
  flagEnabled: boolean
): AiAssistantRuntimeDiagnostics {
  return {
    runtimeId,
    flagEnabled,
    skillId: null,
    requestKind: null,
    stages: [],
    aiServiceCapabilityId: null,
    aiServiceRunId: null,
    usedRag: false,
    usedVectorSearch: false,
    usedSkillExecution: false,
    usedToolInvocation: false,
  };
}

function pushStage(
  diagnostics: AiAssistantRuntimeDiagnostics,
  stage: AiAssistantRuntimeStageDiagnostic
): void {
  diagnostics.stages.push(stage);
}

function failClosed(
  diagnostics: AiAssistantRuntimeDiagnostics,
  status: "disabled" | "failed",
  code: AiAssistantRuntimeError["code"],
  message: string
): AiAssistantRuntimeResult {
  return {
    ok: false,
    status,
    error: {
      code,
      message: sanitizeRuntimeFailureMessage(message),
    },
    diagnostics,
  };
}

const defaultInvokeCore: AiAssistantRuntimeInvokeCore = async (input) =>
  runCapability(input.request, {
    supabase: input.supabase,
    userId: input.userId,
    forceStub: input.forceStub,
  });

/**
 * Full server-side assistant processing cycle:
 * Conversation → Context Assembly → Routing → AI Service → Sanitization
 */
export async function runAssistantRuntime(
  input: RunAssistantRuntimeInput
): Promise<AiAssistantRuntimeResult> {
  const runtimeId = randomUUID();
  const enabled =
    typeof input.enabled === "boolean"
      ? input.enabled
      : isAssistantRuntimeEnabled();
  const diagnostics = emptyDiagnostics(runtimeId, enabled);

  try {
    pushStage(diagnostics, {
      stage: "flag",
      ok: enabled,
      detail: enabled ? "enabled" : "disabled",
    });
    if (!enabled) {
      return failClosed(
        diagnostics,
        "disabled",
        "runtime_disabled",
        "Assistant runtime is disabled."
      );
    }

    if (!isAiUuid(input.identity.userId)) {
      pushStage(diagnostics, {
        stage: "identity",
        ok: false,
        detail: "invalid_user",
      });
      return failClosed(
        diagnostics,
        "failed",
        "unauthenticated",
        "Valid user is required."
      );
    }
    pushStage(diagnostics, {
      stage: "identity",
      ok: true,
      detail: "server_user",
    });

    const router: AiAssistantRuntimeRouter = input.router ?? {
      route: (request, skills) => routeAssistantSkill(request, skills),
      assembleContext: assembleAssistantContext,
      skills: aiAssistantSkillRegistry,
    };
    const knowledgeMemory =
      input.knowledgeMemory ?? aiKnowledgeMemoryFoundation;
    const interestProfiles =
      input.interestProfiles ?? aiUserInterestProfiles;
    const invokeCore = input.invokeCore ?? defaultInvokeCore;

    const productDomain =
      input.request.productDomain?.trim() || "platform";
    const surface = input.request.surface?.trim() || "assistant.runtime";

    const conversation = createAssistantConversation({
      userId: input.identity.userId,
      conversationId: input.request.conversationId,
      metadata: {
        productDomain,
        surface,
        locale: input.request.locale ?? null,
        workspaceId: null,
        tags: input.request.tags ?? [],
      },
    });
    pushStage(diagnostics, {
      stage: "conversation",
      ok: true,
      detail: conversation.conversationId,
    });

    const routing = router.route(
      {
        requestKind: input.request.requestKind,
        preferredSkillId: input.request.preferredSkillId,
        promptText: input.request.messageText,
      },
      router.skills
    );
    diagnostics.skillId = routing.skillId;
    diagnostics.requestKind = routing.requestKind;
    pushStage(diagnostics, {
      stage: "routing",
      ok: true,
      detail: `${routing.skillId}:${routing.reason}`,
    });

    if (
      input.request.domain &&
      input.request.domain.domain !== routing.skillId
    ) {
      pushStage(diagnostics, {
        stage: "context_assembly",
        ok: false,
        detail: "domain_mismatch",
      });
      return failClosed(
        diagnostics,
        "failed",
        "invalid_input",
        "Domain context skill mismatch."
      );
    }

    const assemblyInput = buildRuntimeContextAssemblyInput({
      conversationId: conversation.conversationId,
      skillId: routing.skillId,
      user: {
        userId: input.identity.userId,
        locale: input.request.locale ?? null,
        role: input.request.role ?? null,
      },
      messageText: input.request.messageText,
      domain: input.request.domain
        ? { ...input.request.domain, domain: routing.skillId }
        : {
            domain: routing.skillId,
            resourceRefs: [],
            labels: [],
          },
      systemPromptRef:
        input.request.systemPromptRef ??
        `assistant.${routing.skillId}@1.0.0`,
      knowledgeMemory,
      interestProfiles,
    });

    const assembled = router.assembleContext(assemblyInput);
    const systemContext = validateSystemContext({
      systemPromptRef: assemblyInput.systemPromptRef!,
      contextAssemblyId: assembled.assemblyId,
      skillId: routing.skillId,
      requestKind: routing.requestKind,
    });
    pushStage(diagnostics, {
      stage: "context_assembly",
      ok: true,
      detail: `blocks:${assembled.blocks.length}`,
    });

    // Bounded Core payload — summaries only; no system prompt text, no raw stores.
    const contextDigest = assembled.blocks
      .filter((b) => b.origin !== "system_ref")
      .map((b) => `${b.origin}:${b.label}`)
      .slice(0, 12)
      .join("|");

    const coreRequest: AiServiceRunRequest = {
      capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
      input: {
        text: [
          `requestKind=${routing.requestKind}`,
          `skillId=${routing.skillId}`,
          `message=${input.request.messageText.trim().slice(0, 2000)}`,
          `contextDigest=${contextDigest}`,
        ].join("\n"),
      },
      context: {
        productDomain,
        surface,
        locale: input.request.locale ?? undefined,
      },
    };

    diagnostics.aiServiceCapabilityId = ASSISTANT_RUNTIME_CAPABILITY_ID;
    const serviceResult = await invokeCore({
      request: coreRequest,
      userId: input.identity.userId,
      forceStub: input.forceStub,
      supabase: input.supabase,
    });

    if (!serviceResult.ok) {
      diagnostics.aiServiceRunId = serviceResult.error.runId;
      pushStage(diagnostics, {
        stage: "ai_service",
        ok: false,
        detail: serviceResult.error.code,
      });
      return failClosed(
        diagnostics,
        "failed",
        serviceResult.error.code,
        serviceResult.error.message
      );
    }

    diagnostics.aiServiceRunId = serviceResult.data.runId;
    pushStage(diagnostics, {
      stage: "ai_service",
      ok: true,
      detail: "completed",
    });

    const response = sanitizeAssistantRuntimeResponse({
      conversationId: conversation.conversationId,
      skillId: routing.skillId,
      requestKind: routing.requestKind,
      serviceResult,
    });
    pushStage(diagnostics, {
      stage: "sanitization",
      ok: true,
      detail: "ok",
    });

    // Touch validated system context for pipeline completeness (never returned).
    void systemContext;

    return {
      ok: true,
      status: "completed",
      response,
      diagnostics,
    };
  } catch (err) {
    const code =
      err instanceof AiPlatformError ? err.code : "provider_error";
    const message =
      err instanceof AiPlatformError
        ? err.message
        : "Assistant runtime failed.";
    pushStage(diagnostics, {
      stage: "sanitization",
      ok: false,
      detail: code,
    });
    return failClosed(diagnostics, "failed", code, message);
  }
}
