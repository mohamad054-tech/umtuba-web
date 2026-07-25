import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isCreatableContentBlockType,
  isReservedOrDeferredContentBlockType,
  isSafeHttpUrl,
  escapeHtmlText,
  asRichTextFormat,
} from "./contentBlockRender";
import {
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
} from "./lessonContentBlocksFoundation";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import {
  LEARNING_LEARNER_DELIVERY_RPCS,
  LEARNING_LEARNER_FORBIDDEN,
  LEARNING_LEARNER_ROUTES,
  LEARNING_LEARNER_SUBMITTED_MESSAGE,
  attemptStatusMessage,
  filterPublishedCreatableBlocks,
  isAttemptInputLocked,
  loadMyLearningHub,
  resolveAdjacentLessonTargets,
  resolveContinueLearningTarget,
  toLearnerActivityHints,
} from "./learnerDelivery";
import type { LearningLessonContentBlock } from "./lessonContentBlocksFoundation";

const ROOT = process.cwd();
const DOC = "docs/learning/implementation/LEARNER_DELIVERY_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Learner Delivery V1 — files & routes", () => {
  it("ships constants module, render helpers, docs, and app routes", () => {
    expect(existsSync(join(ROOT, "lib/learning/learnerDelivery.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/contentBlockRender.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "app/learning/page.tsx"))).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/courses/[courseId]/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/lessons/[lessonId]/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/activities/[activityId]/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/attempts/[attemptId]/page.tsx"))
    ).toBe(true);
  });

  it("documents the approved learner routes", () => {
    expect(LEARNING_LEARNER_ROUTES.hub).toBe("/learning");
    expect(LEARNING_LEARNER_ROUTES.course("c1")).toBe("/learning/courses/c1");
    expect(LEARNING_LEARNER_ROUTES.lesson("l1")).toBe("/learning/lessons/l1");
    expect(LEARNING_LEARNER_ROUTES.activity("a1")).toBe(
      "/learning/activities/a1"
    );
    expect(LEARNING_LEARNER_ROUTES.attempt("t1")).toBe("/learning/attempts/t1");
  });

  it("does not create a migration for this UI slice", () => {
    const sql = readFileSync(
      join(ROOT, "docs/learning/implementation/LEARNER_DELIVERY_V1.md"),
      "utf8"
    );
    expect(sql).toMatch(/No migrations/i);
  });
});

describe("Learner Delivery V1 — security denylist", () => {
  it("forbids scoring RPC and result/key tables", () => {
    expect(LEARNING_LEARNER_FORBIDDEN.scoringRpc).toBe(
      LEARNING_SCORING_RPCS.score
    );
    expect(LEARNING_LEARNER_FORBIDDEN.scoringRpc).toBe(
      "score_learning_attempt"
    );
    expect([...LEARNING_LEARNER_FORBIDDEN.resultTables]).toEqual([
      "learning_attempt_results",
      "learning_attempt_answer_results",
    ]);
    expect([...LEARNING_LEARNER_FORBIDDEN.questionTables]).toEqual([
      "learning_questions",
      "learning_question_answer_keys",
    ]);
    expect(LEARNING_LEARNER_FORBIDDEN.showResultPolicyActivation).toBe(false);
  });

  it("learnerDelivery source never imports scoring result types or score RPC calls", () => {
    const src = read("lib/learning/learnerDelivery.ts");
    // Literal score RPC name must not appear (denylist uses LEARNING_SCORING_RPCS.score).
    expect(src).not.toMatch(/score_learning_attempt/);
    expect(src).not.toMatch(/LearningAttemptResult/);
    expect(src).not.toMatch(/LearningScoreAttemptResponse/);
    expect(src).not.toMatch(/\.rpc\(\s*LEARNING_SCORING_RPCS/);
    expect(src).not.toMatch(/service_role|SERVICE_ROLE|createServiceRole/);
    expect(src).toContain("LEARNING_SCORING_RPCS");
    expect(src).toContain("LEARNING_LEARNER_FORBIDDEN");
  });

  it("app learning surfaces never call score RPC or result tables", () => {
    const files = [
      "app/learning/page.tsx",
      "app/learning/actions.ts",
      "app/learning/courses/[courseId]/page.tsx",
      "app/learning/lessons/[lessonId]/page.tsx",
      "app/learning/activities/[activityId]/page.tsx",
      "app/learning/attempts/[attemptId]/page.tsx",
      "app/components/learning/AttemptPlayer.tsx",
      "app/components/learning/AttemptQuestion.tsx",
      "app/components/learning/AttemptStatusBanner.tsx",
      "app/components/learning/LearnerResultSummary.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(/score_learning_attempt/);
      expect(src).not.toMatch(/\.from\(\s*["']learning_attempt_results["']/);
      expect(src).not.toMatch(/\.from\(\s*["']learning_attempt_answer_results["']/);
      expect(src).not.toMatch(/answer_keys/);
      expect(src).not.toMatch(/is_correct|points_earned/);
      expect(src).not.toMatch(/show_result_policy/);
    }
  });

  it("attempt result UI may show aggregate passed label but never per-question fields", () => {
    const summary = read("app/components/learning/LearnerResultSummary.tsx");
    expect(summary).toMatch(/Passed|Not passed/);
    expect(summary).not.toMatch(/is_correct/);
    expect(summary).not.toMatch(/points_earned/);
    expect(summary).not.toMatch(/answer_key/);
    expect(summary).not.toMatch(/dangerouslySetInnerHTML/);
  });

  it("reuses attempt + progress RPCs only", () => {
    expect(LEARNING_LEARNER_DELIVERY_RPCS.attempts).toEqual(
      LEARNING_ATTEMPT_RPCS
    );
    expect(LEARNING_LEARNER_DELIVERY_RPCS.progress.startLesson).toBe(
      LEARNING_PROGRESS_RPCS.startLesson
    );
    expect(LEARNING_LEARNER_DELIVERY_RPCS.progress.touchLesson).toBe(
      LEARNING_PROGRESS_RPCS.touchLesson
    );
    expect(LEARNING_LEARNER_DELIVERY_RPCS.progress.getCourseProgress).toBe(
      LEARNING_PROGRESS_RPCS.getCourseProgress
    );
  });
});

describe("Learner Delivery V1 — submitted / attempt state", () => {
  it("uses the exact submitted placeholder copy", () => {
    expect(LEARNING_LEARNER_SUBMITTED_MESSAGE).toBe(
      "Submitted — results are not available yet."
    );
    expect(attemptStatusMessage("submitted")).toBe(
      LEARNING_LEARNER_SUBMITTED_MESSAGE
    );
  });

  it("locks inputs for terminal statuses and zero remaining time", () => {
    expect(isAttemptInputLocked("active", 30)).toBe(false);
    expect(isAttemptInputLocked("active", null)).toBe(false);
    expect(isAttemptInputLocked("active", 0)).toBe(true);
    expect(isAttemptInputLocked("submitted", 30)).toBe(true);
    expect(isAttemptInputLocked("expired", null)).toBe(true);
    expect(isAttemptInputLocked("cancelled", null)).toBe(true);
  });

  it("strips scoring settings from learner activity hints", () => {
    const hints = toLearnerActivityHints({
      is_required: false,
      max_attempts: 3,
      time_limit_seconds: 600,
      max_score: 100,
      passing_score: 70,
      show_result_policy: "immediately",
      evaluation_mode: "auto",
      config: { secret: true },
    });
    expect(hints).toEqual({
      is_required: false,
      max_attempts: 3,
      time_limit_seconds: 600,
    });
    expect(hints).not.toHaveProperty("max_score");
    expect(hints).not.toHaveProperty("show_result_policy");
  });
});

describe("Learner Delivery V1 — content blocks", () => {
  it("accepts all 10 creatable types and rejects reserved/deferred", () => {
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES) {
      expect(isCreatableContentBlockType(t)).toBe(true);
      expect(isReservedOrDeferredContentBlockType(t)).toBe(false);
    }
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES) {
      expect(isCreatableContentBlockType(t)).toBe(false);
      expect(isReservedOrDeferredContentBlockType(t)).toBe(true);
    }
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES) {
      expect(isCreatableContentBlockType(t)).toBe(false);
      expect(isReservedOrDeferredContentBlockType(t)).toBe(true);
    }
  });

  it("filters published creatable blocks only", () => {
    const blocks = [
      {
        id: "1",
        lesson_id: "l",
        block_type: "rich_text",
        status: "published",
        position: 2,
        content: {},
        created_by: "u",
        updated_by: null,
        created_at: "",
        updated_at: "",
        published_at: null,
        suspended_at: null,
        archived_at: null,
      },
      {
        id: "2",
        lesson_id: "l",
        block_type: "heading",
        status: "draft",
        position: 1,
        content: {},
        created_by: "u",
        updated_by: null,
        created_at: "",
        updated_at: "",
        published_at: null,
        suspended_at: null,
        archived_at: null,
      },
      {
        id: "3",
        lesson_id: "l",
        block_type: "ai_block",
        status: "published",
        position: 0,
        content: {},
        created_by: "u",
        updated_by: null,
        created_at: "",
        updated_at: "",
        published_at: null,
        suspended_at: null,
        archived_at: null,
      },
    ] as LearningLessonContentBlock[];

    const filtered = filterPublishedCreatableBlocks(blocks);
    expect(filtered.map((b) => b.id)).toEqual(["1"]);
  });

  it("allowlists http(s) URLs only", () => {
    expect(isSafeHttpUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isSafeHttpUrl("http://cdn.example.com/a.png")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html;base64,aaaa")).toBe(false);
    expect(isSafeHttpUrl("/relative/path")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });

  it("escapes HTML and keeps markdown as plain/escaped text", () => {
    expect(escapeHtmlText('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(asRichTextFormat("markdown")).toBe("markdown");
    expect(asRichTextFormat("html")).toBe("plain");
  });
});

describe("Learner Delivery V1 — docs contract", () => {
  it("documents out-of-scope and submitted message", () => {
    const doc = read(DOC);
    expect(doc).toContain(LEARNING_LEARNER_SUBMITTED_MESSAGE);
    expect(doc).toMatch(/show_result_policy/);
    expect(doc).toMatch(/No migrations/);
    expect(doc).toMatch(/service role/i);
    expect(doc).toMatch(/answer keys/i);
  });
});

describe("Learner Experience V1 — continue target resolution", () => {
  it("prefers last_lesson_id over first_lesson_id", () => {
    const target = resolveContinueLearningTarget({
      last_lesson_id: "lesson-last",
      first_lesson_id: "lesson-first",
    });
    expect(target).toEqual({
      lesson_id: "lesson-last",
      href: LEARNING_LEARNER_ROUTES.lesson("lesson-last"),
    });
  });

  it("falls back to first available lesson when last_lesson_id is missing", () => {
    expect(
      resolveContinueLearningTarget({
        last_lesson_id: null,
        first_lesson_id: "lesson-first",
      })
    ).toEqual({
      lesson_id: "lesson-first",
      href: LEARNING_LEARNER_ROUTES.lesson("lesson-first"),
    });
    expect(
      resolveContinueLearningTarget({
        last_lesson_id: "",
        first_lesson_id: "lesson-first",
      })
    ).toEqual({
      lesson_id: "lesson-first",
      href: LEARNING_LEARNER_ROUTES.lesson("lesson-first"),
    });
  });

  it("fails closed when no lesson target exists", () => {
    expect(
      resolveContinueLearningTarget({
        last_lesson_id: null,
        first_lesson_id: null,
      })
    ).toBeNull();
    expect(
      resolveContinueLearningTarget({
        last_lesson_id: undefined,
        first_lesson_id: "",
      })
    ).toBeNull();
  });
});

describe("Learner Experience V1 — hub progress enrichment", () => {
  const USER_ID = "11111111-1111-4111-8111-111111111111";
  const COURSE_ID = "22222222-2222-4222-8222-222222222222";
  const PROGRAM_ID = "33333333-3333-4333-8333-333333333333";
  const SECTION_ID = "44444444-4444-4444-8444-444444444444";
  const FIRST_LESSON_ID = "55555555-5555-4555-8555-555555555555";
  const LAST_LESSON_ID = "66666666-6666-4666-8666-666666666666";
  const ENROLLMENT_ID = "77777777-7777-4777-8777-777777777777";

  function chainResult(data: unknown, error: unknown = null) {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.select = self;
    builder.eq = self;
    builder.in = self;
    builder.order = self;
    builder.maybeSingle = async () => ({ data, error });
    builder.then = (
      resolve: (value: { data: unknown; error: unknown }) => unknown
    ) => Promise.resolve({ data, error }).then(resolve);
    return builder;
  }

  it("attaches get_learning_course_progress and continue_href per course", async () => {
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> =
      [];

    const fake = {
      from: (table: string) => {
        if (table === "learning_enrollments") {
          return chainResult([
            {
              id: ENROLLMENT_ID,
              target_type: "course",
              program_id: null,
              course_id: COURSE_ID,
              status: "active",
              starts_at: null,
              expires_at: null,
            },
          ]);
        }
        if (table === "learning_courses") {
          return chainResult([
            {
              id: COURSE_ID,
              name: "Hub Course",
              slug: "hub-course",
              description: "desc",
              program_id: PROGRAM_ID,
              status: "published",
            },
          ]);
        }
        if (table === "learning_programs") {
          return chainResult([{ id: PROGRAM_ID, name: "Hub Program" }]);
        }
        if (table === "learning_sections") {
          return chainResult([
            {
              id: SECTION_ID,
              course_id: COURSE_ID,
              position: 1,
              status: "published",
            },
          ]);
        }
        if (table === "learning_lessons") {
          return chainResult([
            {
              id: FIRST_LESSON_ID,
              section_id: SECTION_ID,
              position: 1,
              status: "published",
            },
          ]);
        }
        return chainResult([]);
      },
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        expect(name).toBe(LEARNING_PROGRESS_RPCS.getCourseProgress);
        expect(args).toEqual({ p_course_id: COURSE_ID });
        return {
          data: {
            status: "in_progress",
            completed_lessons_count: 1,
            total_lessons_count: 4,
            percent_complete: 25,
            last_lesson_id: LAST_LESSON_ID,
          },
          error: null,
        };
      },
    };

    const hub = await loadMyLearningHub(fake as never, USER_ID);
    expect(hub.ok).toBe(true);
    if (!hub.ok) return;

    expect(hub.data.courses).toHaveLength(1);
    const course = hub.data.courses[0];
    expect(course.progress).toEqual({
      status: "in_progress",
      completed_lessons_count: 1,
      total_lessons_count: 4,
      percent_complete: 25,
      last_lesson_id: LAST_LESSON_ID,
    });
    expect(course.continue_href).toBe(
      LEARNING_LEARNER_ROUTES.lesson(LAST_LESSON_ID)
    );
    expect(rpcCalls).toEqual([
      {
        name: "get_learning_course_progress",
        args: { p_course_id: COURSE_ID },
      },
    ]);
  });

  it("falls back continue_href to first published lesson when last_lesson_id is null", async () => {
    const fake = {
      from: (table: string) => {
        if (table === "learning_enrollments") {
          return chainResult([
            {
              id: ENROLLMENT_ID,
              target_type: "course",
              program_id: null,
              course_id: COURSE_ID,
              status: "active",
              starts_at: null,
              expires_at: null,
            },
          ]);
        }
        if (table === "learning_courses") {
          return chainResult([
            {
              id: COURSE_ID,
              name: "Hub Course",
              slug: "hub-course",
              description: null,
              program_id: PROGRAM_ID,
              status: "published",
            },
          ]);
        }
        if (table === "learning_programs") {
          return chainResult([{ id: PROGRAM_ID, name: "Hub Program" }]);
        }
        if (table === "learning_sections") {
          return chainResult([
            {
              id: SECTION_ID,
              course_id: COURSE_ID,
              position: 1,
              status: "published",
            },
          ]);
        }
        if (table === "learning_lessons") {
          return chainResult([
            {
              id: FIRST_LESSON_ID,
              section_id: SECTION_ID,
              position: 1,
              status: "published",
            },
          ]);
        }
        return chainResult([]);
      },
      rpc: async () => ({
        data: {
          status: "not_started",
          completed_lessons_count: 0,
          total_lessons_count: 2,
          percent_complete: 0,
          last_lesson_id: null,
        },
        error: null,
      }),
    };

    const hub = await loadMyLearningHub(fake as never, USER_ID);
    expect(hub.ok).toBe(true);
    if (!hub.ok) return;
    expect(hub.data.courses[0].continue_href).toBe(
      LEARNING_LEARNER_ROUTES.lesson(FIRST_LESSON_ID)
    );
  });

  it("LearningHub surfaces continue card, percent, and resume", () => {
    const hubUi = read("app/components/learning/LearningHub.tsx");
    expect(hubUi).toMatch(/Continue Learning/);
    expect(hubUi).toMatch(/percent_complete/);
    expect(hubUi).toMatch(/Resume/);
    expect(hubUi).toMatch(/continue_href/);
  });
});

describe("Learner Experience V1 — adjacent lesson navigation", () => {
  const ORDERED = ["lesson-a", "lesson-b", "lesson-c"] as const;

  it("resolves previous and next for a middle lesson", () => {
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "lesson-b",
        ordered_lesson_ids: ORDERED,
      })
    ).toEqual({
      previous: {
        lesson_id: "lesson-a",
        href: LEARNING_LEARNER_ROUTES.lesson("lesson-a"),
      },
      next: {
        lesson_id: "lesson-c",
        href: LEARNING_LEARNER_ROUTES.lesson("lesson-c"),
      },
    });
  });

  it("first lesson has null previous and a next target", () => {
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "lesson-a",
        ordered_lesson_ids: ORDERED,
      })
    ).toEqual({
      previous: null,
      next: {
        lesson_id: "lesson-b",
        href: LEARNING_LEARNER_ROUTES.lesson("lesson-b"),
      },
    });
  });

  it("last lesson has a previous target and null next", () => {
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "lesson-c",
        ordered_lesson_ids: ORDERED,
      })
    ).toEqual({
      previous: {
        lesson_id: "lesson-b",
        href: LEARNING_LEARNER_ROUTES.lesson("lesson-b"),
      },
      next: null,
    });
  });

  it("single lesson has null previous and null next", () => {
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "only-lesson",
        ordered_lesson_ids: ["only-lesson"],
      })
    ).toEqual({ previous: null, next: null });
  });

  it("cross-section ordering uses flattened section then lesson order", () => {
    // Section 1: s1-l1, s1-l2 · Section 2: s2-l1
    const crossSectionOrdered = ["s1-l1", "s1-l2", "s2-l1"];
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "s1-l2",
        ordered_lesson_ids: crossSectionOrdered,
      })
    ).toEqual({
      previous: {
        lesson_id: "s1-l1",
        href: LEARNING_LEARNER_ROUTES.lesson("s1-l1"),
      },
      next: {
        lesson_id: "s2-l1",
        href: LEARNING_LEARNER_ROUTES.lesson("s2-l1"),
      },
    });
  });

  it("unknown lesson fails closed with both neighbors null", () => {
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "missing",
        ordered_lesson_ids: ORDERED,
      })
    ).toEqual({ previous: null, next: null });
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "",
        ordered_lesson_ids: ORDERED,
      })
    ).toEqual({ previous: null, next: null });
    expect(
      resolveAdjacentLessonTargets({
        current_lesson_id: "lesson-a",
        ordered_lesson_ids: [],
      })
    ).toEqual({ previous: null, next: null });
  });

  it("does not wrap from last to first or first to last", () => {
    const first = resolveAdjacentLessonTargets({
      current_lesson_id: "lesson-a",
      ordered_lesson_ids: ORDERED,
    });
    const last = resolveAdjacentLessonTargets({
      current_lesson_id: "lesson-c",
      ordered_lesson_ids: ORDERED,
    });
    expect(first.previous).toBeNull();
    expect(first.next?.lesson_id).toBe("lesson-b");
    expect(last.next).toBeNull();
    expect(last.previous?.lesson_id).toBe("lesson-b");
  });

  it("LessonViewer surfaces Previous/Next from delivery neighbors", () => {
    const ui = read("app/components/learning/LessonViewer.tsx");
    expect(ui).toMatch(/previous_lesson/);
    expect(ui).toMatch(/next_lesson/);
    expect(ui).toMatch(/Previous/);
    expect(ui).toMatch(/Next/);
    expect(ui).not.toMatch(/complete_learning_lesson/);
  });
});
