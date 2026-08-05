import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE,
  LEARNING_LESSON_ENGINE_UNAVAILABLE_MESSAGE,
  LEARNING_LESSON_LOCKED_MESSAGE,
  parseLearningLessonEngineUnlock,
  resolveLessonContentAccess,
  type LearningLessonEnginePayload,
  type LessonEngineResult,
} from "./lessonEngineFoundation";

const ROOT = join(__dirname, "../..");
const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const BLOCK_ID = "44444444-4444-4444-8444-444444444444";

function baseEngine(
  overrides: Partial<LearningLessonEnginePayload> = {}
): LearningLessonEnginePayload {
  return {
    lesson_id: LESSON_ID,
    lesson: {
      name: "Intro",
      difficulty: null,
      estimated_duration_minutes: 10,
      description: null,
      status: "published",
    },
    objectives: [],
    prerequisites: [],
    unlock: {
      lesson_id: LESSON_ID,
      locked: false,
      cost: null,
      balance: 0,
      unlocked: true,
    },
    unlock_required: false,
    blocks: [
      {
        id: BLOCK_ID,
        block_type: "rich_text",
        position: 0,
        status: "published",
        content: { body: "secret gated body" },
      },
    ],
    media_position: null,
    activities: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        type: "quiz",
        name: "Quiz 1",
        status: "published",
      },
    ],
    ai_tutor_enabled: true,
    ...overrides,
  };
}

function ok(
  data: LearningLessonEnginePayload
): LessonEngineResult<LearningLessonEnginePayload> {
  return { ok: true, data };
}

describe("resolveLessonContentAccess — fail-closed", () => {
  it("verified unlocked lesson can render protected content", () => {
    const access = resolveLessonContentAccess(ok(baseEngine()));
    expect(access.state).toBe("verified_unlocked");
    expect(access.canRenderProtectedContent).toBe(true);
    if (access.state === "verified_unlocked") {
      expect(access.engine.blocks).toHaveLength(1);
      expect(access.engine.blocks[0]?.content).toEqual({
        body: "secret gated body",
      });
    }
  });

  it("verified locked lesson hides protected content", () => {
    const access = resolveLessonContentAccess(
      ok(
        baseEngine({
          unlock_required: true,
          unlock: {
            lesson_id: LESSON_ID,
            locked: true,
            cost: 50,
            balance: 10,
            unlocked: false,
          },
          blocks: [],
          activities: [],
        })
      )
    );
    expect(access.state).toBe("locked");
    expect(access.canRenderProtectedContent).toBe(false);
    expect(access.message).toBe(LEARNING_LESSON_LOCKED_MESSAGE);
  });

  it("engine RPC failure hides protected content", () => {
    const access = resolveLessonContentAccess({
      ok: false,
      message: "Lesson engine could not be loaded.",
    });
    expect(access.state).toBe("engine_unavailable");
    expect(access.canRenderProtectedContent).toBe(false);
    expect(access.engine).toBeNull();
    expect(access.message).toMatch(/could not be verified|could not be loaded/i);
  });

  it("null engine result hides protected content", () => {
    const access = resolveLessonContentAccess(null);
    expect(access.state).toBe("access_unverified");
    expect(access.canRenderProtectedContent).toBe(false);
    expect(access.message).toBe(LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE);
  });

  it("malformed unlock on engine payload hides protected content", () => {
    const access = resolveLessonContentAccess(
      ok(
        baseEngine({
          unlock: { locked: "yes" } as never,
        })
      )
    );
    expect(access.state).toBe("access_unverified");
    expect(access.canRenderProtectedContent).toBe(false);
  });

  it("free lesson remains accessible when unlock_required is false", () => {
    const access = resolveLessonContentAccess(
      ok(
        baseEngine({
          unlock_required: false,
          unlock: {
            lesson_id: LESSON_ID,
            locked: false,
            cost: null,
            balance: 0,
            unlocked: false,
          },
        })
      )
    );
    expect(access.state).toBe("verified_unlocked");
    expect(access.canRenderProtectedContent).toBe(true);
  });

  it("instructor/manage path remains accessible when unlock_required is false even if unlock.locked", () => {
    const access = resolveLessonContentAccess(
      ok(
        baseEngine({
          unlock_required: false,
          unlock: {
            lesson_id: LESSON_ID,
            locked: true,
            cost: 50,
            balance: 999,
            unlocked: true,
          },
        })
      )
    );
    expect(access.state).toBe("verified_unlocked");
    expect(access.canRenderProtectedContent).toBe(true);
  });

  it("empty engine unavailable message uses sanitized default", () => {
    const access = resolveLessonContentAccess({ ok: false, message: "   " });
    expect(access.state).toBe("engine_unavailable");
    expect(access.message).toBe(LEARNING_LESSON_ENGINE_UNAVAILABLE_MESSAGE);
  });
});

describe("parseLearningLessonEngineUnlock", () => {
  it("rejects malformed unlock objects", () => {
    expect(parseLearningLessonEngineUnlock(null)).toBeNull();
    expect(parseLearningLessonEngineUnlock({})).toBeNull();
    expect(
      parseLearningLessonEngineUnlock({
        lesson_id: LESSON_ID,
        locked: true,
        unlocked: false,
        balance: "x",
        cost: null,
      })
    ).toBeNull();
  });
});

describe("LessonViewer + lesson page wiring — no delivery bypass", () => {
  it("LessonViewer never falls back to delivery.blocks when engine is missing", () => {
    const ui = readFileSync(
      join(ROOT, "app/components/learning/LessonViewer.tsx"),
      "utf8"
    );
    expect(ui).toMatch(/resolveLessonContentAccess/);
    expect(ui).toMatch(/canRenderProtectedContent/);
    expect(ui).toMatch(/LearningLearnerLessonShell/);
    expect(ui).not.toMatch(/: delivery\.blocks/);
    expect(ui).not.toMatch(/delivery\.activities/);
    expect(ui).not.toMatch(/LearningLearnerLessonDelivery/);
  });

  it("lesson page is engine-first and never parallel-loads full delivery", () => {
    const page = readFileSync(
      join(ROOT, "app/learning/lessons/[lessonId]/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/resolveLessonContentAccess/);
    expect(page).toMatch(/loadLessonDeliveryForAccess/);
    expect(page).toMatch(/loadMyLearningLessonEngine/);
    expect(page).toMatch(/access=\{access\}/);
    expect(page).not.toMatch(/Promise\.all/);
    expect(page).not.toMatch(/loadLessonDeliveryProtected/);
    expect(page).not.toMatch(/toMetadataDelivery/);
    expect(page).not.toMatch(
      /engine=\{engineResult\.ok \? engineResult\.data : null\}/
    );
  });

  it("AI Tutor page uses metadata-only delivery after unlock gate", () => {
    const page = readFileSync(
      join(ROOT, "app/learning/lessons/[lessonId]/ai-tutor/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/requireLessonUnlockedForLearner/);
    expect(page).toMatch(/loadLessonDeliveryMetadata/);
    expect(page).not.toMatch(/loadLessonDeliveryProtected/);
    expect(page).not.toMatch(/loadLessonDeliveryForAccess/);
    expect(page).not.toMatch(/\bloadLessonDelivery\b/);
  });

  it("direct delivery blocks cannot bypass a failed access decision", () => {
    const deliveryBlocks = [
      {
        id: BLOCK_ID,
        content: { body: "leaked via delivery SELECT" },
      },
    ];
    const access = resolveLessonContentAccess({
      ok: false,
      message: "rpc failed",
    });
    expect(access.canRenderProtectedContent).toBe(false);
    // Viewer contract: renderable blocks only when access allows; delivery
    // payload must be ignored for protected content.
    const renderable = access.canRenderProtectedContent
      ? deliveryBlocks
      : [];
    expect(renderable).toEqual([]);
  });

  it("metadata-only delivery type has no protected content fields", () => {
    const src = readFileSync(
      join(ROOT, "lib/learning/learnerDelivery.ts"),
      "utf8"
    );
    expect(src).toMatch(/delivery_kind:\s*"metadata_only"/);
    expect(src).toMatch(/delivery_kind:\s*"verified_full"/);
    expect(src).toMatch(/isVerifiedUnlockedLessonAccess/);
    expect(src).toMatch(/loadLessonDeliveryMetadata/);
    expect(src).toMatch(/loadLessonDeliveryProtected/);
    expect(src).toMatch(/loadLessonDeliveryForAccess/);
  });
});
