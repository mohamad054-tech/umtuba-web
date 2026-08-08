/**
 * Canonical server-side AI service entry.
 * Flow: UI → typed contract → aiService.runCapability → Shared AI Core gateway
 *   → Routing Policy Engine → Provider Foundation adapter
 * Capabilities never select models/providers directly.
 * Usage/cost tracking is recorded after execution only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_RETRYABLE_CODES,
  type AiServiceResult,
  type AiServiceRunRequest,
  type ProductDraftAssistantResult,
} from "../contracts/public";
import { failResult } from "../contracts/errors";
import { executeAiGateway } from "../gateway/execute";
import { runProductDraftAssistant } from "../capabilities/commerce/productDraftAssistant";
import {
  LEARNING_TUTOR_CAPABILITIES,
  runLearningTutorCapability,
  type LearningTutorCapabilityId,
} from "../capabilities/learning/tutorRunner";
import { loadAiPlatformConfig } from "../config";
import { recordAiServiceUsageAfterExecution } from "../usage/trackingFoundation";

export type AiServiceDeps = {
  supabase: SupabaseClient;
  userId: string | null;
  /** Test-only stub force. Never from clients. */
  forceStub?: boolean;
};

function asFailure(
  code: Parameters<typeof failResult>[0],
  message: string,
  runId: string | null = null
): AiServiceResult<never> {
  return {
    ok: false,
    error: {
      runId,
      code,
      message,
      retryable: AI_RETRYABLE_CODES.has(code),
    },
  };
}

function trackAfterServiceExecution(
  request: AiServiceRunRequest,
  deps: AiServiceDeps,
  result: AiServiceResult,
  startedMs: number
): void {
  if (!deps.userId) return;
  const requestId = result.ok
    ? result.data.runId
    : result.error.runId;
  if (!requestId) return;
  try {
    recordAiServiceUsageAfterExecution({
      requestId,
      capabilityId: request.capabilityId,
      providerId: null,
      modelId: result.ok
        ? ((result.data.result as { modelId?: string } | undefined)?.modelId ??
          null)
        : null,
      executionStatus: result.ok
        ? "completed"
        : result.error.code === "safety_block" ||
            result.error.code === "permission_denied"
          ? "blocked"
          : "failed",
      executionTimeMs: Math.max(0, Date.now() - startedMs),
      estimatedInputTokens: null,
      estimatedOutputTokens: null,
      estimatedCostMinor: null,
      costStatus: "unavailable",
      userId: deps.userId,
      workspaceId: request.context.storeId ?? request.context.courseId ?? null,
    });
  } catch {
    // Tracking must not break the service response.
  }
}

/**
 * Stable public entry point for all Domain AI capabilities.
 */
export async function runCapability(
  request: AiServiceRunRequest,
  deps: AiServiceDeps
): Promise<AiServiceResult> {
  const startedMs = Date.now();
  const result = await runCapabilityInner(request, deps);
  trackAfterServiceExecution(request, deps, result, startedMs);
  return result;
}

async function runCapabilityInner(
  request: AiServiceRunRequest,
  deps: AiServiceDeps
): Promise<AiServiceResult> {
  if (!deps.userId) {
    return asFailure("unauthenticated", "Authentication required.");
  }

  if (request.capabilityId === "commerce.product_draft_assistant") {
    const productId =
      request.input.productId ?? request.context.productId ?? "";
    if (!productId) {
      return asFailure("invalid_input", "productId is required.");
    }
    const result = await runProductDraftAssistant({
      supabase: deps.supabase,
      userId: deps.userId,
      productId,
      sellerNotes: request.input.notes ?? request.input.text,
      forceStub: deps.forceStub,
    });
    if (!result.ok) {
      return asFailure(result.code, result.message);
    }
    const payload: ProductDraftAssistantResult = {
      title: result.data.title,
      description: result.data.description,
      tags: result.data.tags,
      seoTitle: result.data.seoTitle,
      seoDescription: result.data.seoDescription,
      labeledAsAiGenerated: true,
      autoSaved: false,
      canAlterPrice: false,
      canAlterInventory: false,
      canPublish: false,
      promptVersion: result.data.promptVersion,
      modelId: result.data.modelId,
    };
    return {
      ok: true,
      data: {
        runId: result.data.runId,
        capabilityId: request.capabilityId,
        result: payload,
        retryable: false,
      },
    };
  }

  if (request.capabilityId === "learning.tutor.explain_wrong_answer") {
    const attemptId = request.input.attemptId?.trim() ?? "";
    const questionId = request.input.questionId?.trim() ?? "";
    if (!attemptId || !questionId) {
      return asFailure(
        "invalid_input",
        "attemptId and questionId are required."
      );
    }
    const result = await runLearningTutorCapability({
      supabase: deps.supabase,
      userId: deps.userId,
      lessonId: request.input.lessonId ?? request.context.lessonId ?? "",
      capabilityId: "learning.tutor.explain_wrong_answer",
      attemptId,
      questionId,
      question: request.input.question ?? request.input.text,
      locale: request.context.locale,
      forceStub: deps.forceStub,
    });
    if (!result.ok) {
      return asFailure(result.code, result.message);
    }
    return {
      ok: true,
      data: {
        runId: result.data.runId,
        capabilityId: request.capabilityId,
        result: {
          ...result.data.result,
          groundingStatus: result.data.groundingStatus,
          sourceReferences: result.data.sourceReferences,
          labeledAiGenerated: true,
          officialCourseContent: false,
          revealsAnswerKey: false,
          mutatesProgress: false,
          mutatesGrades: false,
          promptVersion: result.data.promptVersion,
          modelId: result.data.modelId,
        },
        retryable: false,
      },
    };
  }

  if (
    (LEARNING_TUTOR_CAPABILITIES as readonly string[]).includes(
      request.capabilityId
    )
  ) {
    const lessonId =
      request.input.lessonId ?? request.context.lessonId ?? "";
    if (!lessonId) {
      return asFailure("invalid_input", "lessonId is required.");
    }
    const result = await runLearningTutorCapability({
      supabase: deps.supabase,
      userId: deps.userId,
      lessonId,
      capabilityId: request.capabilityId as LearningTutorCapabilityId,
      question: request.input.question ?? request.input.text,
      locale: request.context.locale,
      forceStub: deps.forceStub,
    });
    if (!result.ok) {
      return asFailure(result.code, result.message);
    }
    return {
      ok: true,
      data: {
        runId: result.data.runId,
        capabilityId: request.capabilityId,
        result: {
          ...result.data.result,
          groundingStatus: result.data.groundingStatus,
          sourceReferences: result.data.sourceReferences,
          labeledAiGenerated: true,
          officialCourseContent: false,
          mutatesProgress: false,
          mutatesGrades: false,
          promptVersion: result.data.promptVersion,
          modelId: result.data.modelId,
        },
        retryable: false,
      },
    };
  }

  if (request.capabilityId === "platform.diagnostics_probe") {
    const config = loadAiPlatformConfig(
      deps.forceStub
        ? { mode: "stub", allowStub: true }
        : undefined
    );
    const gateway = await executeAiGateway(
      deps.userId,
      {
        capabilityId: "platform.diagnostics_probe",
        promptId: "platform.diagnostics_probe",
        userInput: request.input.text ?? "ping",
        outputMode: "structured_json",
        context: {
          productDomain: request.context.productDomain || "platform",
          surface: request.context.surface || "admin.diagnostics",
          dataClassification: "internal",
          allowedCapabilities: ["platform.diagnostics_probe"],
          allowedToolIds: [],
        },
        _test: deps.forceStub
          ? { forceStub: true, bypassRateLimit: true }
          : undefined,
      },
      { config, capabilityEligible: true, permissions: [] }
    );
    if (!gateway.ok) {
      return asFailure(gateway.code, gateway.message);
    }
    return {
      ok: true,
      data: {
        runId: gateway.data.runId,
        capabilityId: request.capabilityId,
        result: gateway.data.structured ?? { ok: true },
        retryable: false,
      },
    };
  }

  if (request.capabilityId === "platform.translation_suggest") {
    const config = loadAiPlatformConfig(
      deps.forceStub
        ? { mode: "stub", allowStub: true }
        : undefined
    );
    const gateway = await executeAiGateway(
      deps.userId,
      {
        capabilityId: "platform.translation_suggest",
        promptId: "platform.translation_suggest",
        userInput: [
          request.input.text ?? "",
          request.input.notes ? `\n${request.input.notes}` : "",
        ].join(""),
        outputMode: "structured_json",
        context: {
          productDomain: request.context.productDomain || "platform",
          surface: request.context.surface || "admin.translation_studio",
          dataClassification: "internal",
          locale: request.context.locale ?? null,
          allowedCapabilities: ["platform.translation_suggest"],
          allowedToolIds: [],
        },
        preferredModelHint: request.preferredModelHint,
        _test: deps.forceStub
          ? { forceStub: true, bypassRateLimit: true }
          : undefined,
      },
      { config, capabilityEligible: true, permissions: [] }
    );
    if (!gateway.ok) {
      return asFailure(gateway.code, gateway.message);
    }
    const structured = (gateway.data.structured ?? {}) as Record<
      string,
      unknown
    >;
    // Backwards-compatible narrow shape for legacy suggestion path only.
    const candidateText =
      typeof structured.candidateText === "string"
        ? structured.candidateText
        : "";
    const confidence =
      typeof structured.confidence === "number" ? structured.confidence : 0;
    return {
      ok: true,
      data: {
        runId: gateway.data.runId,
        capabilityId: request.capabilityId,
        result: {
          candidateText,
          confidence,
          notes:
            typeof structured.notes === "string"
              ? structured.notes
              : "Human review required before Translation Memory publish.",
        },
        retryable: false,
      },
    };
  }

  if (
    request.capabilityId === "platform.translation_professional_generate" ||
    request.capabilityId === "platform.translation_professional_review"
  ) {
    const config = loadAiPlatformConfig(
      deps.forceStub
        ? { mode: "stub", allowStub: true }
        : undefined
    );
    const capabilityId = request.capabilityId;
    const gateway = await executeAiGateway(
      deps.userId,
      {
        capabilityId,
        promptId: capabilityId,
        userInput: [
          request.input.text ?? "",
          request.input.notes ? `\n${request.input.notes}` : "",
        ].join(""),
        outputMode: "structured_json",
        context: {
          productDomain: request.context.productDomain || "platform",
          surface:
            request.context.surface ||
            "admin.translation_studio.professional",
          dataClassification: "internal",
          locale: request.context.locale ?? null,
          allowedCapabilities: [capabilityId],
          allowedToolIds: [],
        },
        preferredProviderHint: request.preferredProviderHint,
        preferredModelHint: request.preferredModelHint,
        _test: deps.forceStub
          ? { forceStub: true, bypassRateLimit: true }
          : undefined,
      },
      { config, capabilityEligible: true, permissions: [] }
    );
    if (!gateway.ok) {
      return asFailure(gateway.code, gateway.message);
    }
    // Preserve FULL structured professional payload — never strip to suggest-only.
    const structured = (gateway.data.structured ?? {}) as Record<
      string,
      unknown
    >;
    return {
      ok: true,
      data: {
        runId: gateway.data.runId,
        capabilityId,
        result: { ...structured },
        retryable: false,
      },
    };
  }

  if (request.capabilityId === "assistant.runtime_turn") {
    const config = loadAiPlatformConfig(
      deps.forceStub
        ? { mode: "stub", allowStub: true }
        : undefined
    );
    const gateway = await executeAiGateway(
      deps.userId,
      {
        capabilityId: "assistant.runtime_turn",
        promptId: "assistant.runtime_turn",
        userInput: request.input.text ?? "",
        outputMode: "structured_json",
        context: {
          productDomain: request.context.productDomain || "platform",
          surface: request.context.surface || "assistant.runtime",
          dataClassification: "confidential",
          allowedCapabilities: ["assistant.runtime_turn"],
          allowedToolIds: [],
          locale: request.context.locale ?? null,
        },
        _test: deps.forceStub
          ? { forceStub: true, bypassRateLimit: true }
          : undefined,
      },
      { config, capabilityEligible: true, permissions: [] }
    );
    if (!gateway.ok) {
      return asFailure(gateway.code, gateway.message);
    }
    const structured = gateway.data.structured ?? {};
    const content =
      typeof structured.content === "string"
        ? structured.content
        : typeof structured.message === "string"
          ? structured.message
          : null;
    if (!content?.trim()) {
      return asFailure(
        "invalid_structured_output",
        "Assistant runtime turn missing content."
      );
    }
    return {
      ok: true,
      data: {
        runId: gateway.data.runId,
        capabilityId: request.capabilityId,
        result: { content: content.trim() },
        retryable: false,
      },
    };
  }

  return asFailure(
    "invalid_input",
    `Unknown capability: ${request.capabilityId}`
  );
}

export const aiService = {
  runCapability,
};
