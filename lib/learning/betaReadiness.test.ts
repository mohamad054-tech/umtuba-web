import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260860_learning_beta_readiness_auth_alignment_v1.sql";
const AUDIT = "docs/learning/implementation/LEARNING_ARCHITECTURE_AUDIT_BETA_V1.md";
const REPORT = "docs/learning/implementation/LEARNING_BETA_READINESS_REPORT_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

describe("Learning Beta Readiness V1 — deliverables", () => {
  it("ships auth-alignment migration and readiness docs", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, AUDIT))).toBe(true);
    expect(existsSync(join(ROOT, REPORT))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260860_learning_beta_readiness_auth_alignment_v1.sql"
    );
  });
});

describe("Learning Beta Readiness V1 — auth alignment SQL", () => {
  const sql = stripSqlComments(read(MIGRATION));

  it("introduces shared learning_course_space_id and aliases wrappers", () => {
    expect(sql).toMatch(/create or replace function public\.learning_course_space_id/);
    expect(sql).toMatch(
      /learning_community_course_space_id[\s\S]*learning_course_space_id/
    );
    expect(sql).toMatch(
      /learning_live_course_space_id[\s\S]*learning_course_space_id/
    );
  });

  it("aligns community access to include course staff like live", () => {
    expect(sql).toMatch(/learning_community_assert_access/);
    expect(sql).toMatch(/is_learning_course_staff\(p_course_id, p_user_id\)/);
    expect(sql).toMatch(/has_learning_course_access\(p_course_id, p_user_id\)/);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/security definer/);
  });
});

describe("Learning Beta Readiness V1 — stack inventory sanity", () => {
  it("keeps learning migrations contiguous through 60860", () => {
    const names = readdirSync(join(ROOT, "supabase/migrations")).filter((n) =>
      n.includes("learning_")
    );
    expect(names).toContain(
      "20260828_learning_spaces_membership_foundation_v1.sql"
    );
    expect(names).toContain(
      "20260859_learning_live_calendar_foundation_v1.sql"
    );
    expect(names).toContain(
      "20260860_learning_beta_readiness_auth_alignment_v1.sql"
    );
  });

  it("notification allowlist in latest live migration includes community + live types", () => {
    const live = read(
      "supabase/migrations/20260859_learning_live_calendar_foundation_v1.sql"
    );
    expect(live).toMatch(/learning_announcement_posted/);
    expect(live).toMatch(/learning_live_session_scheduled/);
    const ts = read("lib/supabase/notifications.ts");
    expect(ts).toMatch(/learning_live_session_cancelled/);
    expect(ts).toMatch(/learning_qa_answered/);
  });
});
