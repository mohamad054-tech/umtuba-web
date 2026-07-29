import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_AI_TUTOR_MESSAGE_KINDS,
  LEARNING_AI_TUTOR_RPCS,
  LEARNING_AI_TUTOR_ROUTES,
  createMyAiTutorThread,
  sanitizeAiTutorError,
} from "./aiTutorFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/aiTutorFoundation.ts"),
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

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_ID = "33333333-3333-4333-8333-333333333333";

describe("AI Tutor Foundation — files", () => {
  it("ships readiness migration and adapter", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(existsSync(join(ROOT, "lib/learning/aiTutorFoundation.ts"))).toBe(
      true
    );
  });
});

describe("AI Tutor Foundation — SQL", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates threads + messages with message kinds", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_ai_tutor_threads/
    );
    expect(sql).toMatch(
      /create table if not exists public\.learning_ai_tutor_messages/
    );
    expect([...LEARNING_AI_TUTOR_MESSAGE_KINDS]).toEqual([
      "ask_question",
      "explain_again",
      "code_review",
      "hint",
      "other",
    ]);
    expect(body).toMatch(
      /message_kind in \('ask_question', 'explain_again', 'code_review', 'hint', 'other'\)/
    );
  });

  it("exposes create/append/list/get message RPCs", () => {
    for (const name of [
      LEARNING_AI_TUTOR_RPCS.createThread,
      LEARNING_AI_TUTOR_RPCS.appendMessage,
      LEARNING_AI_TUTOR_RPCS.listThreads,
      LEARNING_AI_TUTOR_RPCS.getMessages,
    ]) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("has no external provider / openai / anthropic", () => {
    expect(body).not.toMatch(/\bopenai\b/i);
    expect(body).not.toMatch(/\banthropic\b/i);
    expect(body).not.toMatch(/external provider|api_key|http_request/i);
    expect(sql).toMatch(/stubs; no provider/i);
    const append = stripSqlComments(
      fnBody(sql, "append_my_learning_ai_tutor_message")
    );
    expect(append).toMatch(/AI Tutor is not connected yet/);
  });

  it("revokes anon on AI tutor RPCs", () => {
    expect(sql).toMatch(
      /revoke all on function public\.create_my_learning_ai_tutor_thread\(uuid, uuid, text\)\s+from public, anon/
    );
  });
});

describe("AI Tutor Foundation — adapter", () => {
  it("builds lesson AI tutor route", () => {
    expect(LEARNING_AI_TUTOR_ROUTES.lesson(LESSON_ID)).toBe(
      `/learning/lessons/${LESSON_ID}/ai-tutor`
    );
  });

  it("creates thread via RPC only", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return {
          data: { id: "55555555-5555-4555-8555-555555555555", course_id: COURSE_ID },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect(
      (
        await createMyAiTutorThread(fake as never, {
          courseId: COURSE_ID,
          lessonId: LESSON_ID,
        })
      ).ok
    ).toBe(true);
    expect(calls).toEqual(["create_my_learning_ai_tutor_thread"]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/openai|anthropic/i);
    expect(
      sanitizeAiTutorError("Not entitled to this course")
    ).toMatch(/not allowed/i);
  });
});
