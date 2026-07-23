import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_READ_MODEL_ACCESS_HELPERS,
  LEARNING_READ_MODEL_COURSE_TREE_TABLES,
  LEARNING_READ_MODEL_DROPPED_POLICIES,
  LEARNING_READ_MODEL_ENTITLED_POLICIES,
  LEARNING_READ_MODEL_HARDENING_MIGRATION,
  LEARNING_READ_MODEL_PRIOR_MIGRATIONS,
  LEARNING_READ_MODEL_PUBLIC_DISCOVERY_POLICIES,
  LEARNING_READ_MODEL_RETAINED_PROGRAM_CATALOG_POLICY,
  LEARNING_READ_MODEL_SETTINGS_TABLES,
  LEARNING_READ_MODEL_STAFF_POLICIES,
} from "./readModelHardening";

const ROOT = process.cwd();
const MIGRATION = `supabase/migrations/${LEARNING_READ_MODEL_HARDENING_MIGRATION}`;
const DOC = "docs/learning/implementation/READ_MODEL_HARDENING_V1.md";
const SCORING_MIGRATION =
  "supabase/migrations/20260839_learning_scoring_foundation_v1.sql";
const QUESTIONS_MIGRATION =
  "supabase/migrations/20260837_learning_questions_foundation_v1.sql";
const CONTENT_BLOCKS_MIGRATION =
  "supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql";
const ATTEMPTS_MIGRATION =
  "supabase/migrations/20260838_learning_attempts_foundation_v1.sql";
const PROGRESS_MIGRATION =
  "supabase/migrations/20260835_learning_progress_foundation_v1.sql";
const ACTIVITIES_MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
const PROGRAMS_MIGRATION =
  "supabase/migrations/20260829_learning_programs_foundation_v1.sql";
const COURSES_MIGRATION =
  "supabase/migrations/20260830_learning_courses_foundation_v1.sql";
const SECTIONS_MIGRATION =
  "supabase/migrations/20260831_learning_sections_foundation_v1.sql";
const LESSONS_MIGRATION =
  "supabase/migrations/20260832_learning_lessons_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

/** Extract a named CREATE POLICY body from this hardening migration. */
function policyBody(sql: string, name: string) {
  const needle = `create policy "${name}"`;
  const start = sql.indexOf(needle);
  if (start < 0) throw new Error(`policy not found: ${name}`);
  const from = start;
  const nextCreate = sql.indexOf("\ncreate policy ", from + needle.length);
  const nextDrop = sql.indexOf("\ndrop policy ", from + needle.length);
  const nextSection = sql.indexOf("\n-- ----------", from + needle.length);
  const candidates = [nextCreate, nextDrop, nextSection, sql.length].filter(
    (n) => n >= 0
  );
  const end = Math.min(...candidates);
  return sql.slice(from, end);
}

describe("Read Model Hardening V1 — files, ordering & uniqueness", () => {
  it("ships migration, constants module, docs, and prior deps exist", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/readModelHardening.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, SCORING_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRESS_MIGRATION))).toBe(true);
  });

  it("is ordered after Scoring (20260840 > 20260839)", () => {
    expect(MIGRATION > SCORING_MIGRATION).toBe(true);
  });

  it("migration 20260840 is unique / unused elsewhere", () => {
    const migrationsDir = join(ROOT, "supabase/migrations");
    const matches = readdirSync(migrationsDir).filter((f) =>
      f.startsWith("20260840")
    );
    expect(matches).toEqual([LEARNING_READ_MODEL_HARDENING_MIGRATION]);
  });

  it("does NOT modify prior Learning migrations (20260828–20260839)", () => {
    expect(MIGRATION).toContain("20260840");
    for (const prior of LEARNING_READ_MODEL_PRIOR_MIGRATIONS) {
      expect(existsSync(join(ROOT, "supabase/migrations", prior))).toBe(true);
    }
    const sql = stripSqlComments(read(MIGRATION));
    expect(sql).not.toMatch(/alter table public\.learning_/i);
    expect(sql).not.toMatch(/create table /i);
    expect(sql).not.toMatch(/create or replace function /i);
  });
});

describe("Read Model Hardening V1 — dropped over/under-grant policies", () => {
  const sql = read(MIGRATION);

  it("drops exactly the approved space-member / members-read learner policies", () => {
    for (const name of LEARNING_READ_MODEL_DROPPED_POLICIES) {
      expect(sql).toMatch(
        new RegExp(`drop policy if exists "${name}"`, "i")
      );
    }
  });

  it("does NOT drop the retained program catalog policy", () => {
    expect(LEARNING_READ_MODEL_RETAINED_PROGRAM_CATALOG_POLICY).toBe(
      "Space members read accessible programs"
    );
    expect(sql).not.toMatch(
      /drop policy if exists "Space members read accessible programs"/i
    );
  });

  it("does NOT drop manager / platform-admin tree policies", () => {
    for (const name of [
      "Course managers read courses",
      "Platform admins read all courses",
      "Section managers read sections",
      "Platform admins read all sections",
      "Lesson managers read lessons",
      "Platform admins read all lessons",
      "Activity managers read activities",
      "Platform admins read all activities",
      "Program managers read programs",
      "Platform admins read all programs",
    ]) {
      expect(sql).not.toMatch(
        new RegExp(`drop policy if exists "${name}"`, "i")
      );
    }
  });
});

describe("Read Model Hardening V1 — entitled learner course tree", () => {
  const sql = read(MIGRATION);
  const code = stripSqlComments(sql);

  it("creates entitled policies for courses, sections, lessons, activities", () => {
    expect([...LEARNING_READ_MODEL_COURSE_TREE_TABLES]).toEqual([
      "learning_courses",
      "learning_sections",
      "learning_lessons",
      "learning_activities",
    ]);
    for (const name of [
      "Entitled learners read published courses",
      "Entitled learners read published sections",
      "Entitled learners read published lessons",
      "Entitled learners read published activities",
    ]) {
      expect(LEARNING_READ_MODEL_ENTITLED_POLICIES).toContain(name);
      expect(sql).toMatch(new RegExp(`create policy "${name}"`, "i"));
    }
  });

  it("1) entitled learner published course uses has_learning_course_access + chain", () => {
    const body = policyBody(sql, "Entitled learners read published courses");
    expect(body).toMatch(/on public\.learning_courses for select/);
    expect(body).toMatch(/status = 'published'/);
    expect(body).toMatch(/p\.status = 'published'/);
    expect(body).toMatch(/s\.status = 'active'/);
    expect(body).toMatch(
      /has_learning_course_access\(learning_courses\.id\)/
    );
    expect(stripSqlComments(body)).not.toMatch(/is_learning_space_member/);
  });

  it("2) entitled learner published section uses course access + parent published", () => {
    const body = policyBody(sql, "Entitled learners read published sections");
    expect(body).toMatch(/on public\.learning_sections for select/);
    expect(body).toMatch(/status = 'published'/);
    expect(body).toMatch(/c\.status = 'published'/);
    expect(body).toMatch(/p\.status = 'published'/);
    expect(body).toMatch(/s\.status = 'active'/);
    expect(body).toMatch(/has_learning_course_access\(c\.id\)/);
    expect(stripSqlComments(body)).not.toMatch(/is_learning_space_member/);
  });

  it("3) entitled learner published lesson requires full chain", () => {
    const body = policyBody(sql, "Entitled learners read published lessons");
    expect(body).toMatch(/on public\.learning_lessons for select/);
    expect(body).toMatch(/sec\.status = 'published'/);
    expect(body).toMatch(/c\.status = 'published'/);
    expect(body).toMatch(/p\.status = 'published'/);
    expect(body).toMatch(/s\.status = 'active'/);
    expect(body).toMatch(/has_learning_course_access\(c\.id\)/);
  });

  it("4) entitled learner published activity requires full chain incl. lesson", () => {
    const body = policyBody(sql, "Entitled learners read published activities");
    expect(body).toMatch(/on public\.learning_activities for select/);
    expect(body).toMatch(/les\.status = 'published'/);
    expect(body).toMatch(/sec\.status = 'published'/);
    expect(body).toMatch(/c\.status = 'published'/);
    expect(body).toMatch(/p\.status = 'published'/);
    expect(body).toMatch(/s\.status = 'active'/);
    expect(body).toMatch(/has_learning_course_access\(c\.id\)/);
  });

  it("5/6) learner course-tree path never substitutes is_learning_space_member", () => {
    for (const name of [
      "Entitled learners read published courses",
      "Entitled learners read published sections",
      "Entitled learners read published lessons",
      "Entitled learners read published activities",
    ]) {
      const body = stripSqlComments(policyBody(sql, name));
      expect(body).not.toMatch(/is_learning_space_member/);
    }
    expect(LEARNING_READ_MODEL_ACCESS_HELPERS.course).toBe(
      "has_learning_course_access"
    );
    expect(code).toMatch(/has_learning_course_access/);
  });

  it("7) program enrollment inheritance remains via has_learning_course_access helper", () => {
    // Hardening calls the helper; Progress migration owns the program-enrollment
    // expansion body. Contract: this slice must use the helper, not reimplement.
    const progress = read(PROGRESS_MIGRATION);
    expect(progress).toMatch(
      /create or replace function public\.has_learning_course_access/
    );
    expect(progress).toMatch(/e\.program_id = c\.program_id/);
    expect(code).toMatch(/has_learning_course_access/);
    expect(code).not.toMatch(
      /from public\.learning_enrollments e[\s\S]*e\.course_id/
    );
  });

  it("8) entitled policies do not require is_learning_space_member (enrolled non-member OK)", () => {
    const courseTreeEntitled = LEARNING_READ_MODEL_ENTITLED_POLICIES.filter(
      (p) => !p.includes("program settings")
    );
    for (const name of courseTreeEntitled) {
      const body = stripSqlComments(policyBody(sql, name));
      expect(body).not.toMatch(/is_learning_space_member/);
      expect(body).toMatch(/has_learning_course_access/);
    }
  });

  it("9) draft parent blocks learner child reads (chain status checks present)", () => {
    const lesson = policyBody(sql, "Entitled learners read published lessons");
    expect(lesson).toMatch(/sec\.status = 'published'/);
    expect(lesson).toMatch(/c\.status = 'published'/);
    expect(lesson).toMatch(/p\.status = 'published'/);
    const activity = policyBody(
      sql,
      "Entitled learners read published activities"
    );
    expect(activity).toMatch(/les\.status = 'published'/);
    expect(activity).toMatch(/sec\.status = 'published'/);
  });
});

describe("Read Model Hardening V1 — settings tightening", () => {
  const sql = read(MIGRATION);

  it("creates entitled + staff settings policies for all five settings tables", () => {
    expect([...LEARNING_READ_MODEL_SETTINGS_TABLES]).toEqual([
      "learning_program_settings",
      "learning_course_settings",
      "learning_section_settings",
      "learning_lesson_settings",
      "learning_activity_settings",
    ]);
    for (const name of [
      "Entitled learners read published course settings",
      "Entitled learners read published section settings",
      "Entitled learners read published lesson settings",
      "Entitled learners read published activity settings",
      "Entitled learners read published program settings",
      "Staff read course settings",
      "Staff read section settings",
      "Staff read lesson settings",
      "Staff read activity settings",
      "Staff read program settings",
    ]) {
      expect(sql).toMatch(new RegExp(`create policy "${name}"`, "i"));
    }
  });

  it("6) settings entitled paths do not grant plain space members", () => {
    for (const name of [
      "Entitled learners read published course settings",
      "Entitled learners read published section settings",
      "Entitled learners read published lesson settings",
      "Entitled learners read published activity settings",
      "Entitled learners read published program settings",
    ]) {
      const body = stripSqlComments(policyBody(sql, name));
      expect(body).not.toMatch(/is_learning_space_member/);
    }
  });

  it("program settings entitled path uses has_learning_program_access", () => {
    const body = policyBody(
      sql,
      "Entitled learners read published program settings"
    );
    expect(body).toMatch(/has_learning_program_access\(p\.id\)/);
    expect(body).toMatch(/p\.status = 'published'/);
    expect(body).toMatch(/s\.status = 'active'/);
    expect(LEARNING_READ_MODEL_ACCESS_HELPERS.program).toBe(
      "has_learning_program_access"
    );
  });
});

describe("Read Model Hardening V1 — staff / public / activities anon", () => {
  const sql = read(MIGRATION);

  it("10) adds staff scoped policies so instructors retain in-scope reads", () => {
    for (const name of LEARNING_READ_MODEL_STAFF_POLICIES) {
      expect(sql).toMatch(new RegExp(`create policy "${name}"`, "i"));
    }
    const coursesStaff = policyBody(sql, "Course staff read scoped courses");
    expect(coursesStaff).toMatch(/is_learning_course_staff/);
    expect(coursesStaff).toMatch(/can_manage_learning_course/);
  });

  it("11) public discovery policies remain in foundation migrations (untouched here)", () => {
    for (const name of LEARNING_READ_MODEL_PUBLIC_DISCOVERY_POLICIES) {
      expect(sql).not.toMatch(
        new RegExp(`drop policy if exists "${name}"`, "i")
      );
    }
    expect(read(PROGRAMS_MIGRATION)).toMatch(
      /Public read published public programs/
    );
    expect(read(COURSES_MIGRATION)).toMatch(
      /Public read published public courses/
    );
    expect(read(SECTIONS_MIGRATION)).toMatch(
      /Public read published public sections/
    );
    expect(read(LESSONS_MIGRATION)).toMatch(
      /Public read published public lessons/
    );
  });

  it("12) activities hardening does not add anon SELECT", () => {
    const activityPolicies = [
      "Entitled learners read published activities",
      "Course staff read scoped activities",
    ];
    for (const name of activityPolicies) {
      const body = policyBody(sql, name);
      expect(body).toMatch(/to authenticated/);
      expect(body).not.toMatch(/to anon/);
      expect(body).not.toMatch(/to anon, authenticated/);
    }
    const activitiesFoundation = read(ACTIVITIES_MIGRATION);
    expect(activitiesFoundation).toMatch(
      /grant select on table public\.learning_activities to authenticated/
    );
    expect(activitiesFoundation).toMatch(
      /revoke all on table public\.learning_activities[\s\S]*from public, anon, authenticated/
    );
    // No public discovery policy for activities in foundation or hardening.
    expect(sql).not.toMatch(/Public read.*activities/i);
    expect(activitiesFoundation).not.toMatch(
      /Public read published public activities/
    );
  });
});

describe("Read Model Hardening V1 — prior slices unchanged", () => {
  it("13) does not rewrite Questions / content blocks / attempts / scoring / progress", () => {
    const hardening = stripSqlComments(read(MIGRATION));
    expect(hardening).not.toMatch(/learning_questions/);
    expect(hardening).not.toMatch(/learning_question_answer_keys/);
    expect(hardening).not.toMatch(/learning_lesson_content_blocks/);
    expect(hardening).not.toMatch(/learning_attempts/);
    expect(hardening).not.toMatch(/learning_attempt_answers/);
    expect(hardening).not.toMatch(/learning_attempt_results/);
    expect(hardening).not.toMatch(/learning_lesson_progress/);
    expect(hardening).not.toMatch(/learning_course_progress/);
    expect(hardening).not.toMatch(/score_learning_attempt/);
    expect(hardening).not.toMatch(/start_learning_attempt/);

    // Prior files still exist with their known policy anchors.
    expect(read(QUESTIONS_MIGRATION)).toMatch(
      /Course staff read scoped questions/
    );
    expect(read(CONTENT_BLOCKS_MIGRATION)).toMatch(
      /Entitled learners read published content blocks/
    );
    expect(read(ATTEMPTS_MIGRATION)).toMatch(/has_learning_course_access/);
    expect(read(SCORING_MIGRATION)).toMatch(/score_learning_attempt/);
    expect(read(PROGRESS_MIGRATION)).toMatch(/has_learning_course_access/);
  });

  it("documents the hardening contract", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/has_learning_course_access/);
    expect(doc).toMatch(/Space members read accessible programs/);
    expect(doc).toMatch(/20260840/);
  });
});
