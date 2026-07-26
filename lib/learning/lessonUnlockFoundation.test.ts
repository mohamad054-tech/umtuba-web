import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_UNLOCK_RPCS,
  loadMyLessonUnlockState,
  sanitizeLessonUnlockError,
} from "./lessonUnlockFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/lessonUnlockFoundation.ts"),
  "utf8"
);

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
});

describe("Lesson Unlock Foundation — adapter", () => {
  it("loads unlock state via RPC only", async () => {
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
      from: () => {
        throw new Error("no select");
      },
    };
    const result = await loadMyLessonUnlockState(fake as never, LESSON_ID);
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["get_my_learning_lesson_unlock_state"]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(
      sanitizeLessonUnlockError("Not entitled to this course")
    ).toMatch(/not allowed/i);
  });
});
