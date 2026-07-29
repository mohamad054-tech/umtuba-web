import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  answerQuestionLearningTutor,
  explainAgainLearningTutor,
  explainLessonLearningTutor,
  explainWrongAnswerLearningTutor,
  generatePracticeLearningTutor,
  giveHintLearningTutor,
  summarizeLessonLearningTutor,
} from "./learningTutorServerActions";
import type {
  LearningTutorIntegrationCapabilityId,
  LearningTutorIntegrationResult,
} from "../contracts/learningTutorIntegration";
import { LEARNING_TUTOR_ACTION_TO_CAPABILITY } from "../contracts/learningTutorIntegration";

const USER = "11111111-1111-4111-8111-111111111111";
const LESSON = "33333333-3333-4333-8333-333333333333";
const ATTEMPT = "55555555-5555-4555-8555-555555555555";
const QUESTION = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  vi.restoreAllMocks();
});

function okIntegration(
  action: keyof typeof LEARNING_TUTOR_ACTION_TO_CAPABILITY,
  extraResult: Record<string, unknown> = {}
): LearningTutorIntegrationResult {
  const capability: LearningTutorIntegrationCapabilityId =
    LEARNING_TUTOR_ACTION_TO_CAPABILITY[action];
  return {
    ok: true,
    data: {
      runId: "run-1",
      action,
      capability,
      result: {
        labeledAiGenerated: true,
        modelId: "should-not-leak",
        promptVersion: "1.0.0",
        providerId: "stub",
        ...extraResult,
      },
      labeledAiGenerated: true,
      officialCourseContent: false,
      mutatesProgress: false,
      mutatesGrades: false,
      retryable: false,
    },
  };
}

function runtime(opts?: {
  userId?: string | null;
  runIntegration?: ReturnType<typeof vi.fn>;
}) {
  const runIntegration =
    opts?.runIntegration ??
    vi.fn(async (request: { action: string }) =>
      okIntegration(
        request.action as keyof typeof LEARNING_TUTOR_ACTION_TO_CAPABILITY,
        { explanation: "ok" }
      )
    );
  return {
    getUserId: async () =>
      opts?.userId === undefined ? USER : opts.userId,
    getSupabase: async () => ({}) as never,
    forceStub: true,
    runIntegration,
  };
}

describe("Learning Tutor server actions foundation", () => {
  it("rejects unauthenticated callers without calling integration", async () => {
    const runIntegration = vi.fn();
    const result = await explainLessonLearningTutor(
      { lessonId: LESSON },
      runtime({ userId: null, runIntegration })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthenticated");
    expect(result.error.requiresAuth).toBe(true);
    expect(runIntegration).not.toHaveBeenCalled();
  });

  it("rejects unsupported / forbidden input fields", async () => {
    const runIntegration = vi.fn();
    const result = await explainLessonLearningTutor(
      {
        lessonId: LESSON,
        // @ts-expect-error intentional smuggle
        modelId: "gpt-4o",
        capability: "learning.tutor.explain_lesson",
      },
      runtime({ runIntegration })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
    expect(runIntegration).not.toHaveBeenCalled();
  });

  it("routes each named action through learningTutorIntegration with fixed action", async () => {
    const runIntegration = vi.fn(async (request: { action: string }) =>
      okIntegration(
        request.action as keyof typeof LEARNING_TUTOR_ACTION_TO_CAPABILITY,
        { body: "x" }
      )
    );
    const rt = runtime({ runIntegration });

    const results = [
      await explainLessonLearningTutor({ lessonId: LESSON }, rt),
      await summarizeLessonLearningTutor({ lessonId: LESSON }, rt),
      await generatePracticeLearningTutor({ lessonId: LESSON }, rt),
      await answerQuestionLearningTutor(
        { lessonId: LESSON, question: "What is AI?" },
        rt
      ),
      await explainWrongAnswerLearningTutor(
        { attemptId: ATTEMPT, questionId: QUESTION },
        rt
      ),
      await giveHintLearningTutor(
        { lessonId: LESSON, focus: "neural networks" },
        rt
      ),
      await explainAgainLearningTutor(
        { lessonId: LESSON, focus: "still confused" },
        rt
      ),
    ];

    const expected = [
      "explain_lesson",
      "summarize_lesson",
      "generate_practice",
      "answer_question",
      "explain_wrong_answer",
      "give_hint",
      "explain_again",
    ] as const;

    expect(runIntegration).toHaveBeenCalledTimes(7);
    results.forEach((result, index) => {
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.action).toBe(expected[index]);
      expect(runIntegration.mock.calls[index]?.[0]).toMatchObject({
        action: expected[index],
        surface: "learning.tutor.server_action",
      });
      expect(runIntegration.mock.calls[index]?.[0]).not.toHaveProperty(
        "capability"
      );
      expect(runIntegration.mock.calls[index]?.[0]).not.toHaveProperty(
        "capabilityId"
      );
      expect(result.data.result).not.toHaveProperty("modelId");
      expect(result.data.result).not.toHaveProperty("promptVersion");
      expect(result.data.result).not.toHaveProperty("providerId");
      expect(result.data).not.toHaveProperty("capability");
    });
  });

  it("does not expose internal capability mapping on success", async () => {
    const result = await explainLessonLearningTutor(
      { lessonId: LESSON },
      runtime()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result)).not.toMatch(
      /learning\.tutor\.explain_lesson|modelId|promptVersion|providerId/
    );
  });

  it("propagates integration failures fail-closed with safe errors", async () => {
    const runIntegration = vi.fn(
      async (): Promise<LearningTutorIntegrationResult> => ({
        ok: false,
        error: {
          runId: "run-err",
          code: "permission_denied",
          message: "You are not allowed to use this Learning Tutor action.",
          retryable: false,
        },
      })
    );
    const result = await explainWrongAnswerLearningTutor(
      { attemptId: ATTEMPT, questionId: QUESTION },
      runtime({ runIntegration })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("permission_denied");
    expect(result.error.message).not.toMatch(/stack|at Object|Error:/i);
  });

  it("never imports or calls the shared multi-domain service from the server-action core", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/services/learningTutorServerActions.ts"),
      "utf8"
    );
    expect(src).toMatch(/runLearningTutorIntegration/);
    const imports = src
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("import "));
    expect(imports.join("\n")).not.toMatch(
      /aiService|executeAiGateway|tutorRunner|providers\/|prompts\//
    );
    expect(src).not.toMatch(/NEXT_PUBLIC_/);
  });

  it("app server actions file uses named exports and integration core only", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/learningTutor.ts"),
      "utf8"
    );
    expect(src).toMatch(/^["']use server["']/m);
    expect(src).toMatch(/explainLessonLearningTutorAction/);
    expect(src).toMatch(/summarizeLessonLearningTutorAction/);
    expect(src).toMatch(/answerQuestionLearningTutorAction/);
    expect(src).toMatch(/generatePracticeLearningTutorAction/);
    expect(src).toMatch(/explainWrongAnswerLearningTutorAction/);
    expect(src).toMatch(/giveHintLearningTutorAction/);
    expect(src).toMatch(/explainAgainLearningTutorAction/);
    expect(src).toMatch(/learningTutorServerActions/);
    const imports = src
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("import "));
    expect(imports.join("\n")).not.toMatch(
      /aiService|executeAiGateway|runCapability|providers\/|prompts\/|gateway\//
    );
    expect(src).not.toMatch(/capabilityId|preferredModelHint|forceStub/);
    expect(src).not.toMatch(/action:\s*string|capability:\s*string/);
  });
});
