import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_COMMUNITY_RPCS,
  LEARNING_COMMUNITY_ROUTES,
  sanitizeCommunityError,
  isCommunityUuid,
} from "./communityFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260858_learning_discussions_community_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/DISCUSSIONS_COMMUNITY_FOUNDATION_V1.md";

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

describe("Discussions & Course Community Foundation V1 — files", () => {
  it("ships migration, docs, and community pages", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260858_learning_discussions_community_foundation_v1.sql"
    );
    expect(
      existsSync(
        join(ROOT, "app/learning/courses/[courseId]/community/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/courses/[courseId]/community/discussions/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/courses/[courseId]/community/qa/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/courses/[courseId]/community/announcements/page.tsx"
        )
      )
    ).toBe(true);
  });

  it("exposes stable routes", () => {
    const courseId = "11111111-1111-4111-8111-111111111111";
    expect(LEARNING_COMMUNITY_ROUTES.hub(courseId)).toBe(
      `/learning/courses/${courseId}/community`
    );
    expect(LEARNING_COMMUNITY_ROUTES.discussion(courseId, "t")).toContain(
      "/discussions/t"
    );
  });
});

describe("Discussions & Course Community Foundation V1 — SQL", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates community domain tables", () => {
    expect(sql).toMatch(/create table if not exists public\.learning_discussion_threads/);
    expect(sql).toMatch(/learning_discussion_replies/);
    expect(sql).toMatch(/learning_qa_questions/);
    expect(sql).toMatch(/learning_qa_answers/);
    expect(sql).toMatch(/learning_announcements/);
  });

  it("extends notification types without dropping learning_course_completed", () => {
    expect(sql).toMatch(/learning_announcement_posted/);
    expect(sql).toMatch(/learning_discussion_reply/);
    expect(sql).toMatch(/learning_qa_answered/);
    expect(sql).toMatch(/learning_course_completed/);
  });

  it("exposes all community RPCs", () => {
    for (const name of Object.values(LEARNING_COMMUNITY_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("force-enables RLS and revokes DML from authenticated", () => {
    expect(body).toMatch(/force row level security/);
    expect(body).toMatch(
      /revoke insert, update, delete on table public\.learning_discussion_threads/
    );
    expect(body).toMatch(
      /revoke insert, update, delete on table public\.learning_announcements/
    );
  });

  it("discussion mutations require auth and course access; staff for lock/archive", () => {
    const create = stripSqlComments(
      fnBody(sql, "create_learning_discussion_thread")
    );
    expect(create).toMatch(/learning_community_assert_access/);
    expect(create).toMatch(/auth\.uid\(\)/);

    const lock = stripSqlComments(
      fnBody(sql, "lock_learning_discussion_thread")
    );
    expect(lock).toMatch(/learning_community_assert_staff/);

    const soft = stripSqlComments(
      fnBody(sql, "soft_delete_learning_discussion_thread")
    );
    expect(soft).toMatch(/author_id is distinct from v_uid/);
    expect(soft).toMatch(/learning_community_assert_staff/);
  });

  it("Q&A supports asker role, accept answer, and staff moderation", () => {
    const create = stripSqlComments(fnBody(sql, "create_learning_qa_question"));
    expect(create).toMatch(/asker_role/);
    expect(create).toMatch(/'instructor'|instructor/);

    const accept = stripSqlComments(fnBody(sql, "accept_learning_qa_answer"));
    expect(accept).toMatch(/accepted_answer_id/);
    expect(accept).toMatch(/resolved/);

    const mod = stripSqlComments(fnBody(sql, "moderate_learning_qa_question"));
    expect(mod).toMatch(/learning_community_assert_staff/);
    expect(mod).toMatch(/'lock'/);
    expect(mod).toMatch(/'archive'/);
    expect(mod).toMatch(/'remove'/);
  });

  it("announcements are staff-publish only and notify learners", () => {
    const publish = stripSqlComments(
      fnBody(sql, "publish_learning_announcement")
    );
    expect(publish).toMatch(/learning_community_assert_staff/);
    expect(publish).toMatch(/create_notification/);
    expect(publish).toMatch(/learning_announcement_posted/);
    expect(publish).toMatch(/learning_instructor_course_learners/);
  });

  it("community feed covers discussions, announcements, unanswered, instructor activity", () => {
    const feed = stripSqlComments(
      fnBody(sql, "get_learning_course_community_feed")
    );
    expect(feed).toMatch(/'announcement'/);
    expect(feed).toMatch(/'discussion'/);
    expect(feed).toMatch(/'unanswered_question'/);
    expect(feed).toMatch(/'instructor_activity'/);
    expect(feed).toMatch(/unanswered_question_count/);
  });

  it("does not introduce realtime chat, messaging, or AI", () => {
    expect(body).not.toMatch(/\brealtime\b|\blive_room\b|\bmessaging\b|\bopenai\b/i);
  });
});

describe("Discussions & Course Community Foundation V1 — adapter", () => {
  it("validates UUIDs and sanitizes errors", () => {
    expect(isCommunityUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isCommunityUuid("nope")).toBe(false);
    expect(sanitizeCommunityError("Authentication required")).toMatch(
      /not allowed/i
    );
    expect(sanitizeCommunityError("Discussion thread not found")).toMatch(
      /not found/i
    );
  });

  it("adapter only calls RPC surface (no table writes)", () => {
    const src = read("lib/learning/communityFoundation.ts");
    expect(src).toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/\.from\(/);
    expect(src).not.toMatch(/service_role|SERVICE_ROLE/);
  });
});
