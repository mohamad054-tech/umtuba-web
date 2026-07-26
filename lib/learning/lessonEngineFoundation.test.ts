import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LESSON_ENGINE_RPCS,
  LEARNING_LESSON_ENGINE_ROUTES,
  loadMyLearningLessonEngine,
  sanitizeLessonEngineError,
} from "./lessonEngineFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/lessonEngineFoundation.ts"),
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

describe("Lesson Engine Foundation — files", () => {
  it("ships readiness migration and adapter module", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(
      existsSync(join(ROOT, "lib/learning/lessonEngineFoundation.ts"))
    ).toBe(true);
  });
});

describe("Lesson Engine Foundation — SQL", () => {
  const sql = read(MIGRATION);

  it("defines get_my_learning_lesson_engine with unlock, objectives, prerequisites", () => {
    expect(sql).toMatch(
      /create or replace function public\.get_my_learning_lesson_engine/
    );
    const fn = stripSqlComments(
      fnBody(sql, "get_my_learning_lesson_engine")
    );
    expect(fn).toMatch(/unlock/);
    expect(fn).toMatch(/objectives/);
    expect(fn).toMatch(/prerequisites/);
    expect(fn).toMatch(/get_my_learning_lesson_unlock_state/);
  });

  it("expands content blocks with transcript|pdf|downloadable_file", () => {
    const body = stripSqlComments(sql);
    expect(body).toMatch(/'transcript'/);
    expect(body).toMatch(/'pdf'/);
    expect(body).toMatch(/'downloadable_file'/);
  });

  it("exposes all lesson-engine RPC constants", () => {
    for (const name of Object.values(LEARNING_LESSON_ENGINE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("revokes anon on get_my_learning_lesson_engine", () => {
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_lesson_engine\(uuid\)\s+from public, anon/
    );
  });
});

describe("Lesson Engine Foundation — adapter", () => {
  it("routes and sanitizes auth errors", () => {
    expect(LEARNING_LESSON_ENGINE_ROUTES.lesson(LESSON_ID)).toBe(
      `/learning/lessons/${LESSON_ID}`
    );
    expect(
      sanitizeLessonEngineError("Not entitled to this course")
    ).toMatch(/not allowed/i);
  });

  it("loads lesson engine via RPC only", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string, args?: Record<string, unknown>) => {
        calls.push(name);
        expect(args).toEqual({ p_lesson_id: LESSON_ID });
        return {
          data: {
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
            blocks: [],
            media_position: null,
            activities: [],
            ai_tutor_enabled: true,
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };

    const result = await loadMyLearningLessonEngine(fake as never, LESSON_ID);
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["get_my_learning_lesson_engine"]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/SERVICE_ROLE|service_role/);
  });
});
