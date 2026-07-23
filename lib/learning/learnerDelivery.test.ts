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
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(/score_learning_attempt/);
      expect(src).not.toMatch(/learning_attempt_results/);
      expect(src).not.toMatch(/answer_keys/);
      expect(src).not.toMatch(/is_correct|points_earned|passed/);
      expect(src).not.toMatch(/show_result_policy/);
    }
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
