/**
 * Canonical server-side AI service entry.
 * Flow: UI → typed contract → aiService.runCapability → Shared AI Core → provider
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

/**
 * Stable public entry point for all Domain AI capabilities.
 */
export async function runCapability(
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
      question:
        request.input.question ??
        request.input.focus ??
        request.input.text,
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

  return asFailure(
    "invalid_input",
    `Unknown capability: ${request.capabilityId}`
  );
}

export const aiService = {
  runCapability,
};
