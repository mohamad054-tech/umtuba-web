import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_UNLOCK_RPCS,
  loadMyLessonUnlockState,
  parseLearningLessonPointCostConfig,
  parseLearningLessonUnlockRpcResult,
  requireLessonUnlockedForLearner,
  sanitizeLessonPointCostError,
  sanitizeLessonUnlockError,
  setLessonPointCost,
  unlockMyLessonWithUmPoints,
} from "./lessonUnlockFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

function fnBody(sql: string, name: string) {
  const fnStarts = [
    ...sql.matchAll(/create or replace function public\.(\w+)/g),
  ];
  const idx = fnStarts.findIndex((m) => m[1] === name);
  if (idx < 0) throw new Error(`function ${name} not found`);
  const start = fnStarts[idx].index ?? 0;
  const end =
    idx + 1 < fnStarts.length
      ? (fnStarts[idx + 1].index ?? sql.length)
      : sql.length;
  return sql.slice(start, end);
}

const LESSON_ID = "33333333-3333-4333-8333-333333333333";

describe("Lesson Unlock Foundation — files", () => {
  it("ships readiness migration and adapter", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(
      existsSync(join(ROOT, "lib/learning/lessonUnlockFoundation.ts"))
    ).toBe(true);
  });
});

describe("Lesson Unlock Foundation — SQL", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates point cost + unlock tables", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_lesson_point_costs/
    );
    expect(sql).toMatch(
      /create table if not exists public\.learning_lesson_unlocks/
    );
  });

  it("exposes unlock RPCs matching constants", () => {
    for (const name of Object.values(LEARNING_LESSON_UNLOCK_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("does NOT alter um_points_ledger_points_positive check / drop that constraint", () => {
    expect(body).not.toMatch(/um_points_ledger_points_positive/);
    expect(body).not.toMatch(
      /drop constraint[\s\S]{0,80}um_points_ledger/i
    );
    expect(body).not.toMatch(
      /alter table[\s\S]{0,80}um_points_ledger[\s\S]{0,80}drop constraint/i
    );
    expect(sql).toMatch(/no um_points_ledger positive-check change/i);
  });

  it("unlock deducts balance without rewriting ledger CHECK", () => {
    const fn = stripSqlComments(
      fnBody(sql, "unlock_my_learning_lesson_with_um_points")
    );
    expect(fn).toMatch(/um_point_balances/);
    expect(fn).toMatch(/insufficient_balance/);
    expect(fn).not.toMatch(/um_points_ledger_points_positive/);
  });

  it("set cost requires unlock_cost > 0 and supports enabled flag", () => {
    const fn = stripSqlComments(
      fnBody(sql, "set_learning_lesson_point_cost")
    );
    expect(fn).toMatch(/unlock_cost must be > 0/);
    expect(fn).toMatch(/p_enabled/);
  });
});

describe("setLessonPointCost — validation and RPC", () => {
  it("accepts positive cost and parses enabled row", async () => {
    const fake = {
      rpc: async (name: string, args?: Record<string, unknown>) => {
        expect(name).toBe("set_learning_lesson_point_cost");
        expect(args).toEqual({
          p_lesson_id: LESSON_ID,
          p_unlock_cost: 50,
          p_enabled: true,
        });
        return {
          data: {
            lesson_id: LESSON_ID,
            unlock_cost: 50,
            enabled: true,
            updated_at: "2026-08-06T00:00:00Z",
          },
          error: null,
        };
      },
    };
    const result = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: 50,
      enabled: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.unlock_cost).toBe(50);
      expect(result.data.enabled).toBe(true);
    }
  });

  it("accepts disable (enabled false) with positive retained cost", async () => {
    const fake = {
      rpc: async (_name: string, args?: Record<string, unknown>) => {
        expect(args?.p_enabled).toBe(false);
        expect(args?.p_unlock_cost).toBe(25);
        return {
          data: {
            lesson_id: LESSON_ID,
            unlock_cost: 25,
            enabled: false,
            updated_at: "2026-08-06T00:00:00Z",
          },
          error: null,
        };
      },
    };
    const result = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: 25,
      enabled: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it("rejects zero and negative costs", async () => {
    const fake = {
      rpc: async () => {
        throw new Error("should not call rpc");
      },
    };
    const zero = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: 0,
    });
    expect(zero.ok).toBe(false);
    const neg = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: -5,
    });
    expect(neg.ok).toBe(false);
  });

  it("rejects malformed cost", async () => {
    const fake = {
      rpc: async () => {
        throw new Error("should not call rpc");
      },
    };
    const bad = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: Number.NaN,
    });
    expect(bad.ok).toBe(false);
  });

  it("sanitizes RPC failure", async () => {
    const fake = {
      rpc: async () => ({
        data: null,
        error: { message: "Not allowed to manage this lesson" },
      }),
    };
    const result = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/not allowed/i);
      expect(result.message).not.toMatch(/manage this lesson$/i);
    }
  });

  it("fails closed on malformed RPC response", async () => {
    const fake = {
      rpc: async () => ({
        data: { lesson_id: LESSON_ID, unlock_cost: "x", enabled: true },
        error: null,
      }),
    };
    const result = await setLessonPointCost(fake as never, {
      lessonId: LESSON_ID,
      unlockCost: 10,
    });
    expect(result.ok).toBe(false);
  });

  it("parseLearningLessonPointCostConfig rejects bad shapes", () => {
    expect(parseLearningLessonPointCostConfig(null)).toBeNull();
    expect(
      parseLearningLessonPointCostConfig({
        lesson_id: LESSON_ID,
        unlock_cost: 0,
        enabled: true,
      })
    ).toBeNull();
  });

  it("sanitizeLessonPointCostError maps auth errors", () => {
    expect(
      sanitizeLessonPointCostError("Authentication required")
    ).toMatch(/not allowed/i);
  });
});

describe("unlockMyLessonWithUmPoints — fail-closed contract", () => {
  it("success true + unlocked true → ok true", async () => {
    const fake = {
      rpc: async () => ({
        data: {
          success: true,
          unlocked: true,
          points_spent: 50,
          balance: 10,
        },
        error: null,
      }),
    };
    const result = await unlockMyLessonWithUmPoints(fake as never, LESSON_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.unlocked).toBe(true);
      expect(result.data.points_spent).toBe(50);
    }
  });

  it("success false → ok false (insufficient balance)", async () => {
    const fake = {
      rpc: async () => ({
        data: {
          success: false,
          error: "insufficient_balance",
          cost: 50,
          balance: 10,
        },
        error: null,
      }),
    };
    const result = await unlockMyLessonWithUmPoints(fake as never, LESSON_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/insufficient/i);
    }
  });

  it("null payload → ok false", async () => {
    const fake = {
      rpc: async () => ({ data: null, error: null }),
    };
    const result = await unlockMyLessonWithUmPoints(fake as never, LESSON_ID);
    expect(result.ok).toBe(false);
  });

  it("malformed payload → ok false", async () => {
    expect(parseLearningLessonUnlockRpcResult("x").ok).toBe(false);
    expect(parseLearningLessonUnlockRpcResult([]).ok).toBe(false);
    const fake = {
      rpc: async () => ({ data: ["nope"], error: null }),
    };
    const result = await unlockMyLessonWithUmPoints(fake as never, LESSON_ID);
    expect(result.ok).toBe(false);
  });

  it("success true + unlocked false → ok false", async () => {
    const parsed = parseLearningLessonUnlockRpcResult({
      success: true,
      unlocked: false,
    });
    expect(parsed.ok).toBe(false);
  });

  it("PostgREST/transport error → ok false", async () => {
    const fake = {
      rpc: async () => ({
        data: null,
        error: { message: "Not entitled to this course" },
      }),
    };
    const result = await unlockMyLessonWithUmPoints(fake as never, LESSON_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/not allowed/i);
    }
  });

  it("does not trust balance/reason without success", () => {
    const parsed = parseLearningLessonUnlockRpcResult({
      success: false,
      unlocked: true,
      balance: 999,
      reason: "already_unlocked",
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("Lesson Unlock Foundation — state adapter", () => {
  it("loads unlock state via RPC", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return {
          data: {
            lesson_id: LESSON_ID,
            locked: true,
            cost: 50,
            balance: 10,
            unlocked: false,
          },
          error: null,
        };
      },
    };
    const result = await loadMyLessonUnlockState(fake as never, LESSON_ID);
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["get_my_learning_lesson_unlock_state"]);
    expect(
      sanitizeLessonUnlockError("Not entitled to this course")
    ).toMatch(/not allowed/i);
  });

  it("requireLessonUnlockedForLearner fails closed when locked", async () => {
    const lockedClient = {
      rpc: async () => ({
        data: {
          lesson_id: LESSON_ID,
          locked: true,
          cost: 50,
          balance: 10,
          unlocked: false,
        },
        error: null,
      }),
    };
    const locked = await requireLessonUnlockedForLearner(
      lockedClient as never,
      LESSON_ID
    );
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.message).toMatch(/locked/i);
    }

    const openClient = {
      rpc: async () => ({
        data: {
          lesson_id: LESSON_ID,
          locked: false,
          cost: null,
          balance: 10,
          unlocked: true,
        },
        error: null,
      }),
    };
    const open = await requireLessonUnlockedForLearner(
      openClient as never,
      LESSON_ID
    );
    expect(open.ok).toBe(true);
  });
});

describe("Instructor point-cost UI wiring", () => {
  it("lesson page and action expose set-cost controls", () => {
    const page = read(
      "app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx"
    );
    const actions = read("app/learning/instructor/actions.ts");
    const learner = read("app/learning/firstCourseActions.ts");
    expect(page).toMatch(/setLessonPointCostAction/);
    expect(page).toMatch(/UM Points unlock/);
    expect(page).toMatch(/Disable paid unlock/);
    expect(page).toMatch(/refreshOnSuccess/);
    expect(actions).toMatch(/setLessonPointCostAction/);
    expect(actions).toMatch(/setLessonPointCost/);
    expect(learner).toMatch(/unlockMyLessonWithUmPoints/);
  });
});
