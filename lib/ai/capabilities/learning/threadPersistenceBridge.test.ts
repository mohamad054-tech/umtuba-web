/**
 * Static SQL + unit tests for Learning AI Tutor Thread Persistence Bridge.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX,
  LEARNING_AI_TUTOR_EXCHANGE_KINDS,
  LEARNING_AI_TUTOR_RPCS,
  appendMyAiTutorExchange,
} from "../../../learning/aiTutorFoundation";
import {
  LEARNING_TUTOR_ACTION_TO_MESSAGE_KIND,
  LEARNING_TUTOR_PERSISTABLE_ACTIONS,
  mapLearningTutorActionToMessageKind,
  persistLearningTutorExchange,
  serializeAssistantContentForPersistence,
  serializeLearnerContentForPersistence,
  validateThreadForPersistence,
} from "./threadPersistenceBridge";
import {
  parseLearningTutorIntegrationRequest,
  runLearningTutorIntegration,
} from "../../services/learningTutorIntegration";
import { LEARNING_TUTOR_PROMPTS } from "./prompts";
import { registerPrompts } from "../../prompts/registry";
import { resetLearningTutorToolsForTests } from "./tools";
import { resetAiRunState } from "../../runs/lifecycle";
import { resetAiTraceState } from "../../tracing/events";
import { resetAiUsageState } from "../../usage/accounting";
import { resetAiSessionState } from "../../sessions/session";
import { resetAiRateLimitState } from "../../safety/hooks";

const ROOT = join(__dirname, "../../../..");
const MIGRATION =
  "supabase/migrations/20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql";
const METADATA_MIGRATION =
  "supabase/migrations/20260873_learning_ai_tutor_thread_metadata_read_v1.sql";
const STUB_MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const BRIDGE_SRC = readFileSync(
  join(ROOT, "lib/ai/capabilities/learning/threadPersistenceBridge.ts"),
  "utf8"
);
const FOUNDATION_SRC = readFileSync(
  join(ROOT, "lib/learning/aiTutorFoundation.ts"),
  "utf8"
);
const INTEGRATION_SRC = readFileSync(
  join(ROOT, "lib/ai/services/learningTutorIntegration.ts"),
  "utf8"
);

const USER = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const SECTION = "44444444-4444-4444-8444-444444444444";
const THREAD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BLOCK = "88888888-8888-4888-8888-888888888888";

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

describe("Thread Persistence Bridge — migration SQL", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);
  const exchange = stripSqlComments(
    fnBody(sql, "append_my_learning_ai_tutor_exchange")
  );

  it("ships as next migration after AI core foundation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql"
    );
    expect(existsSync(join(ROOT, STUB_MIGRATION))).toBe(true);
  });

  it("is security definer with fixed safe search_path", () => {
    expect(exchange).toMatch(/security definer/i);
    expect(exchange).toMatch(/set search_path\s*=\s*public/i);
  });

  it("guards auth.uid ownership and course entitlement", () => {
    expect(exchange).toMatch(/auth\.uid\(\)/);
    expect(exchange).toMatch(/user_id is distinct from v_uid/);
    expect(exchange).toMatch(/has_learning_course_access/);
    expect(exchange).toMatch(/Thread not found/);
    expect(exchange).toMatch(/Not entitled to this course/);
  });

  it("allowlists only ask_question, explain_again, hint", () => {
    expect(exchange).toMatch(
      /v_kind not in \('ask_question', 'explain_again', 'hint'\)/
    );
    expect(exchange).not.toMatch(/code_review/);
    expect([...LEARNING_AI_TUTOR_EXCHANGE_KINDS]).toEqual([
      "ask_question",
      "explain_again",
      "hint",
    ]);
  });

  it("enforces content bounds and safe-text on both contents", () => {
    expect(exchange).toMatch(/1\.\.20000/);
    expect(exchange).toMatch(/learning_lesson_content_block_assert_safe_text/);
    expect(exchange).toMatch(/p_user_content/);
    expect(exchange).toMatch(/p_assistant_content/);
  });

  it("inserts user and real assistant rows (no stub text)", () => {
    const inserts = exchange.match(
      /insert into public\.learning_ai_tutor_messages/gi
    );
    expect(inserts?.length).toBe(2);
    expect(exchange).toMatch(/'user'/);
    expect(exchange).toMatch(/'assistant'/);
    expect(exchange).toMatch(/v_assistant_content/);
    expect(exchange).not.toMatch(/AI Tutor is not connected yet/);
    expect(exchange).toMatch(/updated_at = now\(\)/);
  });

  it("revokes public/anon and grants authenticated (+ service_role grant only)", () => {
    expect(body).toMatch(
      /revoke all on function public\.append_my_learning_ai_tutor_exchange\(uuid, text, text, text\)\s+from public, anon/i
    );
    expect(body).toMatch(
      /grant execute on function public\.append_my_learning_ai_tutor_exchange\(uuid, text, text, text\)\s+to authenticated, service_role/i
    );
  });

  it("preserves stub append RPC in earlier migration", () => {
    const stub = read(STUB_MIGRATION);
    expect(stub).toMatch(
      /create or replace function public\.append_my_learning_ai_tutor_message/
    );
    expect(sql).not.toMatch(/drop function.*append_my_learning_ai_tutor_message/i);
  });

  it("creates no new tables", () => {
    expect(body).not.toMatch(/create table/i);
  });
});

describe("Thread Persistence Bridge — architecture boundaries", () => {
  it("does not use service_role from application modules", () => {
    expect(BRIDGE_SRC).not.toMatch(
      /service_role|SERVICE_ROLE|createServiceRole/
    );
    expect(FOUNDATION_SRC).not.toMatch(/SERVICE_ROLE_KEY|createServiceRole/);
    expect(INTEGRATION_SRC).not.toMatch(
      /service_role|SERVICE_ROLE|createServiceRole/
    );
  });

  it("does not import React, commerce, or UI", () => {
    expect(BRIDGE_SRC).not.toMatch(
      /from ["']react["']|next\/|commerce|@\/app\//
    );
    expect(INTEGRATION_SRC).not.toMatch(/from ["']react["']/);
  });

  it("uses exchange RPC name from foundation constants", () => {
    expect(LEARNING_AI_TUTOR_RPCS.appendExchange).toBe(
      "append_my_learning_ai_tutor_exchange"
    );
    expect(LEARNING_AI_TUTOR_RPCS.getThread).toBe(
      "get_my_learning_ai_tutor_thread"
    );
    expect(FOUNDATION_SRC).toMatch(/appendMyAiTutorExchange/);
    expect(FOUNDATION_SRC).toMatch(/getMyAiTutorThread/);
    expect(BRIDGE_SRC).toMatch(/appendMyAiTutorExchange/);
    expect(BRIDGE_SRC).toMatch(/getMyAiTutorThread/);
    expect(BRIDGE_SRC).not.toMatch(/appendMyAiTutorMessage/);
    expect(BRIDGE_SRC).not.toMatch(/getMyAiTutorThreadMessages/);
  });
});

describe("Thread Metadata Read — migration SQL", () => {
  const sql = read(METADATA_MIGRATION);
  const body = stripSqlComments(sql);
  const meta = stripSqlComments(fnBody(sql, "get_my_learning_ai_tutor_thread"));

  it("ships as next migration after thread persistence bridge", () => {
    expect(existsSync(join(ROOT, METADATA_MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260873_learning_ai_tutor_thread_metadata_read_v1.sql"
    );
  });

  it("is security definer with fixed safe search_path", () => {
    expect(meta).toMatch(/security definer/i);
    expect(meta).toMatch(/set search_path\s*=\s*public/i);
  });

  it("requires auth.uid and owner-scoped non-enumerating lookup", () => {
    expect(meta).toMatch(/auth\.uid\(\)/);
    expect(meta).toMatch(/user_id is distinct from v_uid/);
    expect(meta).toMatch(/Thread not found/);
  });

  it("returns lean metadata only (no messages, no user_id)", () => {
    expect(meta).toMatch(/thread_id/);
    expect(meta).toMatch(/course_id/);
    expect(meta).toMatch(/lesson_id/);
    expect(meta).not.toMatch(/learning_ai_tutor_messages/);
    expect(meta).not.toMatch(/'messages'/);
    expect(meta).not.toMatch(/'user_id'/);
  });

  it("revokes public/anon and grants authenticated (+ service_role convention)", () => {
    expect(body).toMatch(
      /revoke all on function public\.get_my_learning_ai_tutor_thread\(uuid\)\s+from public, anon/i
    );
    expect(body).toMatch(
      /grant execute on function public\.get_my_learning_ai_tutor_thread\(uuid\)\s+to authenticated, service_role/i
    );
  });

  it("creates no new tables", () => {
    expect(body).not.toMatch(/create table/i);
  });
});

describe("Thread Persistence Bridge — action mapping", () => {
  it("maps exact supported actions", () => {
    expect(mapLearningTutorActionToMessageKind("answer_question")).toBe(
      "ask_question"
    );
    expect(mapLearningTutorActionToMessageKind("explain_again")).toBe(
      "explain_again"
    );
    expect(mapLearningTutorActionToMessageKind("give_hint")).toBe("hint");
    expect(LEARNING_TUTOR_ACTION_TO_MESSAGE_KIND).toEqual({
      answer_question: "ask_question",
      explain_again: "explain_again",
      give_hint: "hint",
    });
    expect([...LEARNING_TUTOR_PERSISTABLE_ACTIONS]).toEqual([
      "answer_question",
      "explain_again",
      "give_hint",
    ]);
  });

  it("rejects unknown / unsupported actions fail-closed", () => {
    expect(mapLearningTutorActionToMessageKind("explain_lesson")).toBeNull();
    expect(mapLearningTutorActionToMessageKind("summarize_lesson")).toBeNull();
    expect(mapLearningTutorActionToMessageKind("generate_practice")).toBeNull();
    expect(
      mapLearningTutorActionToMessageKind("explain_wrong_answer")
    ).toBeNull();
    expect(mapLearningTutorActionToMessageKind("code_review")).toBeNull();
    expect(mapLearningTutorActionToMessageKind("hack")).toBeNull();
  });
});

describe("Thread Persistence Bridge — serialization", () => {
  it("serializes bounded learner content", () => {
    expect(
      serializeLearnerContentForPersistence("answer_question", {
        question: "What is a neuron?",
      })
    ).toBe("What is a neuron?");
    expect(
      serializeLearnerContentForPersistence("give_hint", {
        focus: "backprop",
      })
    ).toBe("backprop");
    const long = "x".repeat(LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX + 50);
    const clamped = serializeLearnerContentForPersistence("answer_question", {
      question: long,
    });
    expect(clamped?.length).toBe(LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX);
  });

  it("excludes provider/internal fields from assistant serialization", () => {
    const text = serializeAssistantContentForPersistence("answer_question", {
      answer: "A neuron is a unit.",
      sourceReferences: [{ id: "x", label: "hidden" }],
      groundingStatus: "grounded",
      limitations: ["x"],
      confidence: "high",
      modelId: "gpt",
      providerId: "openai",
      promptVersion: "9",
      groundingPack: { secret: true },
      labeledAiGenerated: true,
    });
    expect(text).toBeTruthy();
    expect(text).toContain("A neuron is a unit.");
    expect(text).not.toMatch(
      /sourceReferences|grounding|modelId|provider|promptVersion/i
    );
  });

  it("serializes explain_again learner-facing fields only", () => {
    const text = serializeAssistantContentForPersistence("explain_again", {
      title: "Simpler view",
      simplerExplanation: "Think of layers.",
      keyPoints: ["a", "b"],
      analogy: "like a factory",
      checkUnderstanding: ["q1"],
      sourceReferences: [],
      groundingStatus: "grounded",
      limitations: [],
      labeledAiGenerated: true,
      officialCourseContent: false,
      mutatesProgress: false,
      mutatesGrades: false,
    });
    expect(text).toContain("Simpler view");
    expect(text).toContain("Think of layers.");
    expect(text).not.toMatch(
      /mutatesGrades|officialCourseContent|groundingStatus/
    );
  });
});

describe("Thread Persistence Bridge — validate + persist units", () => {
  it("rejects invalid threadId", async () => {
    const result = await validateThreadForPersistence({} as never, {
      threadId: "not-a-uuid",
      lessonId: LESSON,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });

  it("fails on non-owned / missing thread", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string) => {
        expect(name).toBe("get_my_learning_ai_tutor_thread");
        return {
          data: null,
          error: { message: "Thread not found" },
        };
      }),
    };
    const result = await validateThreadForPersistence(supabase as never, {
      threadId: THREAD,
      lessonId: LESSON,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("permission_denied");
  });

  it("fails on thread/lesson mismatch", async () => {
    const otherLesson = "99999999-9999-4999-8999-999999999999";
    const supabase = {
      rpc: vi.fn(async (name: string) => {
        expect(name).toBe("get_my_learning_ai_tutor_thread");
        return {
          data: {
            thread_id: THREAD,
            course_id: COURSE,
            lesson_id: otherLesson,
            title: "AI Tutor",
            created_at: "2026-07-30T00:00:00.000Z",
            updated_at: "2026-07-30T00:00:00.000Z",
          },
          error: null,
        };
      }),
    };
    const result = await validateThreadForPersistence(supabase as never, {
      threadId: THREAD,
      lessonId: LESSON,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/does not match this lesson/i);
  });

  it("uses lean metadata RPC instead of full messages RPC", async () => {
    const rpc = vi.fn(async (name: string) => {
      expect(name).toBe("get_my_learning_ai_tutor_thread");
      return {
        data: {
          thread_id: THREAD,
          course_id: COURSE,
          lesson_id: LESSON,
          title: "AI Tutor",
          created_at: "2026-07-30T00:00:00.000Z",
          updated_at: "2026-07-30T00:00:00.000Z",
        },
        error: null,
      };
    });
    const ok = await validateThreadForPersistence({ rpc } as never, {
      threadId: THREAD,
      lessonId: LESSON,
    });
    expect(ok.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("get_my_learning_ai_tutor_thread", {
      p_thread_id: THREAD,
    });
    expect(rpc.mock.calls.some((c) => c[0] === "get_my_learning_ai_tutor_thread_messages")).toBe(
      false
    );
  });

  it("persists via exchange RPC and surfaces persistence errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe("append_my_learning_ai_tutor_exchange");
        expect(args.p_kind).toBe("ask_question");
        expect(args.p_assistant_content).not.toMatch(/not connected yet/i);
        return {
          data: {
            thread_id: THREAD,
            user_message: { id: "u1", role: "user" },
            assistant_message: { id: "a1", role: "assistant" },
          },
          error: null,
        };
      }),
    };
    const ok = await persistLearningTutorExchange(okClient as never, {
      threadId: THREAD,
      kind: "ask_question",
      userContent: "What is AI?",
      assistantContent: JSON.stringify({ answer: "AI is…" }),
    });
    expect(ok.ok).toBe(true);

    const failClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "connection failed" },
      })),
    };
    const failed = await persistLearningTutorExchange(failClient as never, {
      threadId: THREAD,
      kind: "hint",
      userContent: "focus",
      assistantContent: JSON.stringify({ hint: "try again" }),
    });
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.error.code).toBe("provider_error");
  });

  it("foundation appendMyAiTutorExchange rejects bad kind / bounds", async () => {
    const badKind = await appendMyAiTutorExchange({} as never, {
      threadId: THREAD,
      kind: "code_review" as never,
      userContent: "x",
      assistantContent: "y",
    });
    expect(badKind.ok).toBe(false);

    const empty = await appendMyAiTutorExchange({} as never, {
      threadId: THREAD,
      kind: "hint",
      userContent: "   ",
      assistantContent: "ok",
    });
    expect(empty.ok).toBe(false);
  });
});

function createLessonFakeSupabase(rpc: ReturnType<typeof vi.fn>) {
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
    rpc,
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
      (api as { then?: unknown }).then = (
        resolve: (v: unknown) => unknown
      ) => {
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

describe("Thread Persistence Bridge — integration wiring", () => {
  it("rejects threadId on unsupported actions", () => {
    const parsed = parseLearningTutorIntegrationRequest({
      action: "explain_lesson",
      lessonId: LESSON,
      threadId: THREAD,
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects invalid threadId on persistable action", () => {
    const parsed = parseLearningTutorIntegrationRequest({
      action: "answer_question",
      lessonId: LESSON,
      question: "Why?",
      threadId: "bad",
    });
    expect(parsed.ok).toBe(false);
  });

  it("persists after successful answer_question", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name === "has_learning_course_access") {
        return { data: true, error: null };
      }
      if (name === "get_my_learning_lesson_unlock_state") {
        return {
          data: {
            lesson_id: LESSON,
            locked: false,
            cost: null,
            balance: 100,
            unlocked: true,
          },
          error: null,
        };
      }
      if (name === "get_my_learning_ai_tutor_thread") {
        return {
          data: {
            thread_id: THREAD,
            course_id: COURSE,
            lesson_id: LESSON,
            title: "AI Tutor",
            created_at: "2026-07-30T00:00:00.000Z",
            updated_at: "2026-07-30T00:00:00.000Z",
          },
          error: null,
        };
      }
      if (name === "append_my_learning_ai_tutor_exchange") {
        expect(args?.p_kind).toBe("ask_question");
        expect(String(args?.p_user_content)).toContain("neuron");
        expect(String(args?.p_assistant_content)).not.toMatch(/not connected/i);
        expect(String(args?.p_assistant_content)).not.toMatch(
          /modelId|providerId/
        );
        return {
          data: {
            thread_id: THREAD,
            user_message: { id: "u", role: "user" },
            assistant_message: { id: "a", role: "assistant" },
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    });

    const ok = await runLearningTutorIntegration(
      {
        action: "answer_question",
        lessonId: LESSON,
        question: "What is a neuron?",
        threadId: THREAD,
      },
      {
        supabase: createLessonFakeSupabase(rpc) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(ok.ok).toBe(true);
    expect(
      rpc.mock.calls.some((c) => c[0] === "append_my_learning_ai_tutor_exchange")
    ).toBe(true);
    expect(
      rpc.mock.calls.some((c) => c[0] === "append_my_learning_ai_tutor_message")
    ).toBe(false);
  });

  it("surfaces persistence failure after AI success (no silent success)", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "has_learning_course_access") {
        return { data: true, error: null };
      }
      if (name === "get_my_learning_lesson_unlock_state") {
        return {
          data: {
            lesson_id: LESSON,
            locked: false,
            cost: null,
            balance: 100,
            unlocked: true,
          },
          error: null,
        };
      }
      if (name === "get_my_learning_ai_tutor_thread") {
        return {
          data: {
            thread_id: THREAD,
            course_id: COURSE,
            lesson_id: LESSON,
            title: "AI Tutor",
            created_at: "2026-07-30T00:00:00.000Z",
            updated_at: "2026-07-30T00:00:00.000Z",
          },
          error: null,
        };
      }
      if (name === "append_my_learning_ai_tutor_exchange") {
        return { data: null, error: { message: "write failed" } };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    });

    const failed = await runLearningTutorIntegration(
      {
        action: "answer_question",
        lessonId: LESSON,
        question: "What is a neuron?",
        threadId: THREAD,
      },
      {
        supabase: createLessonFakeSupabase(rpc) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.error.message).toMatch(/could not complete|could not save|unavailable/i);
  });

  it("fails closed when entitlement denied (no exchange write)", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "get_my_learning_ai_tutor_thread") {
        return {
          data: {
            thread_id: THREAD,
            course_id: COURSE,
            lesson_id: LESSON,
            title: "AI Tutor",
            created_at: "2026-07-30T00:00:00.000Z",
            updated_at: "2026-07-30T00:00:00.000Z",
          },
          error: null,
        };
      }
      if (name === "has_learning_course_access") {
        return { data: false, error: null };
      }
      if (name === "get_my_learning_lesson_unlock_state") {
        return {
          data: {
            lesson_id: LESSON,
            locked: false,
            unlocked: true,
            cost: null,
            balance: 0,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    });
    const result = await runLearningTutorIntegration(
      {
        action: "give_hint",
        lessonId: LESSON,
        focus: "gradients",
        threadId: THREAD,
      },
      {
        supabase: createLessonFakeSupabase(rpc) as never,
        userId: USER,
        forceStub: true,
      }
    );
    expect(result.ok).toBe(false);
    expect(
      rpc.mock.calls.some((c) => c[0] === "append_my_learning_ai_tutor_exchange")
    ).toBe(false);
  });
});
