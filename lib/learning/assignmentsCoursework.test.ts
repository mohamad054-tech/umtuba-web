import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSIGNMENT_ARTIFACT_KINDS,
  LEARNING_ASSIGNMENT_QUEUE_STATUSES,
  LEARNING_ASSIGNMENT_RPCS,
  LEARNING_ASSIGNMENT_STORAGE_BUCKET,
  buildLearningAssignmentFilePath,
  loadMyAssignment,
  reviewAssignmentSubmission,
  sanitizeAssignmentError,
} from "./assignmentsCoursework";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260857_learning_assignments_coursework_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/ASSIGNMENTS_COURSEWORK_FOUNDATION_V1.md";
const SRC = readFileSync(
  join(ROOT, "lib/learning/assignmentsCoursework.ts"),
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

const ACTIVITY_ID = "33333333-3333-4333-8333-333333333333";
const SUBMISSION_ID = "44444444-4444-4444-8444-444444444444";

describe("Assignments & Coursework Foundation V1 — files", () => {
  it("ships migration, docs, and key pages", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260857_learning_assignments_coursework_foundation_v1.sql");
    expect(
      existsSync(
        join(ROOT, "app/learning/activities/[activityId]/assignment/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/courses/[courseId]/assignments/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/courses/[courseId]/activities/[activityId]/assignment/page.tsx"
        )
      )
    ).toBe(true);
  });
});

describe("Assignments & Coursework Foundation V1 — SQL", () => {
  const sql = read(MIGRATION);

  it("creates assignment domain tables and storage bucket", () => {
    expect(sql).toMatch(/create table if not exists public\.learning_assignment_specs/);
    expect(sql).toMatch(/learning_assignment_resources/);
    expect(sql).toMatch(/learning_assignment_submissions/);
    expect(sql).toMatch(/learning_assignment_artifacts/);
    expect(sql).toMatch(/learning_assignment_reviews/);
    expect(sql).toMatch(/learning-assignment-files/);
    expect(LEARNING_ASSIGNMENT_STORAGE_BUCKET).toBe("learning-assignment-files");
  });

  it("keeps artifacts as text/link/file refs without processing", () => {
    const body = stripSqlComments(sql);
    expect(LEARNING_ASSIGNMENT_ARTIFACT_KINDS).toEqual(["text", "link", "file"]);
    expect(body).toMatch(/kind in \('text', 'link', 'file'\)/);
    expect(body).not.toMatch(/\bocr\b|\bplagiarism\b|pdf_render|ai_grad/i);
  });

  it("exposes authoring, learner, queue, and review RPCs", () => {
    for (const name of Object.values(LEARNING_ASSIGNMENT_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("review assigns points + feedback and may apply progress", () => {
    const fn = stripSqlComments(
      fnBody(sql, "review_learning_assignment_submission")
    );
    expect(fn).toMatch(/points_earned/);
    expect(fn).toMatch(/learner_feedback/);
    expect(fn).toMatch(/reviewed_at/);
    expect(fn).toMatch(/learning_assignment_try_apply_progress/);
    expect(fn).toMatch(/can_manage_learning_course/);
  });

  it("queue supports pending/reviewed/overdue/late/search", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_learning_assignment_submission_queue")
    );
    for (const status of LEARNING_ASSIGNMENT_QUEUE_STATUSES) {
      expect(fn).toContain(`'${status}'`);
    }
    expect(fn).toMatch(/p_search/);
  });

  it("learner ops are owner-only; grants authenticated", () => {
    const submit = stripSqlComments(
      fnBody(sql, "submit_my_learning_assignment_submission")
    );
    expect(submit).toMatch(/auth\.uid\(\)/);
    expect(submit).toMatch(/Not allowed to submit/);
    expect(sql).toMatch(
      /grant execute on function public\.get_my_learning_assignment\(uuid\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_assignment_try_apply_progress\(uuid, uuid\)\s+from public, anon, authenticated/
    );
  });
});

describe("Assignments & Coursework Foundation V1 — adapter", () => {
  it("calls RPCs only and sanitizes auth errors", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === LEARNING_ASSIGNMENT_RPCS.getMine) {
          return {
            data: {
              activity_id: ACTIVITY_ID,
              activity_name: "Essay",
              status: "not_started",
              resources: [],
            },
            error: null,
          };
        }
        return {
          data: {
            submission_id: SUBMISSION_ID,
            status: "reviewed",
            points_earned: 8,
            reviewed_at: "t",
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };

    expect((await loadMyAssignment(fake as never, ACTIVITY_ID)).ok).toBe(true);
    expect(
      (
        await reviewAssignmentSubmission(fake as never, {
          submissionId: SUBMISSION_ID,
          pointsEarned: 8,
          feedback: "Good",
        })
      ).ok
    ).toBe(true);
    expect(calls).toEqual([
      "get_my_learning_assignment",
      "review_learning_assignment_submission",
    ]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(
      sanitizeAssignmentError("Not allowed to manage this assignment")
    ).toMatch(/not allowed/i);
    expect(
      buildLearningAssignmentFilePath(
        "55555555-5555-4555-8555-555555555555",
        ACTIVITY_ID,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "pdf"
      )
    ).toMatch(/\.pdf$/);
  });
});
