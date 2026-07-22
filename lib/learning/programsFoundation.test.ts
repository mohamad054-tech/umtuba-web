import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_PROGRAM_AI_KEYS,
  LEARNING_PROGRAM_BRANDING_KEYS,
  LEARNING_PROGRAM_DIFFICULTIES,
  LEARNING_PROGRAM_FORMATS,
  LEARNING_PROGRAM_HELPERS,
  LEARNING_PROGRAM_METADATA_LIMITS,
  LEARNING_PROGRAM_METADATA_MAX_BYTES,
  LEARNING_PROGRAM_RPCS,
  LEARNING_PROGRAM_SEO_KEYS,
  LEARNING_PROGRAM_STAFF_ROLES,
  LEARNING_PROGRAM_STAFF_ROLE_RANKS,
  LEARNING_PROGRAM_STATUSES,
  LEARNING_PROGRAM_VISIBILITIES,
  learningProgramStaffRoleRank,
} from "./programsFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260829_learning_programs_foundation_v1.sql";
const DOC = "docs/learning/implementation/PROGRAMS_FOUNDATION_V1.md";
const SPACES_MIGRATION =
  "supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Programs Foundation V1 — files", () => {
  it("ships migration, constants module, documentation, and depends on Spaces", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/programsFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, SPACES_MIGRATION))).toBe(true);
  });
});

describe("Programs Foundation V1 — TS staff rank fail-closed", () => {
  it("ranks known staff roles and rejects unknown", () => {
    expect(learningProgramStaffRoleRank("lead_instructor")).toBe(80);
    expect(learningProgramStaffRoleRank("instructor")).toBe(60);
    expect(learningProgramStaffRoleRank("teaching_assistant")).toBe(50);
    expect(learningProgramStaffRoleRank("content_editor")).toBe(40);
    expect(learningProgramStaffRoleRank("owner")).toBeNull();
    expect(learningProgramStaffRoleRank("")).toBeNull();
    expect(LEARNING_PROGRAM_STAFF_ROLE_RANKS.lead_instructor).toBe(80);
  });
});

describe("Programs Foundation V1 — constants mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes formats, statuses, visibility, difficulties, staff roles", () => {
    expect([...LEARNING_PROGRAM_FORMATS]).toEqual([
      "self_paced",
      "cohort",
      "live_group",
      "tutoring_1to1",
      "hybrid",
    ]);
    expect([...LEARNING_PROGRAM_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect([...LEARNING_PROGRAM_VISIBILITIES]).toEqual([
      "private",
      "unlisted",
      "public",
    ]);
    expect([...LEARNING_PROGRAM_DIFFICULTIES]).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert",
    ]);
    expect([...LEARNING_PROGRAM_STAFF_ROLES]).toEqual([
      "lead_instructor",
      "instructor",
      "teaching_assistant",
      "content_editor",
    ]);
    for (const format of LEARNING_PROGRAM_FORMATS) {
      expect(sql).toContain(`'${format}'`);
    }
  });

  it("names all client RPCs and helpers", () => {
    for (const name of Object.values(LEARNING_PROGRAM_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(LEARNING_PROGRAM_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });

  it("documents foundation metadata keys", () => {
    expect([...LEARNING_PROGRAM_BRANDING_KEYS]).toEqual([
      "cover_url",
      "thumbnail_url",
      "intro_video_url",
      "logo_url",
    ]);
    expect([...LEARNING_PROGRAM_SEO_KEYS]).toEqual([
      "title",
      "description",
      "keywords",
    ]);
    expect([...LEARNING_PROGRAM_AI_KEYS]).toEqual([
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

describe("Programs Foundation V1 — SQL contracts", () => {
  const sql = read(MIGRATION);

  it("requires active parent space for program mutations", () => {
    expect(sql).toMatch(
      /Learning space must be active for program changes/g
    );
    expect(
      (sql.match(/Learning space must be active for program changes/g) ?? [])
        .length
    ).toBeGreaterThanOrEqual(5);
  });

  it("creates draft programs and publishes draft→published only", () => {
    expect(sql).toMatch(/'draft'/);
    expect(sql).toMatch(/Only draft programs can be published/);
    expect(sql).toMatch(/'program\.publish'/);
  });

  it("scopes programs to one space with unique slug per space", () => {
    expect(sql).toMatch(/learning_programs_space_slug_unique/);
    expect(sql).toMatch(/references public\.learning_spaces \(id\) on delete restrict/);
  });

  it("does not introduce program ownership transfer", () => {
    expect(sql).not.toMatch(/transfer_learning_program_ownership/i);
    expect(sql).toMatch(/No program ownership transfer/);
  });

  it("enforces staff must be active space members", () => {
    expect(sql).toMatch(/Staff must be an active space member/);
    expect(sql).toMatch(
      /Teaching staff require space instructor rank or higher/
    );
  });

  it("peer-protects lead instructor staff removal", () => {
    const removeStart = sql.indexOf(
      "create or replace function public.remove_learning_program_staff"
    );
    const removeEnd = sql.indexOf(
      "create or replace function public.publish_learning_program",
      removeStart
    );
    const removeFn = sql.slice(removeStart, removeEnd);
    expect(removeFn).toContain(
      "Cannot manage a peer or higher-ranked program staff member"
    );
    expect(removeFn).toMatch(/v_target_rank < v_actor_rank/);
  });

  it("gates public program reads without is_platform_admin on anon policy", () => {
    const policyStart = sql.indexOf(
      'create policy "Public read published public programs"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Space members read accessible programs"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/to anon, authenticated/);
    expect(policy).toMatch(/status = 'published'/);
    expect(policy).toMatch(/visibility = 'public'/);
    expect(policy).not.toMatch(/is_platform_admin/i);
    expect(policy).toMatch(/s\.status = 'active'/);
    expect(policy).toMatch(/s\.visibility = 'public'/);
  });

  it("FORCE RLS on programs and staff; clients cannot write", () => {
    expect(sql).toMatch(
      /alter table public\.learning_programs[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_program_staff[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_programs/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_program_staff/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_program_settings/
    );
  });

  it("audits program lifecycle and staff actions via learning_audit_write", () => {
    expect(sql).toMatch(/'program\.create'/);
    expect(sql).toMatch(/'program\.update'/);
    expect(sql).toMatch(/'program\.staff_assign'/);
    expect(sql).toMatch(/'program\.staff_remove'/);
    expect(sql).toMatch(/'program\.archive'/);
    expect(sql).toMatch(/'program\.moderation'/);
  });

  it("platform moderate accepts suspended|published|archived only", () => {
    expect(sql).toMatch(
      /moderate_learning_program status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });

  it("grants RPCs to authenticated+service_role; validators stay internal", () => {
    expect(sql).toMatch(
      /grant execute on function public\.create_learning_program\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_program_validate_supported_languages\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
  });

  it("can_create allows space managers or instructor+", () => {
    expect(sql).toMatch(/can_create_learning_program/);
    expect(sql).toMatch(
      /learning_space_role_at_least\([\s\S]*?'instructor'/
    );
  });
});

describe("Programs Foundation V1 — security & lifecycle hardening", () => {
  const sql = read(MIGRATION);

  it("revalidates active space membership for staff authority helpers", () => {
    const isStaffStart = sql.indexOf(
      "create or replace function public.is_learning_program_staff"
    );
    const isStaffEnd = sql.indexOf(
      "create or replace function public.learning_program_staff_role",
      isStaffStart
    );
    const isStaff = sql.slice(isStaffStart, isStaffEnd);
    expect(isStaff).toMatch(/is_learning_space_member\(p\.space_id, p_user_id\)/);
    expect(isStaff).toMatch(/active staff row alone is insufficient/);

    const roleStart = sql.indexOf(
      "create or replace function public.learning_program_staff_role"
    );
    const roleEnd = sql.indexOf(
      "create or replace function public.can_manage_learning_program",
      roleStart
    );
    const roleFn = sql.slice(roleStart, roleEnd);
    expect(roleFn).toMatch(/is_learning_space_member\(p\.space_id, p_user_id\)/);

    const manageStart = sql.indexOf(
      "create or replace function public.can_manage_learning_program"
    );
    const manageEnd = sql.indexOf(
      "create or replace function public.can_create_learning_program",
      manageStart
    );
    const manageFn = sql.slice(manageStart, manageEnd);
    expect(manageFn).toMatch(
      /role = 'lead_instructor'[\s\S]*?is_learning_space_member\(p\.space_id, p_user_id\)/
    );
  });

  it("stale active program staff row alone does not grant authority", () => {
    expect(sql).toMatch(
      /active staff row alone is insufficient[\s\S]*?is_learning_space_member/
    );
    expect(sql).toMatch(
      /Returns null unless staff row is active AND space membership is active/
    );
  });

  it("rejects metadata mutations on suspended or archived programs", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_program"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.assign_learning_program_staff",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toMatch(/learning_program_require_mutable_status/);
    expect(sql).toMatch(
      /Program is %; only platform moderation may change it/
    );
  });

  it("rejects staff assign/remove on suspended or archived programs", () => {
    const assignStart = sql.indexOf(
      "create or replace function public.assign_learning_program_staff"
    );
    const assignEnd = sql.indexOf(
      "create or replace function public.remove_learning_program_staff",
      assignStart
    );
    const assignFn = sql.slice(assignStart, assignEnd);
    expect(assignFn).toMatch(/learning_program_require_mutable_status/);

    const removeStart = sql.indexOf(
      "create or replace function public.remove_learning_program_staff"
    );
    const removeEnd = sql.indexOf(
      "create or replace function public.publish_learning_program",
      removeStart
    );
    const removeFn = sql.slice(removeStart, removeEnd);
    expect(removeFn).toMatch(/learning_program_require_mutable_status/);
  });

  it("blocks owner/lead archive while suspended (platform moderate only)", () => {
    const archiveStart = sql.indexOf(
      "create or replace function public.archive_learning_program"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_program",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(
      /Program is suspended; only platform moderation may change it/
    );
  });

  it("enforces JSON metadata size, allowlists, and shallow shapes", () => {
    expect(sql).toMatch(/v_max_bytes integer := 8192/);
    expect(sql).toMatch(/octet_length\(p_value::text\) > v_max_bytes/);
    expect(sql).toMatch(/% exceeds maximum size of % bytes/);
    expect(sql).toMatch(/% contains unexpected key: %/);
    expect(sql).toMatch(/cover_url/);
    expect(sql).toMatch(/intro_video_url/);
    expect(LEARNING_PROGRAM_METADATA_MAX_BYTES).toBe(8192);
    expect(LEARNING_PROGRAM_METADATA_LIMITS.brandingUrlMaxChars).toBe(2048);
    expect(LEARNING_PROGRAM_METADATA_LIMITS.aiArrayMaxItems).toBe(64);
    expect([...LEARNING_PROGRAM_BRANDING_KEYS]).toContain("logo_url");
    expect([...LEARNING_PROGRAM_SEO_KEYS]).toContain("keywords");
    expect([...LEARNING_PROGRAM_AI_KEYS]).toContain("skills");
  });

  it("normalizes lifecycle timestamps on publish/suspend/archive/recover", () => {
    const publishStart = sql.indexOf(
      "create or replace function public.publish_learning_program"
    );
    const publishEnd = sql.indexOf(
      "create or replace function public.archive_learning_program",
      publishStart
    );
    const publishFn = sql.slice(publishStart, publishEnd);
    expect(publishFn).toMatch(/suspended_at = null/);
    expect(publishFn).toMatch(/archived_at = null/);

    const moderateStart = sql.indexOf(
      "create or replace function public.moderate_learning_program"
    );
    const moderateFn = sql.slice(moderateStart);
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
      "create or replace function public.archive_learning_program"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_program",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(/archived_at = now\(\)/);
    expect(archiveFn).toMatch(/suspended_at = null/);
  });
});

describe("Programs Foundation V1 — documentation", () => {
  it("documents scope, exclusions, and next slice Courses", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Programs Foundation V1/i);
    expect(doc).toMatch(/learning_programs/);
    expect(doc).toMatch(/Does not include|exclusions|out of scope/i);
    expect(doc).toMatch(/Courses/);
    expect(doc).toMatch(/No program ownership transfer/i);
  });
});
