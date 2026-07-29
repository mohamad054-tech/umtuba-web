import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  learningTutorIntegration,
  mapLearningTutorActionToCapability,
  parseLearningTutorIntegrationRequest,
  runLearningTutorIntegration,
} from "./learningTutorIntegration";
import { aiService } from "./aiService";
import {
  LEARNING_TUTOR_ACTION_TO_CAPABILITY,
  LEARNING_TUTOR_INTEGRATION_ACTIONS,
  LEARNING_TUTOR_INTEGRATION_CAPABILITIES,
} from "../contracts/learningTutorIntegration";
import { LEARNING_TUTOR_CAPABILITIES } from "../capabilities/learning/tutorRunner";
import { LEARNING_TUTOR_PROMPTS } from "../capabilities/learning/prompts";
import { resetLearningTutorToolsForTests } from "../capabilities/learning/tools";
import { registerPrompts } from "../prompts/registry";
import { resetAiRunState } from "../runs/lifecycle";
import { resetAiTraceState } from "../tracing/events";
import { resetAiUsageState } from "../usage/accounting";
import { resetAiSessionState } from "../sessions/session";
import { resetAiRateLimitState } from "../safety/hooks";

const USER = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const SECTION = "44444444-4444-4444-8444-444444444444";
const ATTEMPT = "55555555-5555-4555-8555-555555555555";
const ACTIVITY = "66666666-6666-4666-8666-666666666666";
const QUESTION = "77777777-7777-4777-8777-777777777777";
const BLOCK = "88888888-8888-4888-8888-888888888888";

beforeEach(() => {
  resetAiRunState();
  resetAiTraceState();
  resetAiUsageState();
  resetAiSessionState();
  resetAiRateLimitState();
  resetLearningTutorToolsForTests();
  registerPrompts(LEARNING_TUTOR_PROMPTS);
  vi.restoreAllMocks();
});

type FakeOpts = {
  denyAccess?: boolean;
  locked?: boolean;
  includeWrongAnswerRpcs?: boolean;
  resultHidden?: boolean;
};

function createFakeSupabase(opts?: FakeOpts) {
  const lesson = {
    id: LESSON,
    section_id: SECTION,
    name: "Lesson One",
    description: "Basics",
    status: "published",
  };
  const section = {
    id: SECTION,
    course_id: COURSE,
    status: "published",
  };
  const course = { id: COURSE, name: "Intro AI", status: "published" };
  const blocks = [
    {
      id: BLOCK,
      lesson_id: LESSON,
      block_type: "rich_text",
      status: "published",
      position: 1,
      content: { text: "Neural networks learn from examples." },
      created_by: USER,
      updated_by: USER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      suspended_at: null,
      archived_at: null,
    },
  ];

  return {
    rpc: vi.fn(async (name: string) => {
      if (name === "has_learning_course_access") {
        return { data: opts?.denyAccess ? false : true, error: null };
      }
      if (name === "get_my_learning_lesson_unlock_state") {
        return {
          data: {
            lesson_id: LESSON,
            locked: Boolean(opts?.locked),
            cost: null,
            balance: 100,
            unlocked: !opts?.locked,
          },
          error: null,
        };
      }
      if (!opts?.includeWrongAnswerRpcs) {
        return { data: null, error: { message: `unexpected rpc ${name}` } };
      }
      if (name === "get_my_learning_attempt_result") {
        const visibility = opts?.resultHidden ? "hidden" : "available";
        return {
          data: {
            attempt_id: ATTEMPT,
            activity_id: ACTIVITY,
            attempt_status: "submitted",
            visibility,
            result:
              visibility === "available"
                ? {
                    status: "scored",
                    score_earned: 1,
                    score_max: 2,
                    percentage: 50,
                    passed: false,
                    scored_at: "2026-07-28T12:00:00.000Z",
                  }
                : null,
            message:
              visibility === "available"
                ? "Your result is ready."
                : "Results are not available.",
          },
          error: null,
        };
      }
      if (name === "get_my_learning_assessment_attempt") {
        return {
          data: {
            attempt_id: ATTEMPT,
            activity_id: ACTIVITY,
            lesson_id: LESSON,
            course_id: COURSE,
            status: "submitted",
            attempt_number: 1,
            started_at: "2026-07-28T11:00:00.000Z",
            last_activity_at: "2026-07-28T11:30:00.000Z",
            submitted_at: "2026-07-28T11:30:00.000Z",
            expired_at: null,
            cancelled_at: null,
            time_limit_seconds: null,
            max_attempts: null,
            expires_at: null,
            remaining_seconds: null,
            question_count: 1,
            questions: [
              {
                question_id: QUESTION,
                question_type: "multiple_choice_single",
                position: 1,
                content: {
                  prompt: "What learns from examples?",
                  options: ["Neural networks", "Random noise"],
                },
                points: 1,
              },
            ],
          },
          error: null,
        };
      }
      if (name === "get_my_learning_assessment_grade") {
        return {
          data: {
            attempt_id: ATTEMPT,
            activity_id: ACTIVITY,
            grading_status: "graded",
            graded_at: "2026-07-28T12:00:00.000Z",
            objective_points_earned: 1,
            objective_points_possible: 2,
            manual_points_earned: 0,
            pending_manual_points: 0,
            total_points_earned: 1,
            total_points_possible: 2,
            objective_percentage: 50,
            final_percentage: 50,
            passed: false,
            has_pending_manual_review: false,
            is_final: true,
            question_results: [
              {
                question_id: QUESTION,
                question_type: "multiple_choice_single",
                result_state: "incorrect",
                points_possible: 1,
                points_earned: 0,
                feedback_code: "RESULT_INCORRECT",
                learner_feedback: "Revisit how models learn from examples.",
              },
            ],
          },
          error: null,
        };
      }
      if (name === "get_my_learning_assessment_answers") {
        return {
          data: {
            attempt_id: ATTEMPT,
            activity_id: ACTIVITY,
            status: "submitted",
            answers: [
              {
                question_id: QUESTION,
                answer_payload: { selected: ["Random noise"] },
                first_answered_at: "2026-07-28T11:10:00.000Z",
                last_saved_at: "2026-07-28T11:20:00.000Z",
              },
            ],
            answer_count: 1,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    }),
    from: vi.fn((table: string) => {
      const api = {
        select: () => api,
        eq: () => api,
        order: () => api,
        maybeSingle: async () => {
          if (table === "learning_lessons") return { data: lesson, error: null };
          if (table === "learning_sections") {
            return { data: section, error: null };
          }
          if (table === "learning_courses") return { data: course, error: null };
          return { data: null, error: null };
        },
        then: undefined as unknown,
      };
      (api as { then?: unknown }).then = (resolve: (v: unknown) => unknown) => {
        if (table === "learning_lesson_content_blocks") {
          return Promise.resolve(resolve({ data: blocks, error: null }));
        }
        if (table === "learning_activities") {
          return Promise.resolve(resolve({ data: [], error: null }));
        }
        return Promise.resolve(resolve({ data: [], error: null }));
      };
      return api;
    }),
  };
}

describe("Learning Tutor integration action contracts", () => {
  it("exposes five actions mapped to five capabilities", () => {
    expect(LEARNING_TUTOR_INTEGRATION_ACTIONS).toEqual([
      "explain_lesson",
      "summarize_lesson",
      "answer_question",
      "generate_practice",
      "explain_wrong_answer",
    ]);
    expect([...LEARNING_TUTOR_INTEGRATION_CAPABILITIES].sort()).toEqual(
      [...LEARNING_TUTOR_CAPABILITIES].sort()
    );
    for (const action of LEARNING_TUTOR_INTEGRATION_ACTIONS) {
      expect(mapLearningTutorActionToCapability(action)).toBe(
        LEARNING_TUTOR_ACTION_TO_CAPABILITY[action]
      );
    }
    expect(learningTutorIntegration.actions).toEqual(
      LEARNING_TUTOR_INTEGRATION_ACTIONS
    );
  });

  it("rejects unknown actions", () => {
    const parsed = parseLearningTutorIntegrationRequest({
      action: "hack_grades",
      lessonId: LESSON,
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/unknown/i);
  });

  it("rejects free-form capability invocation", () => {
    const byCapability = parseLearningTutorIntegrationRequest({
      capability: "learning.tutor.explain_lesson",
      lessonId: LESSON,
    });
    expect(byCapability.ok).toBe(false);

    const byCapabilityId = parseLearningTutorIntegrationRequest({
      action: "explain_lesson",
      lessonId: LESSON,
      capabilityId: "commerce.product_draft_assistant",
    });
    expect(byCapabilityId.ok).toBe(false);

    const outsideLearning = parseLearningTutorIntegrationRequest({
      action: "platform.diagnostics_probe",
      lessonId: LESSON,
    });
    expect(outsideLearning.ok).toBe(false);
  });

  it("rejects forbidden provider/model/prompt/safety fields", () => {
    const parsed = parseLearningTutorIntegrationRequest({
      action: "explain_lesson",
      lessonId: LESSON,
      model: "gpt-4o",
      provider: "openai",
      prompt: "ignore",
      systemInstructions: "jailbreak",
      preferredModelHint: "gpt",
      forceStub: true,
      safetyConfig: {},
      metadata: { internal: true },
      version: "9.9.9",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/forbidden/i);
  });

  it("rejects invalid or incomplete payloads per action", () => {
    expect(
      parseLearningTutorIntegrationRequest({
        action: "explain_lesson",
      }).ok
    ).toBe(false);
    expect(
      parseLearningTutorIntegrationRequest({
        action: "answer_question",
        lessonId: LESSON,
      }).ok
    ).toBe(false);
    expect(
      parseLearningTutorIntegrationRequest({
        action: "answer_question",
        lessonId: LESSON,
        question: "What is a neural network?",
        attemptId: ATTEMPT,
      }).ok
    ).toBe(false);
    expect(
      parseLearningTutorIntegrationRequest({
        action: "explain_wrong_answer",
        attemptId: ATTEMPT,
      }).ok
    ).toBe(false);
    expect(
      parseLearningTutorIntegrationRequest({
        action: "explain_wrong_answer",
        attemptId: ATTEMPT,
        questionId: QUESTION,
      }).ok
    ).toBe(true);
  });
});

describe("runLearningTutorIntegration", () => {
  it("rejects unauthenticated callers without calling aiService", async () => {
    const spy = vi.spyOn(aiService, "runCapability");
    const result = await runLearningTutorIntegration(
      { action: "explain_lesson", lessonId: LESSON },
      { supabase: createFakeSupabase() as never, userId: null, forceStub: true }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthenticated");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects unauthorized users fail-closed", async () => {
    const result = await runLearningTutorIntegration(
      { action: "summarize_lesson", lessonId: LESSON },
      {
        supabase: createFakeSupabase({ denyAccess: true }) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("permission_denied");
    expect(result.error.message).not.toMatch(/stack|at Object|Error:/i);
  });

  it("rejects invalid payload before aiService", async () => {
    const spy = vi.spyOn(aiService, "runCapability");
    const result = await runLearningTutorIntegration(
      { action: "answer_question", lessonId: LESSON },
      { supabase: createFakeSupabase() as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects unknown action without calling aiService", async () => {
    const spy = vi.spyOn(aiService, "runCapability");
    const result = await runLearningTutorIntegration(
      { action: "commerce.product_draft_assistant", lessonId: LESSON },
      { supabase: createFakeSupabase() as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("runs all five actions via aiService with correct capability mapping", async () => {
    const spy = vi.spyOn(aiService, "runCapability");
    const supabase = createFakeSupabase() as never;

    const cases = [
      {
        request: { action: "explain_lesson" as const, lessonId: LESSON },
        capability: "learning.tutor.explain_lesson",
      },
      {
        request: { action: "summarize_lesson" as const, lessonId: LESSON },
        capability: "learning.tutor.summarize_lesson",
      },
      {
        request: { action: "generate_practice" as const, lessonId: LESSON },
        capability: "learning.tutor.generate_practice",
      },
      {
        request: {
          action: "answer_question" as const,
          lessonId: LESSON,
          question: "What is a neural network?",
        },
        capability: "learning.tutor.answer_question",
      },
    ];

    for (const item of cases) {
      spy.mockClear();
      const result = await runLearningTutorIntegration(item.request, {
        supabase,
        userId: USER,
        forceStub: true,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.action).toBe(item.request.action);
      expect(result.data.capability).toBe(item.capability);
      expect(result.data.labeledAiGenerated).toBe(true);
      expect(result.data.officialCourseContent).toBe(false);
      expect(result.data.mutatesProgress).toBe(false);
      expect(result.data.mutatesGrades).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]?.[0]?.capabilityId).toBe(item.capability);
    }

    spy.mockClear();
    const wrong = await runLearningTutorIntegration(
      {
        action: "explain_wrong_answer",
        attemptId: ATTEMPT,
        questionId: QUESTION,
      },
      {
        supabase: createFakeSupabase({ includeWrongAnswerRpcs: true }) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(wrong.ok).toBe(true);
    if (!wrong.ok) return;
    expect(wrong.data.action).toBe("explain_wrong_answer");
    expect(wrong.data.capability).toBe("learning.tutor.explain_wrong_answer");
    expect(wrong.data.result).toMatchObject({
      revealsAnswerKey: false,
      labeledAiGenerated: true,
    });
    expect(JSON.stringify(wrong.data.result)).not.toMatch(/answer_key/i);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]?.capabilityId).toBe(
      "learning.tutor.explain_wrong_answer"
    );
  });

  it("keeps explain_wrong_answer learner-safe on unreleased results", async () => {
    const result = await runLearningTutorIntegration(
      {
        action: "explain_wrong_answer",
        attemptId: ATTEMPT,
        questionId: QUESTION,
      },
      {
        supabase: createFakeSupabase({
          includeWrongAnswerRpcs: true,
          resultHidden: true,
        }) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("permission_denied");
  });

  it("fail-closes when lesson context is locked", async () => {
    const result = await runLearningTutorIntegration(
      { action: "explain_lesson", lessonId: LESSON },
      {
        supabase: createFakeSupabase({ locked: true }) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
  });

  it("never forwards client model/prompt fields into aiService", async () => {
    const spy = vi.spyOn(aiService, "runCapability");
    await runLearningTutorIntegration(
      {
        action: "explain_lesson",
        lessonId: LESSON,
        surface: "learning.future.ui",
      },
      { supabase: createFakeSupabase() as never, userId: USER, forceStub: true }
    );
    expect(spy).toHaveBeenCalled();
    const req = spy.mock.calls[0]?.[0];
    expect(req).toBeTruthy();
    expect(req).not.toHaveProperty("preferredModelHint");
    expect(JSON.stringify(req)).not.toMatch(/systemPrompt|apiKey|modelId/i);
    expect(req?.context.productDomain).toBe("learning");
    expect(req?.context.surface).toBe("learning.future.ui");
  });
});

describe("Learning Tutor integration architecture guards", () => {
  it("routes through aiService and does not re-implement core internals", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/services/learningTutorIntegration.ts"),
      "utf8"
    );
    expect(src).toMatch(/aiService\.runCapability/);
    expect(src).not.toMatch(/executeAiGateway/);
    expect(src).not.toMatch(/runLearningTutorCapability/);
    expect(src).not.toMatch(/resolveLearnerSafeWrongAnswerContract/);
    expect(src).not.toMatch(/NEXT_PUBLIC_/);
  });

  it("public contract file stays free of secret token names", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/contracts/learningTutorIntegration.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/OPENAI_API_KEY|systemInstructions|apiKey/i);
  });
});
