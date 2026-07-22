import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_COURSE_AI_KEYS,
  LEARNING_COURSE_BRANDING_KEYS,
  LEARNING_COURSE_DIFFICULTIES,
  LEARNING_COURSE_HELPERS,
  LEARNING_COURSE_METADATA_LIMITS,
  LEARNING_COURSE_METADATA_MAX_BYTES,
  LEARNING_COURSE_RPCS,
  LEARNING_COURSE_SEO_KEYS,
  LEARNING_COURSE_STAFF_ROLES,
  LEARNING_COURSE_STAFF_ROLE_RANKS,
  LEARNING_COURSE_STATUSES,
  LEARNING_COURSE_VISIBILITIES,
  learningCourseStaffRoleRank,
} from "./coursesFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260830_learning_courses_foundation_v1.sql";
const DOC = "docs/learning/implementation/COURSES_FOUNDATION_V1.md";
const PROGRAMS_MIGRATION =
  "supabase/migrations/20260829_learning_programs_foundation_v1.sql";
const SPACES_MIGRATION =
  "supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Courses Foundation V1 — files", () => {
  it("ships migration, constants module, documentation, and depends on Programs+Spaces", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/coursesFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, PROGRAMS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SPACES_MIGRATION))).toBe(true);
  });
});

describe("Courses Foundation V1 — TS staff rank fail-closed", () => {
  it("ranks known staff roles and rejects unknown", () => {
    expect(learningCourseStaffRoleRank("lead_instructor")).toBe(80);
    expect(learningCourseStaffRoleRank("instructor")).toBe(60);
    expect(learningCourseStaffRoleRank("teaching_assistant")).toBe(50);
    expect(learningCourseStaffRoleRank("content_editor")).toBe(40);
    expect(learningCourseStaffRoleRank("owner")).toBeNull();
    expect(learningCourseStaffRoleRank("")).toBeNull();
    expect(LEARNING_COURSE_STAFF_ROLE_RANKS.lead_instructor).toBe(80);
  });
});

describe("Courses Foundation V1 — constants mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes statuses, visibility, difficulties, staff roles — no format column", () => {
    expect([...LEARNING_COURSE_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect([...LEARNING_COURSE_VISIBILITIES]).toEqual([
      "private",
      "unlisted",
      "public",
    ]);
    expect([...LEARNING_COURSE_DIFFICULTIES]).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert",
    ]);
    expect([...LEARNING_COURSE_STAFF_ROLES]).toEqual([
      "lead_instructor",
      "instructor",
      "teaching_assistant",
      "content_editor",
    ]);
    // Format stays on Program — no course format column/check.
    expect(sql).not.toMatch(/learning_courses_format_check/);
    expect(sql).toMatch(/NO course format column|Format lives on/i);
    expect(sql).toMatch(/position integer not null/);
    expect(sql).toMatch(/learning_courses_position_non_negative/);
  });

  it("names all client RPCs and helpers", () => {
    for (const name of Object.values(LEARNING_COURSE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(LEARNING_COURSE_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });

  it("documents foundation metadata keys", () => {
    expect([...LEARNING_COURSE_BRANDING_KEYS]).toEqual([
      "cover_url",
      "thumbnail_url",
      "intro_video_url",
      "logo_url",
    ]);
    expect([...LEARNING_COURSE_SEO_KEYS]).toEqual([
      "title",
      "description",
      "keywords",
    ]);
    expect([...LEARNING_COURSE_AI_KEYS]).toEqual([
      "skills",
      "outcomes",
      "tags",
    ]);
    expect(sql).toMatch(/branding_metadata/);
    expect(sql).toMatch(/seo_metadata/);
    expect(sql).toMatch(/ai_metadata/);
    expect(sql).toMatch(/ai_ready/);
    expect(sql).toMatch(/marketplace_ready/);
    expect(sql).toMatch(/certification_ready/);
    expect(sql).toMatch(/live_ready/);
  });
});

describe("Courses Foundation V1 — SQL contracts", () => {
  const sql = read(MIGRATION);

  it("scopes courses to one program with unique slug and RESTRICT delete", () => {
    expect(sql).toMatch(/learning_courses_program_slug_unique/);
    expect(sql).toMatch(
      /references public\.learning_programs \(id\) on delete restrict/
    );
  });

  it("does not introduce course ownership transfer", () => {
    expect(sql).not.toMatch(/transfer_learning_course_ownership/i);
    expect(sql).toMatch(/No course ownership transfer/i);
  });

  it("requires active parent space and draft|published parent program", () => {
    expect(sql).toMatch(
      /Learning space must be active for course changes/g
    );
    expect(
      (sql.match(/Learning space must be active for course changes/g) ?? [])
        .length
    ).toBeGreaterThanOrEqual(5);
    expect(sql).toMatch(/learning_course_require_parent_program_status/);
    expect(sql).toMatch(
      /Parent program must be draft or published for course changes/
    );
  });

  it("creates draft courses and publishes draft→published only", () => {
    expect(sql).toMatch(/'draft'/);
    expect(sql).toMatch(/Only draft courses can be published/);
    expect(sql).toMatch(/'course\.publish'/);
  });

  it("enforces staff must be active space members with teaching rank gates", () => {
    expect(sql).toMatch(/Staff must be an active space member/);
    expect(sql).toMatch(
      /Teaching staff require space instructor rank or higher/
    );
  });

  it("peer-protects lead instructor staff removal; space owner/admin overrides", () => {
    const removeStart = sql.indexOf(
      "create or replace function public.remove_learning_course_staff"
    );
    const removeEnd = sql.indexOf(
      "create or replace function public.publish_learning_course",
      removeStart
    );
    const removeFn = sql.slice(removeStart, removeEnd);
    expect(removeFn).toContain(
      "Cannot manage a peer or higher-ranked course staff member"
    );
    expect(removeFn).toMatch(/v_target_rank < v_actor_rank/);
    expect(removeFn).toMatch(/can_manage_learning_space/);
    expect(removeFn).toMatch(/Space owner\/admin overrides/);
  });

  it("gates public course reads without is_platform_admin on anon policy", () => {
    const policyStart = sql.indexOf(
      'create policy "Public read published public courses"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Space members read accessible courses"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/to anon, authenticated/);
    expect(policy).toMatch(/status = 'published'/);
    expect(policy).toMatch(/visibility = 'public'/);
    expect(policy).not.toMatch(/is_platform_admin/i);
    expect(policy).toMatch(/p\.status = 'published'/);
    expect(policy).toMatch(/p\.visibility = 'public'/);
    expect(policy).toMatch(/s\.status = 'active'/);
    expect(policy).toMatch(/s\.visibility = 'public'/);
  });

  it("FORCE RLS on courses and staff; clients cannot write", () => {
    expect(sql).toMatch(
      /alter table public\.learning_courses[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_course_staff[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_courses/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_course_staff/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_course_settings/
    );
  });

  it("audits course lifecycle, staff, and reorder via learning_audit_write", () => {
    expect(sql).toMatch(/'course\.create'/);
    expect(sql).toMatch(/'course\.update'/);
    expect(sql).toMatch(/'course\.staff_assign'/);
    expect(sql).toMatch(/'course\.staff_remove'/);
    expect(sql).toMatch(/'course\.archive'/);
    expect(sql).toMatch(/'course\.moderation'/);
    expect(sql).toMatch(/'course\.reorder'/);
  });

  it("platform moderate accepts suspended|published|archived only", () => {
    expect(sql).toMatch(
      /moderate_learning_course status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });

  it("grants RPCs to authenticated+service_role; validators stay internal", () => {
    expect(sql).toMatch(
      /grant execute on function public\.create_learning_course\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.reorder_learning_courses\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_course_validate_supported_languages\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
  });

  it("can_create allows space manage, program manage, or program staff ≥ instructor", () => {
    const createStart = sql.indexOf(
      "create or replace function public.can_create_learning_course"
    );
    const createEnd = sql.indexOf(
      "revoke all on function public.learning_course_staff_role_rank",
      createStart
    );
    const createFn = sql.slice(createStart, createEnd);
    expect(createFn).toMatch(/can_manage_learning_space/);
    expect(createFn).toMatch(/can_manage_learning_program/);
    expect(createFn).toMatch(/is_learning_program_staff/);
    expect(createFn).toMatch(
      /learning_program_staff_role_rank\([\s\S]*?'instructor'/
    );
  });

  it("settings default allow_self_enroll false and require_program_enrollment true", () => {
    expect(sql).toMatch(/allow_self_enroll boolean not null default false/);
    expect(sql).toMatch(
      /require_program_enrollment boolean not null default true/
    );
    expect(sql).toMatch(/public_syllabus boolean not null default false/);
  });

  it("reorder is transactional within program with non-negative positions", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_courses"
    );
    const reorderFn = sql.slice(reorderStart);
    expect(reorderFn).toMatch(/for update/);
    expect(reorderFn).toMatch(
      /requires all course ids for the program/
    );
    expect(reorderFn).toMatch(/course_ids must be unique/);
    expect(reorderFn).toMatch(/All course_ids must belong to the program/);
    expect(reorderFn).toMatch(/position = \(u\.ord::integer - 1\)/);
    expect(sql).toMatch(/position >= 0/);
  });
});

describe("Courses Foundation V1 — security & lifecycle hardening", () => {
  const sql = read(MIGRATION);

  it("revalidates active space membership for staff authority helpers", () => {
    const isStaffStart = sql.indexOf(
      "create or replace function public.is_learning_course_staff"
    );
    const isStaffEnd = sql.indexOf(
      "create or replace function public.learning_course_staff_role",
      isStaffStart
    );
    const isStaff = sql.slice(isStaffStart, isStaffEnd);
    expect(isStaff).toMatch(
      /is_learning_space_member\(p\.space_id, p_user_id\)/
    );
    expect(isStaff).toMatch(/active staff row alone is insufficient/);

    const roleStart = sql.indexOf(
      "create or replace function public.learning_course_staff_role"
    );
    const roleEnd = sql.indexOf(
      "create or replace function public.can_manage_learning_course",
      roleStart
    );
    const roleFn = sql.slice(roleStart, roleEnd);
    expect(roleFn).toMatch(
      /is_learning_space_member\(p\.space_id, p_user_id\)/
    );
    expect(roleFn).toMatch(
      /Returns null unless staff row is active AND space membership is active/
    );

    const manageStart = sql.indexOf(
      "create or replace function public.can_manage_learning_course"
    );
    const manageEnd = sql.indexOf(
      "create or replace function public.can_create_learning_course",
      manageStart
    );
    const manageFn = sql.slice(manageStart, manageEnd);
    expect(manageFn).toMatch(
      /role = 'lead_instructor'[\s\S]*?is_learning_space_member\(p\.space_id, p_user_id\)/
    );
  });

  it("stale active course staff row alone does not grant authority", () => {
    expect(sql).toMatch(
      /active staff row alone is insufficient[\s\S]*?is_learning_space_member/
    );
    expect(sql).toMatch(
      /Returns null unless staff row is active AND space membership is active/
    );
  });

  it("rejects metadata mutations on suspended or archived courses", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_course"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.assign_learning_course_staff",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toMatch(/learning_course_require_mutable_status/);
    expect(sql).toMatch(
      /Course is %; only platform moderation may change it/
    );
  });

  it("rejects staff assign/remove on suspended or archived courses", () => {
    const assignStart = sql.indexOf(
      "create or replace function public.assign_learning_course_staff"
    );
    const assignEnd = sql.indexOf(
      "create or replace function public.remove_learning_course_staff",
      assignStart
    );
    const assignFn = sql.slice(assignStart, assignEnd);
    expect(assignFn).toMatch(/learning_course_require_mutable_status/);

    const removeStart = sql.indexOf(
      "create or replace function public.remove_learning_course_staff"
    );
    const removeEnd = sql.indexOf(
      "create or replace function public.publish_learning_course",
      removeStart
    );
    const removeFn = sql.slice(removeStart, removeEnd);
    expect(removeFn).toMatch(/learning_course_require_mutable_status/);
  });

  it("blocks owner/lead archive while suspended (platform moderate only)", () => {
    const archiveStart = sql.indexOf(
      "create or replace function public.archive_learning_course"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_course",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(
      /Course is suspended; only platform moderation may change it/
    );
  });

  it("auto-assigns lead_instructor for non-manager creators", () => {
    const createStart = sql.indexOf(
      "create or replace function public.create_learning_course"
    );
    const createEnd = sql.indexOf(
      "create or replace function public.update_learning_course",
      createStart
    );
    const createFn = sql.slice(createStart, createEnd);
    expect(createFn).toMatch(/can_manage_learning_space/);
    expect(createFn).toMatch(/can_manage_learning_program/);
    expect(createFn).toMatch(/'lead_instructor'/);
    expect(createFn).toMatch(/Non-manager creators/);
  });

  it("enforces JSON metadata size, allowlists, and shallow shapes", () => {
    expect(sql).toMatch(/v_max_bytes integer := 8192/);
    expect(sql).toMatch(/octet_length\(p_value::text\) > v_max_bytes/);
    expect(sql).toMatch(/% exceeds maximum size of % bytes/);
    expect(sql).toMatch(/% contains unexpected key: %/);
    expect(sql).toMatch(/cover_url/);
    expect(sql).toMatch(/intro_video_url/);
    expect(LEARNING_COURSE_METADATA_MAX_BYTES).toBe(8192);
    expect(LEARNING_COURSE_METADATA_LIMITS.brandingUrlMaxChars).toBe(2048);
    expect(LEARNING_COURSE_METADATA_LIMITS.aiArrayMaxItems).toBe(64);
    expect([...LEARNING_COURSE_BRANDING_KEYS]).toContain("logo_url");
    expect([...LEARNING_COURSE_SEO_KEYS]).toContain("keywords");
    expect([...LEARNING_COURSE_AI_KEYS]).toContain("skills");
  });

  it("normalizes lifecycle timestamps on publish/suspend/archive/recover", () => {
    const publishStart = sql.indexOf(
      "create or replace function public.publish_learning_course"
    );
    const publishEnd = sql.indexOf(
      "create or replace function public.archive_learning_course",
      publishStart
    );
    const publishFn = sql.slice(publishStart, publishEnd);
    expect(publishFn).toMatch(/suspended_at = null/);
    expect(publishFn).toMatch(/archived_at = null/);

    const moderateStart = sql.indexOf(
      "create or replace function public.moderate_learning_course"
    );
    const moderateEnd = sql.indexOf(
      "create or replace function public.reorder_learning_courses",
      moderateStart
    );
    const moderateFn = sql.slice(moderateStart, moderateEnd);
    expect(moderateFn).toMatch(
      /status = 'suspended'[\s\S]*?suspended_at = now\(\)[\s\S]*?archived_at = null/
    );
    expect(moderateFn).toMatch(
      /status = 'published'[\s\S]*?suspended_at = null[\s\S]*?archived_at = null/
    );
    expect(moderateFn).toMatch(
      /status = 'archived'[\s\S]*?archived_at = coalesce[\s\S]*?suspended_at = null/
    );

    const archiveStart = sql.indexOf(
      "create or replace function public.archive_learning_course"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_course",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(/archived_at = now\(\)/);
    expect(archiveFn).toMatch(/suspended_at = null/);
  });
});

describe("Courses Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, exclusions, and next slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Courses Foundation V1/i);
    expect(doc).toMatch(/learning_courses/);
    expect(doc).toMatch(/Space → Program → Course|Space -> Program -> Course/);
    expect(doc).toMatch(/Does not include|exclusions|out of scope/i);
    expect(doc).toMatch(/No course ownership transfer/i);
    expect(doc).toMatch(/format stays on Program|NO course format/i);
    expect(doc).toMatch(/reorder_learning_courses/);
  });
});
