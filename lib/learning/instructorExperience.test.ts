import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_INTERNAL,
  LEARNING_INSTRUCTOR_EXPERIENCE_RPCS,
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  LEARNING_INSTRUCTOR_PROGRESS_BUCKETS,
  loadInstructorCompletionOverview,
  loadInstructorCourseOverview,
  loadInstructorDashboard,
  loadInstructorLearnerDetail,
  loadInstructorLearnerProgress,
  loadInstructorReviewQueue,
  sanitizeInstructorExperienceError,
} from "./instructorExperience";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260856_learning_instructor_experience_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/INSTRUCTOR_EXPERIENCE_FOUNDATION_V1.md";
const SRC = readFileSync(
  join(ROOT, "lib/learning/instructorExperience.ts"),
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
const LEARNER_ID = "55555555-5555-4555-8555-555555555555";

describe("Instructor Experience Foundation V1 — files", () => {
  it("ships migration, docs, and pages", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260856_learning_instructor_experience_foundation_v1.sql");
    expect(
      existsSync(join(ROOT, "app/learning/instructor/review/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/courses/[courseId]/overview/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/courses/[courseId]/learners/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/courses/[courseId]/learners/[learnerUserId]/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/courses/[courseId]/completion/page.tsx"
        )
      )
    ).toBe(true);
  });
});

describe("Instructor Experience Foundation V1 — SQL", () => {
  const sql = read(MIGRATION);

  it("exposes staff read RPCs only; no mutations of grades/progress/certs", () => {
    for (const name of Object.values(LEARNING_INSTRUCTOR_EXPERIENCE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
    const body = stripSqlComments(sql);
    expect(body).not.toMatch(/update public\.learning_attempt_results/i);
    expect(body).not.toMatch(/update public\.learning_course_progress/i);
    expect(body).not.toMatch(/insert into public\.learning_certificates/i);
    expect(body).not.toMatch(/create_notification/i);
  });

  it("gates with can_manage_learning_course / platform admin", () => {
    const dash = stripSqlComments(
      fnBody(sql, "get_instructor_learning_dashboard")
    );
    const overview = stripSqlComments(
      fnBody(sql, "get_instructor_learning_course_overview")
    );
    expect(dash).toMatch(/can_manage_learning_course/);
    expect(overview).toMatch(/learning_instructor_assert_course_manage/);
    expect(LEARNING_INSTRUCTOR_EXPERIENCE_INTERNAL.assertManage).toBe(
      "learning_instructor_assert_course_manage"
    );
  });

  it("review queue supports course/status/search filters; reuses pending review", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_instructor_learning_review_queue")
    );
    expect(fn).toMatch(/p_course_id/);
    expect(fn).toMatch(/p_status/);
    expect(fn).toMatch(/p_search/);
    expect(fn).toMatch(/partially_graded/);
    expect(fn).toMatch(/has_pending_manual_review/);
  });

  it("progress monitor covers required buckets", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_instructor_learning_learner_progress")
    );
    for (const bucket of LEARNING_INSTRUCTOR_PROGRESS_BUCKETS) {
      expect(fn).toContain(`'${bucket}'`);
    }
  });

  it("completion overview covers completed/failed/waiting/inactive", () => {
    const fn = stripSqlComments(
      fnBody(sql, "get_instructor_learning_completion_overview")
    );
    expect(fn).toMatch(/waiting_grading/);
    expect(fn).toMatch(/inactive/);
    expect(fn).toMatch(/interval '14 days'/);
  });

  it("grants execute to authenticated; internals revoked", () => {
    expect(sql).toMatch(
      /revoke all on function public\.learning_instructor_assert_course_manage\(uuid, uuid\)\s+from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_instructor_learning_dashboard\(\)\s+to authenticated/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_instructor_learning_learner_detail\(uuid, uuid\)\s+to authenticated/
    );
  });
});

describe("Instructor Experience Foundation V1 — adapter", () => {
  it("loads all surfaces via RPCs only", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.dashboard) {
          return {
            data: {
              instructor_user_id: LEARNER_ID,
              totals: {
                course_count: 0,
                enrollment_count: 0,
                pending_reviews: 0,
                completion_count: 0,
              },
              courses: [],
              pending_work: [],
              recent_activity: [],
            },
            error: null,
          };
        }
        if (name === LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.reviewQueue) {
          return {
            data: {
              course_id: null,
              status_filter: "pending",
              search: null,
              items: [],
              item_count: 0,
            },
            error: null,
          };
        }
        if (name === LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.courseOverview) {
          return {
            data: {
              course_id: COURSE_ID,
              course_name: "Course",
              course_slug: "course",
              course_status: "published",
              enrollment_count: 1,
              active_learners: 0,
              completion_count: 0,
              pending_reviews: 0,
              avg_percent_complete: null,
              certificate_count: 0,
            },
            error: null,
          };
        }
        if (name === LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.learnerProgress) {
          return {
            data: {
              course_id: COURSE_ID,
              bucket_filter: null,
              search: null,
              learners: [],
              learner_count: 0,
            },
            error: null,
          };
        }
        if (name === LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.learnerDetail) {
          return {
            data: {
              course_id: COURSE_ID,
              learner_user_id: LEARNER_ID,
              learner_label: "Learner",
              enrollment_status: "active",
              enrollment_target_type: "course",
              enrolled_at: null,
              progress_status: "in_progress",
              percent_complete: 10,
              completed_lessons_count: 1,
              total_lessons_count: 10,
              completed_at: null,
              last_activity_at: null,
              lessons: [],
              completed_activities: [],
              assessments: [],
              certificate_status: "none",
              certificate_code: null,
              certificate_issued_at: null,
            },
            error: null,
          };
        }
        return {
          data: {
            course_id: COURSE_ID,
            completed: [],
            failed: [],
            waiting_grading: [],
            inactive: [],
            counts: {
              completed: 0,
              failed: 0,
              waiting_grading: 0,
              inactive: 0,
            },
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };

    expect((await loadInstructorDashboard(fake as never)).ok).toBe(true);
    expect((await loadInstructorReviewQueue(fake as never)).ok).toBe(true);
    expect(
      (await loadInstructorCourseOverview(fake as never, COURSE_ID)).ok
    ).toBe(true);
    expect(
      (await loadInstructorLearnerProgress(fake as never, COURSE_ID)).ok
    ).toBe(true);
    expect(
      (await loadInstructorLearnerDetail(fake as never, COURSE_ID, LEARNER_ID))
        .ok
    ).toBe(true);
    expect(
      (await loadInstructorCompletionOverview(fake as never, COURSE_ID)).ok
    ).toBe(true);

    expect(calls).toEqual([
      "get_instructor_learning_dashboard",
      "get_instructor_learning_review_queue",
      "get_instructor_learning_course_overview",
      "get_instructor_learning_learner_progress",
      "get_instructor_learning_learner_detail",
      "get_instructor_learning_completion_overview",
    ]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(SRC).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(
      sanitizeInstructorExperienceError("Not allowed to manage this course")
    ).toMatch(/not allowed/i);
    expect(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.hub).toBe(
      "/learning/instructor"
    );
  });
});
