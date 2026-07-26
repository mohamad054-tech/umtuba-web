import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_LAB_RPCS,
  LEARNING_LAB_ROUTES,
  loadMyLab,
  sanitizeLabError,
} from "./labsFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const SRC = readFileSync(join(ROOT, "lib/learning/labsFoundation.ts"), "utf8");

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

describe("Labs Foundation — files", () => {
  it("ships readiness migration and adapter", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(existsSync(join(ROOT, "lib/learning/labsFoundation.ts"))).toBe(true);
  });
});

describe("Labs Foundation — SQL", () => {
  const sql = read(MIGRATION);

  it("creates lab tables", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_lab_specs/
    );
    expect(sql).toMatch(
      /create table if not exists public\.learning_lab_completions/
    );
  });

  it("exposes lab RPCs matching constants", () => {
    for (const name of Object.values(LEARNING_LAB_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("complete is owner-scoped; revokes anon", () => {
    const fn = stripSqlComments(fnBody(sql, "complete_my_learning_lab"));
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(
      /revoke all on function public\.get_my_learning_lab\(uuid\)\s+from public, anon/
    );
  });
});

describe("Labs Foundation — adapter", () => {
  it("builds learner lab route", () => {
    expect(LEARNING_LAB_ROUTES.learner(ACTIVITY_ID)).toBe(
      `/learning/activities/${ACTIVITY_ID}/lab`
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
            activity_name: "Shell Lab",
            instructions: "Run steps",
            starter_files: [],
            resources: [],
            validation_hook: null,
            completion: null,
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect((await loadMyLab(fake as never, ACTIVITY_ID)).ok).toBe(true);
    expect(calls).toEqual(["get_my_learning_lab"]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(sanitizeLabError("Authentication required")).toMatch(/not allowed/i);
  });
});
