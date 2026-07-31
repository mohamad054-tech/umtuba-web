import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LEARNING_LESSON_ENGINE_RPCS } from "./lessonEngineFoundation";
import { LEARNING_PROJECT_RPCS } from "./projectsFoundation";
import { LEARNING_LAB_RPCS } from "./labsFoundation";
import { LEARNING_COURSE_RESOURCE_RPCS } from "./courseResourcesFoundation";
import { LEARNING_LESSON_UNLOCK_RPCS } from "./lessonUnlockFoundation";
import { LEARNING_AI_TUTOR_RPCS } from "./aiTutorFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const PROJECT_REVIEW_MIGRATION =
  "supabase/migrations/20260864_learning_project_instructor_review_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

describe("First Course Readiness V1 — migration presence", () => {
  it("ships 20260863 + project instructor review migration", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROJECT_REVIEW_MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260864_learning_project_instructor_review_v1.sql");
  });
});

describe("First Course Readiness V1 — tables & functions", () => {
  const sql = `${read(MIGRATION)}\n${read(PROJECT_REVIEW_MIGRATION)}`;
  const body = stripSqlComments(sql);

  it("creates major domain tables", () => {
    for (const table of [
      "learning_lesson_objectives",
      "learning_lesson_prerequisites",
      "learning_section_progress",
      "learning_course_resources",
      "learning_course_resource_downloads",
      "learning_project_specs",
      "learning_project_submissions",
      "learning_project_reviews",
      "learning_lab_specs",
      "learning_lab_completions",
      "learning_lesson_point_costs",
      "learning_lesson_unlocks",
      "learning_ai_tutor_threads",
      "learning_ai_tutor_messages",
    ]) {
      expect(sql).toMatch(
        new RegExp(`create table if not exists public\\.${table}`)
      );
    }
  });

  it("defines major learner/instructor functions", () => {
    const tutorRpcs = Object.values(LEARNING_AI_TUTOR_RPCS).filter(
      (name) =>
        name !== LEARNING_AI_TUTOR_RPCS.appendExchange &&
        name !== LEARNING_AI_TUTOR_RPCS.getThread
    );
    const names = [
      ...Object.values(LEARNING_LESSON_ENGINE_RPCS),
      ...Object.values(LEARNING_PROJECT_RPCS),
      ...Object.values(LEARNING_LAB_RPCS),
      ...Object.values(LEARNING_COURSE_RESOURCE_RPCS),
      ...Object.values(LEARNING_LESSON_UNLOCK_RPCS),
      ...tutorRpcs,
      "recompute_learning_section_progress",
      "get_my_learning_section_progress",
      "set_learning_lesson_objectives",
      "set_learning_lesson_prerequisites",
    ];
    for (const name of new Set(names)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("grants authenticated and revokes anon on key RPCs", () => {
    for (const name of [
      "get_my_learning_lesson_engine",
      "get_my_learning_course_progress_bundle",
      "get_my_learning_project",
      "get_my_learning_lab",
      "list_my_learning_course_resources",
      "unlock_my_learning_lesson_with_um_points",
      "create_my_learning_ai_tutor_thread",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}[\\s\\S]*?from public, anon`
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}[\\s\\S]*?to authenticated`
        )
      );
    }
  });

  it("keeps additive scope (no Discover/Ads/Games; no ledger CHECK rewrite)", () => {
    expect(body).not.toMatch(/\bdiscover\b|\bads?\b|\bgames?\b/i);
    expect(body).not.toMatch(/um_points_ledger_points_positive/);
    expect(body).not.toMatch(/\bopenai\b|\banthropic\b/i);
  });
});
