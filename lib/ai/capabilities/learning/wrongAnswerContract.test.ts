import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWrongAnswerGroundingPack,
  payloadContainsForbiddenWrongAnswerKeys,
  resolveLearnerSafeWrongAnswerContract,
  type LearnerSafeWrongAnswerContract,
} from "./wrongAnswerContract";
import { aiService } from "../../services/aiService";
import { resetAiRunState } from "../../runs/lifecycle";
import { resetAiTraceState } from "../../tracing/events";
import { resetAiUsageState } from "../../usage/accounting";
import { resetAiSessionState } from "../../sessions/session";
import { resetAiRateLimitState } from "../../safety/hooks";
import { registerPrompts } from "../../prompts/registry";
import { LEARNING_TUTOR_PROMPTS } from "./prompts";
import { resetLearningTutorToolsForTests } from "./tools";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";
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
});

type FakeOpts = {
  denyAccess?: boolean;
  locked?: boolean;
  resultVisibility?: "hidden" | "pending_score" | "available" | "error";
  attemptOwnerDenied?: boolean;
  gradeState?: "incorrect" | "correct" | "missing" | "leaky";
  answerMissing?: boolean;
  answerLeaky?: boolean;
  questionMissing?: boolean;
};

function releasedResult() {
  return {
    status: "scored",
    score_earned: 1,
    score_max: 2,
    percentage: 50,
    passed: false,
    scored_at: "2026-07-28T12:00:00.000Z",
  };
}

function attemptPayload(opts?: FakeOpts) {
  return {
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
    questions: opts?.questionMissing
      ? []
      : [
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
  };
}

function gradePayload(opts?: FakeOpts) {
  if (opts?.gradeState === "missing") {
    return {
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
      question_results: [],
    };
  }
  const result_state =
    opts?.gradeState === "correct" ? "correct" : "incorrect";
  const row: Record<string, unknown> = {
    question_id: QUESTION,
    question_type: "multiple_choice_single",
    result_state,
    points_possible: 1,
    points_earned: result_state === "correct" ? 1 : 0,
    feedback_code:
      result_state === "correct" ? "RESULT_CORRECT" : "RESULT_INCORRECT",
    learner_feedback:
      result_state === "incorrect"
        ? "Revisit how models learn from examples."
        : null,
  };
  if (opts?.gradeState === "leaky") {
    row.answer_key = { correct: "Neural networks" };
  }
  return {
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
    question_results: [row],
  };
}

function answersPayload(opts?: FakeOpts) {
  if (opts?.answerMissing) {
    return {
      attempt_id: ATTEMPT,
      activity_id: ACTIVITY,
      status: "submitted",
      answers: [],
      answer_count: 0,
    };
  }
  const payload: Record<string, unknown> = { selected: ["Random noise"] };
  if (opts?.answerLeaky) {
    payload.answer_key = { correct: "Neural networks" };
  }
  return {
    attempt_id: ATTEMPT,
    activity_id: ACTIVITY,
    status: "submitted",
    answers: [
      {
        question_id: QUESTION,
        answer_payload: payload,
        first_answered_at: "2026-07-28T11:10:00.000Z",
        last_saved_at: "2026-07-28T11:20:00.000Z",
      },
    ],
    answer_count: 1,
  };
}

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
      if (name === "get_my_learning_attempt_result") {
        if (opts?.resultVisibility === "error") {
          return { data: null, error: { message: "Unable to load result." } };
        }
        const visibility = opts?.resultVisibility ?? "available";
        return {
          data: {
            attempt_id: ATTEMPT,
            activity_id: ACTIVITY,
            attempt_status: "submitted",
            visibility,
            result: visibility === "available" ? releasedResult() : null,
            message:
              visibility === "available"
                ? "Your result is ready."
                : "Results are not available.",
          },
          error: null,
        };
      }
      if (name === "get_my_learning_assessment_attempt") {
        if (opts?.attemptOwnerDenied) {
          return {
            data: null,
            error: { message: "You are not allowed to view this attempt." },
          };
        }
        return { data: attemptPayload(opts), error: null };
      }
      if (name === "get_my_learning_assessment_grade") {
        if (opts?.gradeState === "leaky") {
          // Parser rejects leaky payloads → malformed → fail closed.
          return { data: gradePayload(opts), error: null };
        }
        return { data: gradePayload(opts), error: null };
      }
      if (name === "get_my_learning_assessment_answers") {
        return { data: answersPayload(opts), error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    }),
    from: vi.fn((table: string) => {
      const api = {
        select: () => api,
        eq: () => api,
        order: () => api,
        maybeSingle: async () => {
          if (table === "learning_lessons") {
            return { data: lesson, error: null };
          }
          if (table === "learning_sections") {
            return { data: section, error: null };
          }
          if (table === "learning_courses") {
            return { data: course, error: null };
          }
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

describe("learner-safe wrong-answer contract helpers", () => {
  it("detects answer key leakage", () => {
    expect(
      payloadContainsForbiddenWrongAnswerKeys({
        prompt: "ok",
        answer_key: { x: 1 },
      })
    ).toBe(true);
    expect(
      payloadContainsForbiddenWrongAnswerKeys({ prompt: "ok", options: ["a"] })
    ).toBe(false);
  });

  it("builds grounding pack without keys", () => {
    const contract: LearnerSafeWrongAnswerContract = {
      userId: USER,
      attemptId: ATTEMPT,
      activityId: ACTIVITY,
      courseId: COURSE,
      lessonId: LESSON,
      questionId: QUESTION,
      questionType: "multiple_choice_single",
      questionPosition: 1,
      questionContext: { prompt: "What learns from examples?" },
      learnerAnswer: { selected: ["Random noise"] },
      releasedFeedback: {
        resultState: "incorrect",
        feedbackCode: "RESULT_INCORRECT",
        learnerFeedback: "Revisit models.",
        pointsPossible: 1,
        pointsEarned: 0,
      },
      aggregateResult: {
        scoreEarned: 1,
        scoreMax: 2,
        percentage: 50,
        passed: false,
        scoredAt: "2026-07-28T12:00:00.000Z",
      },
      dataClassification: "confidential",
      containsAnswerKey: false,
      containsCorrectAnswer: false,
      mutatesProgress: false,
      mutatesGrades: false,
    };
    const pack = buildWrongAnswerGroundingPack(contract, "Lesson pack");
    expect(pack).toMatch(/What learns from examples/);
    expect(pack).toMatch(/Random noise/);
    expect(pack).not.toMatch(/answer_key/i);
    expect(pack).toMatch(/Do not invent or reveal a stored official solution/);
  });
});

describe("resolveLearnerSafeWrongAnswerContract", () => {
  it("rejects unauthorized course access", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ denyAccess: true }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("permission_denied");
  });

  it("rejects another learner's attempt", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ attemptOwnerDenied: true }) as never,
      userId: OTHER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("permission_denied");
  });

  it("fail-closes on unreleased results", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ resultVisibility: "hidden" }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("permission_denied");
    expect(result.message).toMatch(/not released/i);
  });

  it("fail-closes when safe incorrect result is missing", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ gradeState: "missing" }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_input");
  });

  it("rejects correct (non-wrong) answers", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ gradeState: "correct" }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/incorrect/i);
  });

  it("blocks answer-key leakage from grade payloads", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ gradeState: "leaky" }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
  });

  it("blocks answer-key leakage from answer payloads", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ answerLeaky: true }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
  });

  it("fail-closes when learner answer is missing", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase({ answerMissing: true }) as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_input");
  });

  it("returns a safe complete contract", async () => {
    const result = await resolveLearnerSafeWrongAnswerContract({
      supabase: createFakeSupabase() as never,
      userId: USER,
      attemptId: ATTEMPT,
      questionId: QUESTION,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.containsAnswerKey).toBe(false);
    expect(result.data.containsCorrectAnswer).toBe(false);
    expect(result.data.releasedFeedback.resultState).toBe("incorrect");
    expect(result.data.questionContext.prompt).toMatch(/learns from examples/);
    expect(result.data.learnerAnswer).toEqual({ selected: ["Random noise"] });
    expect(JSON.stringify(result.data)).not.toMatch(/answer_key/i);
  });
});

describe("learning.tutor.explain_wrong_answer via aiService", () => {
  it("rejects unauthenticated callers", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.explain_wrong_answer",
        input: { attemptId: ATTEMPT, questionId: QUESTION },
        context: { productDomain: "learning", surface: "test" },
      },
      { supabase: createFakeSupabase() as never, userId: null, forceStub: true }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthenticated");
  });

  it("rejects unauthorized users", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.explain_wrong_answer",
        input: { attemptId: ATTEMPT, questionId: QUESTION },
        context: { productDomain: "learning", surface: "test" },
      },
      {
        supabase: createFakeSupabase({ denyAccess: true }) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("permission_denied");
  });

  it("rejects another learner's attempt", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.explain_wrong_answer",
        input: { attemptId: ATTEMPT, questionId: QUESTION },
        context: { productDomain: "learning", surface: "test" },
      },
      {
        supabase: createFakeSupabase({ attemptOwnerDenied: true }) as never,
        userId: OTHER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("permission_denied");
  });

  it("does not leak answer keys on success path", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.explain_wrong_answer",
        input: { attemptId: ATTEMPT, questionId: QUESTION },
        context: {
          productDomain: "learning",
          surface: "test",
          lessonId: LESSON,
          courseId: COURSE,
        },
      },
      { supabase: createFakeSupabase() as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.result).toMatchObject({
      labeledAiGenerated: true,
      officialCourseContent: false,
      revealsAnswerKey: false,
      mutatesProgress: false,
      mutatesGrades: false,
    });
    expect(result.data.result.explanation).toBeTruthy();
    expect(JSON.stringify(result.data.result)).not.toMatch(/answer_key/i);
  });

  it("fail-closes when safe contract data is incomplete", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.explain_wrong_answer",
        input: { attemptId: ATTEMPT, questionId: QUESTION },
        context: { productDomain: "learning", surface: "test" },
      },
      {
        supabase: createFakeSupabase({ answerMissing: true }) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
  });
});
