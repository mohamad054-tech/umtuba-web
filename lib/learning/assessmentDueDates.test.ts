import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_ASSESSMENT_DUE_MIGRATION,
  LEARNING_ASSESSMENT_DUE_RPCS,
  LEARNING_CALENDAR_ITEM_KINDS,
  clearLearningAssessmentDueAt,
  formatAssessmentDueLocalInput,
  instructorCalendarItemHref,
  isAssessmentDueUuid,
  learnerCalendarItemHref,
  parseAssessmentDueAtInput,
  sanitizeAssessmentDueError,
  setLearningAssessmentDueAt,
} from "./assessmentDueDates";
import { LEARNING_ASSESSMENT_ROUTES } from "./assessmentAuthoring";
import { LEARNING_ASSIGNMENT_ROUTES } from "./assignmentsCoursework";
import { LEARNING_ASSESSMENT_DELIVERY_ROUTES } from "./assessmentDelivery";
import { LEARNING_LIVE_ROUTES } from "./liveCalendarFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION = `supabase/migrations/${LEARNING_ASSESSMENT_DUE_MIGRATION}`;
const DOC =
  "docs/learning/implementation/LEARNING_ASSESSMENT_DUE_DATES_CALENDAR_V1.md";
const LEARNER_CAL =
  "app/learning/courses/[courseId]/calendar/page.tsx";
const INSTR_CAL =
  "app/learning/instructor/courses/[courseId]/calendar/page.tsx";
const QUESTIONS =
  "app/learning/instructor/courses/[courseId]/activities/[activityId]/questions/page.tsx";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
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

describe("Assessment Due Dates Calendar V1 — files", () => {
  it("ships migration, docs, adapter, and wired pages", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      LEARNING_ASSESSMENT_DUE_MIGRATION
    );
    expect(existsSync(join(ROOT, LEARNER_CAL))).toBe(true);
    expect(existsSync(join(ROOT, INSTR_CAL))).toBe(true);
    expect(existsSync(join(ROOT, QUESTIONS))).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/learning/assessmentDueDates.ts"))
    ).toBe(true);
  });
});

describe("Assessment Due Dates Calendar V1 — migration contracts", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("adds nullable due_at and partial index on settings", () => {
    expect(sql).toMatch(
      /alter table public\.learning_activity_settings\s+add column if not exists due_at timestamptz/
    );
    expect(sql).toMatch(/learning_activity_settings_due_at_idx/);
    expect(sql).toMatch(/where due_at is not null/);
  });

  it("defines manage-only set RPC with security definer + search_path", () => {
    const fn = stripSqlComments(
      fnBody(sql, "set_learning_assessment_due_at")
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/set search_path = public/);
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/can_manage_learning_course/);
    expect(fn).toMatch(/type is distinct from 'quiz'/);
    expect(fn).toMatch(/p_clear_due/);
    expect(fn).toMatch(/due_at = v_next_due/);
    expect(fn).not.toMatch(/start_my_learning_assessment_attempt/);
    expect(fn).not.toMatch(/score_learning_attempt/);
    expect(fn).not.toMatch(/submit_learning_attempt/);
  });

  it("revokes anon/public and grants authenticated on set RPC", () => {
    expect(body).toMatch(
      /revoke all on function public\.set_learning_assessment_due_at\(uuid, timestamptz, boolean\)\s+from public, anon/
    );
    expect(body).toMatch(
      /grant execute on function public\.set_learning_assessment_due_at\(uuid, timestamptz, boolean\)\s+to authenticated/
    );
  });

  it("extends learner calendar with assessment_due and preserves live + assignment", () => {
    const mine = stripSqlComments(fnBody(sql, "get_my_learning_calendar"));
    expect(mine).toMatch(/'live_session'/);
    expect(mine).toMatch(/'assignment_due'/);
    expect(mine).toMatch(/'assessment_due'/);
    expect(mine).toMatch(/learning_assignment_specs/);
    expect(mine).toMatch(/a\.type = 'quiz'/);
    expect(mine).toMatch(/'assessment_due_supported', true/);
    expect(mine).not.toMatch(/'assessment_due_supported', false/);
  });

  it("extends instructor calendar with assessment_due", () => {
    const instr = stripSqlComments(
      fnBody(sql, "get_instructor_learning_calendar")
    );
    expect(instr).toMatch(/learning_live_assert_manage/);
    expect(instr).toMatch(/'live_session'/);
    expect(instr).toMatch(/'assignment_due'/);
    expect(instr).toMatch(/'assessment_due'/);
    expect(instr).toMatch(/'assessment_due_supported', true/);
  });

  it("does not create an assessment-spec table", () => {
    expect(body).not.toMatch(/create table.*learning_assessment_specs/i);
  });
});

describe("Assessment Due Dates Calendar V1 — adapter", () => {
  it("validates UUID and datetime inputs", () => {
    expect(isAssessmentDueUuid("11111111-1111-4111-8111-111111111111")).toBe(
      true
    );
    expect(isAssessmentDueUuid("x")).toBe(false);
    expect(parseAssessmentDueAtInput("").ok).toBe(false);
    expect(parseAssessmentDueAtInput("not-a-date").ok).toBe(false);
    const ok = parseAssessmentDueAtInput("2026-09-01T12:00");
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data).toMatch(/Z$/);
    }
    expect(formatAssessmentDueLocalInput("2026-09-01T12:00:00.000Z")).toBe(
      "2026-09-01T12:00"
    );
  });

  it("sanitizes manage / quiz / missing errors", () => {
    expect(sanitizeAssessmentDueError("Authentication required")).toMatch(
      /not allowed/i
    );
    expect(
      sanitizeAssessmentDueError(
        "Assessment due dates are only supported for quiz activities"
      )
    ).toMatch(/quiz/i);
    expect(sanitizeAssessmentDueError("Learning activity not found")).toMatch(
      /not found/i
    );
  });

  it("set/clear map RPC args and failures", async () => {
    const calls: Array<{ rpc: string; args: Record<string, unknown> }> = [];
    const okClient = {
      rpc: async (rpc: string, args: Record<string, unknown>) => {
        calls.push({ rpc, args });
        return {
          data: {
            activity_id: args.p_activity_id,
            course_id: "22222222-2222-4222-8222-222222222222",
            due_at: args.p_clear_due ? null : args.p_due_at,
            cleared: Boolean(args.p_clear_due),
          },
          error: null,
        };
      },
    } as never;

    const set = await setLearningAssessmentDueAt(okClient, {
      activityId: "11111111-1111-4111-8111-111111111111",
      dueAt: "2026-09-01T15:30:00.000Z",
    });
    expect(set.ok).toBe(true);
    expect(calls[0]?.rpc).toBe(LEARNING_ASSESSMENT_DUE_RPCS.set);
    expect(calls[0]?.args.p_clear_due).toBe(false);

    const cleared = await clearLearningAssessmentDueAt(
      okClient,
      "11111111-1111-4111-8111-111111111111"
    );
    expect(cleared.ok).toBe(true);
    if (cleared.ok) {
      expect(cleared.data.due_at).toBeNull();
      expect(cleared.data.cleared).toBe(true);
    }

    const badId = await setLearningAssessmentDueAt(okClient, {
      activityId: "bad",
      dueAt: "2026-09-01T15:30:00.000Z",
    });
    expect(badId.ok).toBe(false);

    const failClient = {
      rpc: async () => ({
        data: null,
        error: { message: "Assessment due dates are only supported for quiz activities" },
      }),
    } as never;
    const quizFail = await setLearningAssessmentDueAt(failClient, {
      activityId: "11111111-1111-4111-8111-111111111111",
      dueAt: "2026-09-01T15:30:00.000Z",
    });
    expect(quizFail.ok).toBe(false);
    if (!quizFail.ok) expect(quizFail.message).toMatch(/quiz/i);
  });

  it("calendar href helpers route live / assignment / assessment", () => {
    const courseId = "11111111-1111-4111-8111-111111111111";
    const itemId = "22222222-2222-4222-8222-222222222222";
    expect(LEARNING_CALENDAR_ITEM_KINDS).toContain("assessment_due");
    expect(learnerCalendarItemHref("live_session", courseId, itemId)).toBe(
      LEARNING_LIVE_ROUTES.learnerSession(courseId, itemId)
    );
    expect(learnerCalendarItemHref("assignment_due", courseId, itemId)).toBe(
      LEARNING_ASSIGNMENT_ROUTES.learner(itemId)
    );
    expect(learnerCalendarItemHref("assessment_due", courseId, itemId)).toBe(
      LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(itemId)
    );
    expect(instructorCalendarItemHref("live_session", courseId, itemId)).toBe(
      LEARNING_LIVE_ROUTES.instructorSession(courseId, itemId)
    );
    expect(instructorCalendarItemHref("assignment_due", courseId, itemId)).toBe(
      LEARNING_ASSIGNMENT_ROUTES.author(courseId, itemId)
    );
    expect(instructorCalendarItemHref("assessment_due", courseId, itemId)).toBe(
      LEARNING_ASSESSMENT_ROUTES.activityQuestions(courseId, itemId)
    );
  });
});

describe("Assessment Due Dates Calendar V1 — UI source contracts", () => {
  it("learner calendar links assessment and assignment dues", () => {
    const src = read(LEARNER_CAL);
    expect(src).toMatch(/learnerCalendarItemHref/);
    expect(src).toMatch(/assessment dues/i);
    expect(src).toMatch(/Live sessions, assignment dues, and assessment dues/);
  });

  it("instructor calendar links assessment questions and assignment authoring", () => {
    const src = read(INSTR_CAL);
    expect(src).toMatch(/instructorCalendarItemHref/);
    expect(src).toMatch(/assessment dues/i);
  });

  it("questions page wires due date set/clear controls", () => {
    const src = read(QUESTIONS);
    expect(src).toMatch(/setAssessmentDueAtAction/);
    expect(src).toMatch(/clearAssessmentDueAtAction/);
    expect(src).toMatch(/datetime-local/);
    expect(src).toMatch(/dueAt/);
    expect(src).toMatch(/loadLearningAssessmentDueAt/);
  });

  it("adapter is RPC-only for mutations (no service role)", () => {
    const src = read("lib/learning/assessmentDueDates.ts");
    expect(src).toMatch(/\.rpc\(/);
    expect(src).toMatch(/LEARNING_ASSESSMENT_DUE_RPCS\.set/);
    expect(src).not.toMatch(/SERVICE_ROLE|service_role/);
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});
