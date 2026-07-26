import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_PROJECT_RPCS,
  LEARNING_PROJECT_ROUTES,
  loadMyProject,
  sanitizeProjectError,
} from "./projectsFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/projectsFoundation.ts"),
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
const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const SUBMISSION_ID = "44444444-4444-4444-8444-444444444444";

describe("Projects Foundation — files", () => {
  it("ships readiness migration and adapter", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(existsSync(join(ROOT, "lib/learning/projectsFoundation.ts"))).toBe(
      true
    );
  });
});

describe("Projects Foundation — SQL", () => {
  const sql = read(MIGRATION);

  it("creates project tables", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_project_specs/
    );
    expect(sql).toMatch(
      /create table if not exists public\.learning_project_submissions/
    );
    expect(sql).toMatch(
      /create table if not exists public\.learning_project_reviews/
    );
  });

  it("exposes project RPCs matching constants", () => {
    for (const name of Object.values(LEARNING_PROJECT_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("learner get is owner-scoped; revokes anon", () => {
    const fn = stripSqlComments(fnBody(sql, "get_my_learning_project"));
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/has_learning_course_access/);
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_project\(uuid\)\s+from public, anon/
    );
  });
});

describe("Projects Foundation — adapter", () => {
  it("builds learner and instructor review routes", () => {
    expect(LEARNING_PROJECT_ROUTES.learner(ACTIVITY_ID)).toBe(
      `/learning/activities/${ACTIVITY_ID}/project`
    );
    expect(LEARNING_PROJECT_ROUTES.review(COURSE_ID, SUBMISSION_ID)).toBe(
      `/learning/instructor/courses/${COURSE_ID}/projects/${SUBMISSION_ID}`
    );
  });

  it("loads via RPC only and sanitizes errors", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return {
          data: {
            activity_id: ACTIVITY_ID,
            activity_name: "Capstone",
            instructions: "Build it",
            submission: null,
            review: null,
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect((await loadMyProject(fake as never, ACTIVITY_ID)).ok).toBe(true);
    expect(calls).toEqual(["get_my_learning_project"]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(
      sanitizeProjectError("Not entitled to this course")
    ).toMatch(/not allowed/i);
  });
});
