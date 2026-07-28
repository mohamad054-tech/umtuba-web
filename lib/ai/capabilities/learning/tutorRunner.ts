/**
 * Learning AI Tutor capabilities — server-side only, Shared AI Core execution.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { executeAiGateway } from "../../gateway/execute";
import { createAiSession } from "../../sessions/session";
import type { AiResult } from "../../contracts/types";
import { registerPrompts } from "../../prompts/registry";
import {
  buildGroundingPack,
  resolveLearningTutorContext,
} from "./contextAdapter";
import { installLearningTutorTools } from "./tools";
import { assertLearningTutorSafety } from "./safety";
import { LEARNING_TUTOR_PROMPTS } from "./prompts";

let promptsRegistered = false;

function ensureLearningPromptsRegistered(): void {
  if (promptsRegistered) return;
  registerPrompts(LEARNING_TUTOR_PROMPTS);
  promptsRegistered = true;
}

export const LEARNING_TUTOR_CAPABILITIES = [
  "learning.tutor.explain_lesson",
  "learning.tutor.summarize_lesson",
  "learning.tutor.answer_question",
  "learning.tutor.generate_practice",
] as const;

export type LearningTutorCapabilityId =
  (typeof LEARNING_TUTOR_CAPABILITIES)[number];

export type LearningTutorRunInput = {
  supabase: SupabaseClient;
  userId: string;
  lessonId: string;
  capabilityId: LearningTutorCapabilityId;
  question?: string;
  locale?: string | null;
  forceStub?: boolean;
};

export type LearningTutorRunOutput = {
  runId: string;
  promptVersion: string;
  modelId: string;
  capabilityId: string;
  result: Record<string, unknown>;
  groundingStatus: string;
  sourceReferences: Array<{ type: string; id: string; label: string }>;
  labeledAiGenerated: true;
  mutatesProgress: false;
  mutatesGrades: false;
  officialCourseContent: false;
};

function isLearningCapability(
  value: string
): value is LearningTutorCapabilityId {
  return (LEARNING_TUTOR_CAPABILITIES as readonly string[]).includes(value);
}

export async function runLearningTutorCapability(
  input: LearningTutorRunInput
): Promise<AiResult<LearningTutorRunOutput>> {
  if (!isLearningCapability(input.capabilityId)) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Unsupported Learning tutor capability.",
    };
  }

  // Deferred: no learner-safe wrong-answer contract yet.
  if (
    (input.capabilityId as string) === "learning.tutor.explain_wrong_answer"
  ) {
    return {
      ok: false,
      code: "invalid_input",
      message:
        "explain_wrong_answer is not available until a learner-safe wrong-answer contract exists.",
    };
  }

  ensureLearningPromptsRegistered();
  installLearningTutorTools(input.supabase);

  const ctx = await resolveLearningTutorContext({
    supabase: input.supabase,
    userId: input.userId,
    lessonId: input.lessonId,
    locale: input.locale,
  });
  if (!ctx.ok) return ctx;

  const { pack, sourceReferences } = buildGroundingPack(ctx.data);
  const learnerQuestion =
    input.question?.trim() ||
    (input.capabilityId === "learning.tutor.answer_question"
      ? ""
      : "Please help me with this lesson.");

  if (
    input.capabilityId === "learning.tutor.answer_question" &&
    !learnerQuestion
  ) {
    return {
      ok: false,
      code: "invalid_input",
      message: "A learner question is required.",
    };
  }

  assertLearningTutorSafety({
    capabilityId: input.capabilityId,
    userInput: learnerQuestion || "lesson",
    structured: null,
  });

  const session = createAiSession({
    userId: input.userId,
    productDomain: "learning",
    workspaceId: ctx.data.courseId,
    locale: input.locale ?? null,
  });

  const userInput = [
    `Capability: ${input.capabilityId}`,
    `Locale: ${input.locale ?? "inherit"}`,
    "Authorized published lesson material:",
    pack,
    learnerQuestion ? `Learner request: ${learnerQuestion}` : "",
    "Respond with structured JSON only. Cite sourceReferences using lesson/block ids from the material.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const gateway = await executeAiGateway(
    input.userId,
    {
      capabilityId: input.capabilityId,
      promptId: input.capabilityId,
      userInput,
      outputMode: "structured_json",
      allowedToolIds: [
        "learning.read_lesson_outline",
        "learning.read_published_lesson_blocks",
        "learning.read_enrollment_state",
      ],
      sessionId: session.id,
      context: {
        productDomain: "learning",
        surface: "learning.tutor.backend",
        dataClassification: "confidential",
        courseId: ctx.data.courseId,
        workspaceId: ctx.data.courseId,
        locale: input.locale ?? null,
        allowedCapabilities: [input.capabilityId],
        allowedToolIds: [
          "learning.read_lesson_outline",
          "learning.read_published_lesson_blocks",
          "learning.read_enrollment_state",
        ],
        resourceRefs: [
          { type: "course", id: ctx.data.courseId },
          { type: "lesson", id: ctx.data.lessonId },
        ],
      },
      _test: input.forceStub
        ? { forceStub: true, bypassRateLimit: true }
        : undefined,
    },
    {
      supabase: input.supabase,
      permissions: ["learning.lesson.read", "learning.enrollment.read"],
      capabilityEligible: true,
    }
  );

  if (!gateway.ok) return gateway;

  const structured = gateway.data.structured ?? {};
  assertLearningTutorSafety({
    capabilityId: input.capabilityId,
    userInput: learnerQuestion || "lesson",
    structured,
  });

  const groundingStatus = String(
    structured.groundingStatus ?? "partial"
  );
  const refs = Array.isArray(structured.sourceReferences)
    ? (structured.sourceReferences as Array<{
        type?: string;
        id?: string;
        label?: string;
      }>)
        .filter((r) => r && r.id)
        .map((r) => ({
          type: String(r.type ?? "lesson_block"),
          id: String(r.id),
          label: String(r.label ?? r.id),
        }))
    : sourceReferences;

  return {
    ok: true,
    data: {
      runId: gateway.data.runId,
      promptVersion: gateway.data.promptVersion,
      modelId: gateway.data.modelId,
      capabilityId: input.capabilityId,
      result: structured,
      groundingStatus,
      sourceReferences: refs,
      labeledAiGenerated: true,
      mutatesProgress: false,
      mutatesGrades: false,
      officialCourseContent: false,
    },
  };
}
