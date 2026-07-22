import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_SECTION_AI_KEYS,
  LEARNING_SECTION_AUDIT_ACTIONS,
  LEARNING_SECTION_BRANDING_KEYS,
  LEARNING_SECTION_DIFFICULTIES,
  LEARNING_SECTION_HELPERS,
  LEARNING_SECTION_METADATA_LIMITS,
  LEARNING_SECTION_METADATA_MAX_BYTES,
  LEARNING_SECTION_RPCS,
  LEARNING_SECTION_SEO_KEYS,
  LEARNING_SECTION_SETTINGS_DEFAULTS,
  LEARNING_SECTION_STATUSES,
  LEARNING_SECTION_VISIBILITIES,
} from "./sectionsFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260831_learning_sections_foundation_v1.sql";
const DOC = "docs/learning/implementation/SECTIONS_FOUNDATION_V1.md";
const COURSES_MIGRATION =
  "supabase/migrations/20260830_learning_courses_foundation_v1.sql";
const PROGRAMS_MIGRATION =
  "supabase/migrations/20260829_learning_programs_foundation_v1.sql";
const SPACES_MIGRATION =
  "supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Sections Foundation V1 — files", () => {
  it("ships migration, constants module, documentation, and depends on Courses+Programs+Spaces", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/sectionsFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, COURSES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRAMS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SPACES_MIGRATION))).toBe(true);
  });

  it("is ordered after the Courses migration (20260831 > 20260830)", () => {
    expect(MIGRATION > COURSES_MIGRATION).toBe(true);
  });
});

describe("Sections Foundation V1 — constants mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes statuses, visibility, difficulties", () => {
    expect([...LEARNING_SECTION_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect([...LEARNING_SECTION_VISIBILITIES]).toEqual([
      "private",
      "unlisted",
      "public",
    ]);
    expect([...LEARNING_SECTION_DIFFICULTIES]).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert",
    ]);
    expect(sql).toMatch(/position integer not null/);
    expect(sql).toMatch(/learning_sections_position_non_negative/);
  });

  it("names all client RPCs and helpers", () => {
    for (const name of Object.values(LEARNING_SECTION_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(LEARNING_SECTION_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });

  it("documents foundation metadata keys and section-appropriate flags only", () => {
    expect([...LEARNING_SECTION_BRANDING_KEYS]).toEqual([
      "cover_url",
      "thumbnail_url",
      "intro_video_url",
      "logo_url",
    ]);
    expect([...LEARNING_SECTION_SEO_KEYS]).toEqual([
      "title",
      "description",
      "keywords",
    ]);
    expect([...LEARNING_SECTION_AI_KEYS]).toEqual([
      "skills",
      "outcomes",
      "tags",
    ]);
    expect(sql).toMatch(/branding_metadata/);
    expect(sql).toMatch(/seo_metadata/);
    expect(sql).toMatch(/ai_metadata/);
    expect(sql).toMatch(/ai_ready boolean not null default false/);
    expect(sql).toMatch(/live_ready boolean not null default false/);
  });

  it("does NOT include marketplace_ready or certification_ready (locked default)", () => {
    expect(sql).not.toMatch(/marketplace_ready/);
    expect(sql).not.toMatch(/certification_ready/);
  });
});

describe("Sections Foundation V1 — identity & schema contracts", () => {
  const sql = read(MIGRATION);

  it("scopes sections to one course with unique slug and RESTRICT delete", () => {
    expect(sql).toMatch(/learning_sections_course_slug_unique/);
    expect(sql).toMatch(
      /references public\.learning_courses \(id\) on delete restrict/
    );
  });

  it("declares course_id immutable and section is not a lesson", () => {
    expect(sql).toMatch(/course_id is immutable after creation/i);
    expect(sql).toMatch(/is NOT a lesson/i);
    expect(sql).toMatch(/Immutable parent course/i);
  });

  it("has a 3–64 kebab slug and 1–160 name like courses", () => {
    expect(sql).toMatch(/learning_sections_slug_format/);
    expect(sql).toMatch(/char_length\(slug\) between 3 and 64/);
    expect(sql).toMatch(/learning_sections_name_len/);
    expect(sql).toMatch(/char_length\(btrim\(name\)\) between 1 and 160/);
  });

  it("declares required indexes", () => {
    expect(sql).toMatch(/learning_sections_course_status_idx/);
    expect(sql).toMatch(
      /learning_sections_course_position_idx[\s\S]*?\(course_id, position, id\)/
    );
    expect(sql).toMatch(/learning_sections_status_visibility_idx/);
    expect(sql).toMatch(/learning_sections_created_by_idx/);
  });
});

describe("Sections Foundation V1 — authority inherits from Course (no staff table)", () => {
  const sql = read(MIGRATION);

  it("creates NO learning_section_staff table and NO staff-assignment RPCs", () => {
    expect(sql).not.toMatch(/learning_section_staff/);
    expect(sql).not.toMatch(/assign_learning_section_staff/);
    expect(sql).not.toMatch(/remove_learning_section_staff/);
  });

  it("can_manage_learning_section defers to platform admin or can_manage_learning_course", () => {
    const start = sql.indexOf(
      "create or replace function public.can_manage_learning_section"
    );
    const end = sql.indexOf(
      "create or replace function public.can_create_learning_section",
      start
    );
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/is_platform_admin\(p_user_id\)/);
    expect(fn).toMatch(/can_manage_learning_course\(sec\.course_id, p_user_id\)/);
  });

  it("can_create_learning_section allows course manage or course staff ≥ instructor", () => {
    const start = sql.indexOf(
      "create or replace function public.can_create_learning_section"
    );
    const end = sql.indexOf(
      "revoke all on function public.can_manage_learning_section",
      start
    );
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/can_manage_learning_course\(p_course_id, p_user_id\)/);
    expect(fn).toMatch(/is_learning_course_staff\(p_course_id, p_user_id\)/);
    expect(fn).toMatch(
      /learning_course_staff_role_rank\([\s\S]*?'instructor'/
    );
  });

  it("revalidates active space membership via course staff helpers (stale row cannot grant authority)", () => {
    // update RPC path uses is_learning_course_staff + learning_course_staff_role,
    // both of which revalidate active space membership in the courses migration.
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_section"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.publish_learning_section",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toMatch(/is_learning_course_staff\(v_section\.course_id/);
    expect(updateFn).toMatch(/learning_course_staff_role\(v_section\.course_id/);

    // The courses migration guarantees the revalidation semantics we rely on.
    const coursesSql = read(COURSES_MIGRATION);
    expect(coursesSql).toMatch(
      /active staff row alone is insufficient[\s\S]*?is_learning_space_member/
    );
  });
});

describe("Sections Foundation V1 — parent gates & lifecycle", () => {
  const sql = read(MIGRATION);

  it("requires active parent space and draft|published parent program AND course", () => {
    expect(
      (sql.match(/Learning space must be active for section changes/g) ?? [])
        .length
    ).toBeGreaterThanOrEqual(5);
    expect(sql).toMatch(/learning_section_require_parent_program_status/);
    expect(sql).toMatch(
      /Parent program must be draft or published for section changes/
    );
    expect(sql).toMatch(/learning_section_require_parent_course_status/);
    expect(sql).toMatch(
      /Parent course must be draft or published for section changes/
    );
  });

  it("creates draft sections and publishes draft→published only", () => {
    expect(sql).toMatch(/'draft'/);
    expect(sql).toMatch(/Only draft sections can be published/);
    expect(sql).toMatch(/'section\.publish'/);
  });

  it("rejects normal mutations on suspended/archived sections (moderate only)", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_section"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.publish_learning_section",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toMatch(/learning_section_require_mutable_status/);
    expect(sql).toMatch(/Section is %; only platform moderation may change it/);
  });

  it("blocks owner/lead archive while suspended (platform moderate only)", () => {
    const archiveStart = sql.indexOf(
      "create or replace function public.archive_learning_section"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_section",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(
      /Section is suspended; only platform moderation may change it/
    );
  });

  it("platform moderate accepts suspended|published|archived only", () => {
    expect(sql).toMatch(
      /moderate_learning_section status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });

  it("normalizes lifecycle timestamps on publish/archive/moderate", () => {
    const publishStart = sql.indexOf(
      "create or replace function public.publish_learning_section"
    );
    const publishEnd = sql.indexOf(
      "create or replace function public.archive_learning_section",
      publishStart
    );
    const publishFn = sql.slice(publishStart, publishEnd);
    expect(publishFn).toMatch(/suspended_at = null/);
    expect(publishFn).toMatch(/archived_at = null/);

    const moderateStart = sql.indexOf(
      "create or replace function public.moderate_learning_section"
    );
    const moderateEnd = sql.indexOf(
      "create or replace function public.reorder_learning_sections",
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
  });
});

describe("Sections Foundation V1 — ordering", () => {
  const sql = read(MIGRATION);

  it("reorder is transactional within course with non-negative positions and full unique set", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_sections"
    );
    const reorderFn = sql.slice(reorderStart);
    expect(reorderFn).toMatch(/for update/);
    expect(reorderFn).toMatch(/requires all section ids for the course/);
    expect(reorderFn).toMatch(/section_ids must be unique/);
    expect(reorderFn).toMatch(/All section_ids must belong to the course/);
    expect(reorderFn).toMatch(/position = \(u\.ord::integer - 1\)/);
    expect(reorderFn).toMatch(/Cannot reorder while a section is suspended or archived/);
    expect(sql).toMatch(/position >= 0/);
  });

  it("prevents unsafe cross-course reorder and cannot change course_id", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_sections"
    );
    const reorderFn = sql.slice(reorderStart);
    // Every targeted row is constrained to the requested course_id.
    expect(reorderFn).toMatch(/and sec\.course_id = p_course_id/);
    // No RPC assigns course_id anywhere in the migration.
    expect(sql).not.toMatch(/set\s+course_id\s*=/i);
  });

  it("appends new sections at max(position)+1", () => {
    const createStart = sql.indexOf(
      "create or replace function public.create_learning_section"
    );
    const createEnd = sql.indexOf(
      "create or replace function public.update_learning_section",
      createStart
    );
    const createFn = sql.slice(createStart, createEnd);
    expect(createFn).toMatch(/coalesce\(max\(sec\.position\), -1\) \+ 1/);
  });
});

describe("Sections Foundation V1 — visibility / public read", () => {
  const sql = read(MIGRATION);

  it("gates public section reads on full parent chain without is_platform_admin on anon policy", () => {
    const policyStart = sql.indexOf(
      'create policy "Public read published public sections"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Space members read accessible sections"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/to anon, authenticated/);
    expect(policy).toMatch(/status = 'published'/);
    expect(policy).toMatch(/visibility = 'public'/);
    expect(policy).not.toMatch(/is_platform_admin/i);
    expect(policy).toMatch(/c\.status = 'published'/);
    expect(policy).toMatch(/c\.visibility = 'public'/);
    expect(policy).toMatch(/p\.status = 'published'/);
    expect(policy).toMatch(/p\.visibility = 'public'/);
    expect(policy).toMatch(/s\.status = 'active'/);
    expect(policy).toMatch(/s\.visibility = 'public'/);
  });

  it("has a separate authenticated platform-admin read policy", () => {
    expect(sql).toMatch(
      /create policy "Platform admins read all sections"[\s\S]*?using \(public\.is_platform_admin\(\)\)/
    );
  });
});

describe("Sections Foundation V1 — security hardening", () => {
  const sql = read(MIGRATION);

  it("FORCE RLS on sections; ENABLE (not FORCE) on settings; clients cannot write", () => {
    expect(sql).toMatch(
      /alter table public\.learning_sections[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_section_settings enable row level security/i
    );
    // settings table must NOT be forced (1:1 pattern mirrors course settings).
    expect(sql).not.toMatch(
      /alter table public\.learning_section_settings force row level security/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_sections/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_section_settings/
    );
  });

  it("all RPCs are SECURITY DEFINER with search_path = public", () => {
    for (const name of Object.values(LEARNING_SECTION_RPCS)) {
      const start = sql.indexOf(
        `create or replace function public.${name}`
      );
      expect(start).toBeGreaterThanOrEqual(0);
      // Slice generously — update_learning_section has a long parameter list.
      const body = sql.slice(start, start + 1400);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
    }
  });

  it("grants RPCs to authenticated+service_role; validators stay internal", () => {
    expect(sql).toMatch(
      /grant execute on function public\.create_learning_section\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.reorder_learning_sections\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_section_validate_supported_languages\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_section_validate_metadata_object\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
  });

  it("enforces JSON metadata size, allowlists, and shallow shapes", () => {
    expect(sql).toMatch(/v_max_bytes integer := 8192/);
    expect(sql).toMatch(/octet_length\(p_value::text\) > v_max_bytes/);
    expect(sql).toMatch(/% exceeds maximum size of % bytes/);
    expect(sql).toMatch(/% contains unexpected key: %/);
    expect(LEARNING_SECTION_METADATA_MAX_BYTES).toBe(8192);
    expect(LEARNING_SECTION_METADATA_LIMITS.brandingUrlMaxChars).toBe(2048);
    expect(LEARNING_SECTION_METADATA_LIMITS.aiArrayMaxItems).toBe(64);
  });
});

describe("Sections Foundation V1 — audit & settings", () => {
  const sql = read(MIGRATION);

  it("audits section lifecycle and reorder via learning_audit_write", () => {
    expect(sql).toMatch(/'section\.create'/);
    expect(sql).toMatch(/'section\.update'/);
    expect(sql).toMatch(/'section\.publish'/);
    expect(sql).toMatch(/'section\.archive'/);
    expect(sql).toMatch(/'section\.moderation'/);
    expect(sql).toMatch(/'section\.reorder'/);
    // constants module mirrors the audit action strings
    expect(Object.values(LEARNING_SECTION_AUDIT_ACTIONS)).toEqual([
      "section.create",
      "section.update",
      "section.publish",
      "section.archive",
      "section.moderation",
      "section.reorder",
    ]);
  });

  it("reserved settings are inert with locked defaults", () => {
    expect(sql).toMatch(/is_required boolean not null default true/);
    expect(sql).toMatch(/enforce_lesson_order boolean not null default false/);
    expect(sql).toMatch(/visible_when_locked boolean not null default true/);
    expect(sql).toMatch(/inert contracts/i);
    expect(LEARNING_SECTION_SETTINGS_DEFAULTS).toEqual({
      is_required: true,
      enforce_lesson_order: false,
      visible_when_locked: true,
    });
  });

  it("does not implement excluded features (only the two section tables are created)", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_sections",
      "learning_section_settings",
    ]);
    // No excluded objects are created/referenced as concrete tables/functions.
    expect(sql).not.toMatch(/public\.learning_lessons?\b/i);
    expect(sql).not.toMatch(/public\.learning_enrollments?\b/i);
    expect(sql).not.toMatch(/public\.learning_certificates?\b/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*lesson/i);
  });
});

describe("Sections Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, exclusions, and next slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Sections Foundation V1/i);
    expect(doc).toMatch(/learning_sections/);
    expect(doc).toMatch(
      /Space → Program → Course → Section|Space -> Program -> Course -> Section/
    );
    expect(doc).toMatch(/Does not include|exclusions|out of scope/i);
    expect(doc).toMatch(/inherit(s|ed)? from (the )?course/i);
    expect(doc).toMatch(/reorder_learning_sections/);
    expect(doc).toMatch(/Next slice = Lessons|next slice.*lessons/i);
  });
});
