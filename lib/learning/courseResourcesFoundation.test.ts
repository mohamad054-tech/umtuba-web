import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_COURSE_RESOURCE_KINDS,
  LEARNING_COURSE_RESOURCE_RPCS,
  LEARNING_COURSE_RESOURCE_ROUTES,
  listMyCourseResources,
  sanitizeCourseResourceError,
} from "./courseResourcesFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260863_learning_first_course_readiness_v1.sql";
const SRC = readFileSync(
  join(ROOT, "lib/learning/courseResourcesFoundation.ts"),
  "utf8"
);

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

const COURSE_ID = "11111111-1111-4111-8111-111111111111";

describe("Course Resources Foundation — files", () => {
  it("ships readiness migration and adapter", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      readdirSync(join(ROOT, "supabase/migrations"))
    ).toContain("20260863_learning_first_course_readiness_v1.sql");
    expect(
      existsSync(join(ROOT, "lib/learning/courseResourcesFoundation.ts"))
    ).toBe(true);
  });
});

describe("Course Resources Foundation — SQL", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("creates resources + downloads tables with kind allowlist", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_course_resources/
    );
    expect(sql).toMatch(
      /create table if not exists public\.learning_course_resource_downloads/
    );
    expect([...LEARNING_COURSE_RESOURCE_KINDS]).toEqual([
      "pdf",
      "zip",
      "image",
      "external_link",
      "other",
    ]);
    expect(body).toMatch(
      /resource_kind in \('pdf', 'zip', 'image', 'external_link', 'other'\)/
    );
  });

  it("exposes resource RPCs matching constants", () => {
    for (const name of Object.values(LEARNING_COURSE_RESOURCE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`)
      );
    }
  });

  it("revokes anon on list_my_learning_course_resources", () => {
    expect(sql).toMatch(
      /revoke all on function public\.list_my_learning_course_resources\(uuid\)\s+from public, anon/
    );
  });
});

describe("Course Resources Foundation — adapter", () => {
  it("builds learner resources route", () => {
    expect(LEARNING_COURSE_RESOURCE_ROUTES.learner(COURSE_ID)).toBe(
      `/learning/courses/${COURSE_ID}/resources`
    );
  });

  it("lists via RPC only and sanitizes errors", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string) => {
        calls.push(name);
        return { data: { resources: [] }, error: null };
      },
      from: () => {
        throw new Error("no select");
      },
    };
    expect((await listMyCourseResources(fake as never, COURSE_ID)).ok).toBe(
      true
    );
    expect(calls).toEqual(["list_my_learning_course_resources"]);
    expect(SRC).not.toMatch(/\.from\(/);
    expect(
      sanitizeCourseResourceError("Not allowed to manage this course")
    ).toMatch(/not allowed/i);
  });
});
