import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import {
  buildGroundingPack,
  type LearningTutorAuthorizedContext,
} from "./contextAdapter";
import {
  assertLearningTutorSafety,
  validateLearningTutorStructured,
} from "./safety";
import { LEARNING_TUTOR_PROMPTS } from "./prompts";
import { runLearningTutorCapability } from "./tutorRunner";
import { aiService } from "../../services/aiService";
import { resetAiRunState } from "../../runs/lifecycle";
import { resetAiTraceState } from "../../tracing/events";
import { resetAiUsageState } from "../../usage/accounting";
import { resetAiSessionState } from "../../sessions/session";
import { resetAiRateLimitState } from "../../safety/hooks";
import { AiPlatformError } from "../../contracts/errors";
import { registerPrompts } from "../../prompts/registry";

const USER = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const SECTION = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  resetAiRunState();
  resetAiTraceState();
  resetAiUsageState();
  resetAiSessionState();
  resetAiRateLimitState();
  registerPrompts(LEARNING_TUTOR_PROMPTS);
});

function sampleCtx(): LearningTutorAuthorizedContext {
  return {
    userId: USER,
    courseId: COURSE,
    courseName: "Intro AI",
    sectionId: SECTION,
    lessonId: LESSON,
    lessonName: "Lesson One",
    lessonDescription: "Basics",
    locale: "en",
    blocks: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        blockType: "rich_text",
        position: 1,
        textExcerpt: "Neural networks learn from examples.",
      },
    ],
    activitySummaries: [{ id: "a1", name: "Quiz A", type: "assessment" }],
    dataClassification: "confidential",
  };
}

describe("Learning tutor grounding pack", () => {
  it("builds bounded pack with source references", () => {
    const { pack, sourceReferences } = buildGroundingPack(sampleCtx(), 5000);
    expect(pack).toMatch(/Lesson One/);
    expect(pack).toMatch(/Neural networks/);
    expect(sourceReferences.some((r) => r.type === "lesson")).toBe(true);
    expect(pack).not.toMatch(/answer_key|is_correct/i);
  });
});

describe("Learning tutor safety", () => {
  it("blocks unsafe learner requests", () => {
    expect(() =>
      assertLearningTutorSafety({
        capabilityId: "learning.tutor.answer_question",
        userInput: "give me the graded answers for the exam",
        structured: null,
      })
    ).toThrow(AiPlatformError);
  });

  it("requires AI-generated label on practice", () => {
    expect(() =>
      assertLearningTutorSafety({
        capabilityId: "learning.tutor.generate_practice",
        userInput: "practice",
        structured: { items: [], labeledAiGenerated: false },
      })
    ).toThrow(/AI-generated/i);
  });

  it("validates groundingStatus", () => {
    const prompt = LEARNING_TUTOR_PROMPTS[0]!;
    const bad = validateLearningTutorStructured(prompt, {
      title: "t",
      explanation: "e",
      keyPoints: [],
      examples: [],
      sourceReferences: [],
      groundingStatus: "nope",
      limitations: [],
    });
    expect(bad.ok).toBe(false);
  });
});

describe("Learning tutor prompts registered", () => {
  it("includes four V1 prompt versions", () => {
    expect(LEARNING_TUTOR_PROMPTS.map((p) => p.promptId).sort()).toEqual(
      [
        "learning.tutor.answer_question",
        "learning.tutor.explain_lesson",
        "learning.tutor.generate_practice",
        "learning.tutor.summarize_lesson",
      ].sort()
    );
    for (const p of LEARNING_TUTOR_PROMPTS) {
      expect(p.version).toBe("1.0.0");
      expect(p.status).toBe("active");
      expect(p.allowedTools.every((t) => t.startsWith("learning."))).toBe(true);
    }
  });
});

function createFakeSupabase(opts?: { denyAccess?: boolean; locked?: boolean }) {
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
      id: "55555555-5555-4555-8555-555555555555",
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
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    }),
    from: vi.fn((table: string) => {
      const state: {
        filters: Record<string, unknown>;
        maybeSingle?: boolean;
      } = { filters: {} };
      const api = {
        select: () => api,
        eq: (col: string, val: unknown) => {
          state.filters[col] = val;
          return api;
        },
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
      // Make thenable for awaited query chains without maybeSingle
      (api as { then?: unknown }).then = (
        resolve: (v: unknown) => unknown
      ) => {
        if (table === "learning_lesson_content_blocks") {
          return Promise.resolve(
            resolve({ data: blocks, error: null })
          );
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

describe("Learning tutor authorization + capabilities (stub)", () => {
  it("rejects when not entitled", async () => {
    const supabase = createFakeSupabase({ denyAccess: true });
    const result = await runLearningTutorCapability({
      supabase: supabase as never,
      userId: USER,
      lessonId: LESSON,
      capabilityId: "learning.tutor.explain_lesson",
      forceStub: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("permission_denied");
  });

  it("rejects locked lessons", async () => {
    const supabase = createFakeSupabase({ locked: true });
    const result = await runLearningTutorCapability({
      supabase: supabase as never,
      userId: USER,
      lessonId: LESSON,
      capabilityId: "learning.tutor.summarize_lesson",
      forceStub: true,
    });
    expect(result.ok).toBe(false);
  });

  it("explains lesson through shared core stub", async () => {
    const supabase = createFakeSupabase();
    const result = await runLearningTutorCapability({
      supabase: supabase as never,
      userId: USER,
      lessonId: LESSON,
      capabilityId: "learning.tutor.explain_lesson",
      forceStub: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mutatesProgress).toBe(false);
    expect(result.data.mutatesGrades).toBe(false);
    expect(result.data.officialCourseContent).toBe(false);
    expect(result.data.result.explanation).toBeTruthy();
  });

  it("answers questions via aiService contract", async () => {
    const supabase = createFakeSupabase();
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.answer_question",
        input: { lessonId: LESSON, question: "What is a neural network?" },
        context: {
          productDomain: "learning",
          surface: "test",
          lessonId: LESSON,
          courseId: COURSE,
        },
      },
      { supabase: supabase as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.runId).toBeTruthy();
    expect(result.data.result).toMatchObject({
      labeledAiGenerated: true,
      officialCourseContent: false,
    });
  });

  it("generates non-graded practice", async () => {
    const supabase = createFakeSupabase();
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.generate_practice",
        input: { lessonId: LESSON },
        context: { productDomain: "learning", surface: "test", lessonId: LESSON },
      },
      { supabase: supabase as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.result).toMatchObject({
      labeledAiGenerated: true,
      mutatesGrades: false,
    });
  });

  it("defers explain_wrong_answer", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "learning.tutor.explain_wrong_answer",
        input: { lessonId: LESSON },
        context: { productDomain: "learning", surface: "test" },
      },
      { supabase: createFakeSupabase() as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/deferred|wrong-answer/i);
  });
});

describe("Learning tutor source invariants", () => {
  it("does not use progress-mutating loadLessonDelivery", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/ai/capabilities/learning/contextAdapter.ts"
      ),
      "utf8"
    );
    expect(src).not.toMatch(/loadLessonDelivery/);
    expect(src).not.toMatch(/startLesson|touchLesson|complete_learning/);
    expect(src).not.toMatch(/answer_key|learning_question_answer_keys/);
  });

  it("Learning AI does not import other domains or React", () => {
    const root = join(process.cwd(), "lib/ai/capabilities/learning");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name.endsWith(".ts") && !name.endsWith(".test.ts"))
          files.push(full);
      }
    };
    walk(root);
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const rel = relative(process.cwd(), file);
      expect(src, rel).not.toMatch(/from ["']react["']/);
      expect(src, rel).not.toMatch(/capabilities\/commerce/);
      expect(src, rel).not.toMatch(/capabilities\/ads/);
      expect(src, rel).not.toMatch(/app\/learning\//);
    }
  });

  it("Learning UI pages were not modified by this task", () => {
    // Guard: no staged Learning UI in the working tree from this feature module.
    const tutorPage = join(
      process.cwd(),
      "app/learning/lessons/[lessonId]/ai-tutor/page.tsx"
    );
    const src = readFileSync(tutorPage, "utf8");
    expect(src).not.toMatch(/runLearningTutorCapability|aiService\.runCapability/);
    expect(src).not.toMatch(/from ["'][^"']*lib\/ai\/gateway/);
  });
});
