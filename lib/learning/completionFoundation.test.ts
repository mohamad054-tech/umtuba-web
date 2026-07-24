import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_COMPLETION_EVENT_TYPES,
  LEARNING_COMPLETION_INTERNAL,
  LEARNING_COMPLETION_NOTIFICATION_TYPE,
  LEARNING_COMPLETION_RPCS,
  finalizeMyCourseCompletion,
  loadMyLearningTranscript,
  parseLearningTranscriptView,
  sanitizeLearningCompletionError,
} from "./completionFoundation";
import { LEARNING_PROGRESS_EVENT_TYPES } from "./progressFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260855_learning_completion_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/LEARNING_COMPLETION_FOUNDATION_V1.md";
const SRC = readFileSync(
  join(ROOT, "lib/learning/completionFoundation.ts"),
  "utf8"
);
const ACTIONS = readFileSync(
  join(ROOT, "app/learning/completionActions.ts"),
  "utf8"
);
const PAGE = readFileSync(
  join(ROOT, "app/learning/transcript/page.tsx"),
  "utf8"
);
const NOTIF = readFileSync(
  join(ROOT, "lib/supabase/notifications.ts"),
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

const COURSE_ID = "33333333-3333-4333-8333-333333333333";

describe("Learning Completion Foundation V1 — files", () => {
  it("ships migration and docs", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260855_learning_completion_foundation_v1.sql");
  });
});

describe("Learning Completion Foundation V1 — SQL", () => {
  const sql = read(MIGRATION);

  it("creates certificates table with unique user+course; no PDF", () => {
    const body = stripSqlComments(sql);
    expect(sql).toMatch(/create table if not exists public\.learning_certificates/);
    expect(sql).toMatch(/learning_certificates_user_course_unique/);
    expect(sql).toMatch(/No PDF/);
    expect(body).not.toMatch(/\bbadges?\b|\brewards?\b|blockchain/i);
    expect(body).not.toMatch(/create table.*pdf|pdf_render|certificate_pdf/i);
  });

  it("finalize requires completed progress + assessment gate; idempotent", () => {
    const fn = stripSqlComments(
      fnBody(sql, "learning_completion_try_finalize_course")
    );
    const gate = stripSqlComments(
      fnBody(sql, "learning_completion_assessment_gate_ok")
    );
    expect(LEARNING_COMPLETION_INTERNAL.tryFinalize).toBe(
      "learning_completion_try_finalize_course"
    );
    expect(fn).toMatch(/course_progress_not_completed/);
    expect(fn).toMatch(/assessment_requirements_unmet/);
    expect(fn).toMatch(/learning_completion_assessment_gate_ok/);
    expect(fn).toMatch(/idempotent/);
    expect(fn).toMatch(/learning_completion_event_write_once/);
    expect(fn).toMatch(/create_notification/);
    expect(fn).toMatch(/learning_course_completed/);
    expect(fn).toMatch(/set search_path\s*=\s*public/i);
    expect(fn).not.toMatch(/p_certificate_code|p_final_score/);
    // Lessons hang under sections — never invent lesson.course_id.
    expect(gate).toMatch(/learning_sections/);
    expect(gate).toMatch(/sec\.course_id/);
    expect(gate).not.toMatch(/l\.course_id/);
  });

  it("auto-finalizes on course progress completed transition", () => {
    expect(sql).toMatch(/learning_completion_after_course_progress_trg/);
    expect(sql).toMatch(/learning_completion_after_course_progress/);
    expect(sql).toMatch(
      /after insert or update of status on public\.learning_course_progress/
    );
  });

  it("events extend progress events; notifications extend type check", () => {
    expect(sql).toMatch(/'course_completed'/);
    expect(sql).toMatch(/'certificate_issued'/);
    expect(sql).toMatch(/learning_progress_events_completion_dedupe_idx/);
    expect(sql).toMatch(/learning_course_completed/);
    expect(LEARNING_COMPLETION_EVENT_TYPES).toEqual([
      "course_completed",
      "certificate_issued",
    ]);
    expect(LEARNING_PROGRESS_EVENT_TYPES).toContain("course_completed");
    expect(LEARNING_COMPLETION_NOTIFICATION_TYPE).toBe(
      "learning_course_completed"
    );
  });

  it("transcript is owner read-only completed courses", () => {
    const fn = stripSqlComments(fnBody(sql, "get_my_learning_transcript"));
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/status = 'completed'/);
    expect(fn).toMatch(/certificate_status/);
    expect(fn).toMatch(/final_score/);
    expect(fn).not.toMatch(/\binsert\b/i);
    expect(fn).not.toMatch(/\bupdate\b/i);
  });

  it("owner finalize + grants/revokes", () => {
    const fn = stripSqlComments(
      fnBody(sql, "finalize_my_learning_course_completion")
    );
    expect(fn).toMatch(/has_learning_course_access/);
    expect(sql).toMatch(
      /revoke all on function public\.learning_completion_try_finalize_course\(uuid, uuid, uuid\)\s+from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /grant execute on function public\.finalize_my_learning_course_completion\(uuid\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_transcript\(\)\s+from public, anon/
    );
  });

  it("assessment progress apply hooks course finalize", () => {
    const fn = stripSqlComments(
      fnBody(sql, "apply_my_learning_assessment_progress")
    );
    expect(fn).toMatch(/learning_completion_try_finalize_course/);
    expect(fn).toMatch(/course_completion/);
  });
});

describe("Learning Completion Foundation V1 — adapter/UI", () => {
  it("loads transcript and finalize via RPCs only", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === LEARNING_COMPLETION_RPCS.getTranscript) {
          return {
            data: {
              learner_user_id: "55555555-5555-4555-8555-555555555555",
              entry_count: 0,
              entries: [],
            },
            error: null,
          };
        }
        return {
          data: {
            course_id: COURSE_ID,
            status: "applied",
            reason: null,
            certificate_id: "99999999-9999-4999-8999-999999999999",
            certificate_code: "LC-TEST",
            certificate_issued: true,
            completion_event: true,
            notification_sent: true,
            issued_at: "t",
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect((await loadMyLearningTranscript(fake as never)).ok).toBe(true);
    expect(
      (await finalizeMyCourseCompletion(fake as never, COURSE_ID)).ok
    ).toBe(true);
    expect(calls).toEqual([
      "get_my_learning_transcript",
      "finalize_my_learning_course_completion",
    ]);
    expect(
      sanitizeLearningCompletionError("Not entitled to this course")
    ).toMatch(/not allowed/i);
    expect(
      parseLearningTranscriptView({
        learner_user_id: "55555555-5555-4555-8555-555555555555",
        entries: [],
      })?.entry_count
    ).toBe(0);
  });

  it("UI and notification type wired; no service-role", () => {
    expect(SRC).not.toMatch(/\.from\(/);
    expect(ACTIONS).toMatch(/getServerUser/);
    expect(ACTIONS).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(PAGE).toMatch(/loadMyLearningTranscript/);
    expect(PAGE).toMatch(/finalizeCourseCompletionAction/);
    expect(NOTIF).toMatch(/learning_course_completed/);
  });
});
