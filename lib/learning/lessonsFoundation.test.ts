import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_LESSON_AI_KEYS,
  LEARNING_LESSON_AUDIT_ACTIONS,
  LEARNING_LESSON_BRANDING_KEYS,
  LEARNING_LESSON_CONTENT_TYPES,
  LEARNING_LESSON_DIFFICULTIES,
  LEARNING_LESSON_HELPERS,
  LEARNING_LESSON_METADATA_LIMITS,
  LEARNING_LESSON_METADATA_MAX_BYTES,
  LEARNING_LESSON_RPCS,
  LEARNING_LESSON_SEO_KEYS,
  LEARNING_LESSON_SETTINGS_DEFAULTS,
  LEARNING_LESSON_STATUSES,
  LEARNING_LESSON_VISIBILITIES,
} from "./lessonsFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260832_learning_lessons_foundation_v1.sql";
const DOC = "docs/learning/implementation/LESSONS_FOUNDATION_V1.md";
const SECTIONS_MIGRATION =
  "supabase/migrations/20260831_learning_sections_foundation_v1.sql";
const COURSES_MIGRATION =
  "supabase/migrations/20260830_learning_courses_foundation_v1.sql";
const PROGRAMS_MIGRATION =
  "supabase/migrations/20260829_learning_programs_foundation_v1.sql";
const SPACES_MIGRATION =
  "supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Lessons Foundation V1 — files", () => {
  it("ships migration, constants module, documentation, and depends on Sections+Courses+Programs+Spaces", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/lessonsFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, SECTIONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, COURSES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRAMS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SPACES_MIGRATION))).toBe(true);
  });

  it("is ordered after the Sections migration (20260832 > 20260831)", () => {
    expect(MIGRATION > SECTIONS_MIGRATION).toBe(true);
  });
});

describe("Lessons Foundation V1 — constants mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes statuses, visibility, difficulties", () => {
    expect([...LEARNING_LESSON_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect([...LEARNING_LESSON_VISIBILITIES]).toEqual([
      "private",
      "unlisted",
      "public",
    ]);
    expect([...LEARNING_LESSON_DIFFICULTIES]).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert",
    ]);
    expect(sql).toMatch(/position integer not null/);
    expect(sql).toMatch(/learning_lessons_position_non_negative/);
  });

  it("names all client RPCs and helpers", () => {
    for (const name of Object.values(LEARNING_LESSON_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(LEARNING_LESSON_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });

  it("documents foundation metadata keys and lesson-appropriate flags only", () => {
    expect([...LEARNING_LESSON_BRANDING_KEYS]).toEqual([
      "cover_url",
      "thumbnail_url",
      "intro_video_url",
      "logo_url",
    ]);
    expect([...LEARNING_LESSON_SEO_KEYS]).toEqual([
      "title",
      "description",
      "keywords",
    ]);
    expect([...LEARNING_LESSON_AI_KEYS]).toEqual([
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

  it("does NOT include marketplace_ready, certification_ready, category, or target_audience (lesson-trimmed)", () => {
    expect(sql).not.toMatch(/marketplace_ready/);
    expect(sql).not.toMatch(/certification_ready/);
    // category and target_audience stay on Section — not copied to lessons.
    expect(sql).not.toMatch(/\bcategory\b/);
    expect(sql).not.toMatch(/target_audience/);
  });
});

describe("Lessons Foundation V1 — content_type (descriptive-only allowlist)", () => {
  const sql = read(MIGRATION);

  it("exposes the nullable content_type allowlist and mirrors it in constants", () => {
    expect([...LEARNING_LESSON_CONTENT_TYPES]).toEqual([
      "video",
      "text",
      "audio",
      "document",
      "interactive",
      "live",
    ]);
    expect(sql).toMatch(/learning_lessons_content_type_check/);
    expect(sql).toMatch(
      /content_type in \(\s*'video', 'text', 'audio', 'document', 'interactive', 'live'\s*\)/
    );
    expect(sql).toMatch(/content_type is null/);
    // Descriptive only — activates nothing.
    expect(sql).toMatch(/Descriptive-only/i);
  });
});

describe("Lessons Foundation V1 — identity & schema contracts", () => {
  const sql = read(MIGRATION);

  it("scopes lessons to one section with unique slug and RESTRICT delete", () => {
    expect(sql).toMatch(/learning_lessons_section_slug_unique/);
    expect(sql).toMatch(
      /references public\.learning_sections \(id\) on delete restrict/
    );
  });

  it("declares section_id immutable and lesson is a container (not content/activity/progress/live)", () => {
    expect(sql).toMatch(/section_id is immutable after creation/i);
    expect(sql).toMatch(/educational container/i);
    expect(sql).toMatch(
      /NOT content body, an activity, progress, or a live session/i
    );
    expect(sql).toMatch(/Immutable parent section/i);
  });

  it("has a 3–64 kebab slug and 1–160 name like sections", () => {
    expect(sql).toMatch(/learning_lessons_slug_format/);
    expect(sql).toMatch(/char_length\(slug\) between 3 and 64/);
    expect(sql).toMatch(/learning_lessons_name_len/);
    expect(sql).toMatch(/char_length\(btrim\(name\)\) between 1 and 160/);
  });

  it("declares required indexes", () => {
    expect(sql).toMatch(/learning_lessons_section_status_idx/);
    expect(sql).toMatch(
      /learning_lessons_section_position_idx[\s\S]*?\(section_id, position, id\)/
    );
    expect(sql).toMatch(/learning_lessons_status_visibility_idx/);
    expect(sql).toMatch(/learning_lessons_created_by_idx/);
  });

  it("does NOT implement reserved future content-block table or RPCs", () => {
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_lesson_content_blocks/i
    );
    expect(sql).not.toMatch(/create or replace function public\.\w*content_block/i);
  });
});

describe("Lessons Foundation V1 — authority inherits from Section/Course (no staff table)", () => {
  const sql = read(MIGRATION);

  it("creates NO learning_lesson_staff table and NO staff-assignment RPCs", () => {
    expect(sql).not.toMatch(/learning_lesson_staff/);
    expect(sql).not.toMatch(/assign_learning_lesson_staff/);
    expect(sql).not.toMatch(/remove_learning_lesson_staff/);
  });

  it("can_manage_learning_lesson defers to platform admin or can_manage_learning_section", () => {
    const start = sql.indexOf(
      "create or replace function public.can_manage_learning_lesson"
    );
    const end = sql.indexOf(
      "create or replace function public.can_create_learning_lesson",
      start
    );
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/is_platform_admin\(p_user_id\)/);
    expect(fn).toMatch(
      /can_manage_learning_section\(les\.section_id, p_user_id\)/
    );
  });

  it("can_create_learning_lesson allows section manage or course staff ≥ instructor", () => {
    const start = sql.indexOf(
      "create or replace function public.can_create_learning_lesson"
    );
    const end = sql.indexOf(
      "revoke all on function public.can_manage_learning_lesson",
      start
    );
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/can_manage_learning_section\(p_section_id, p_user_id\)/);
    expect(fn).toMatch(/is_learning_course_staff\(sec\.course_id, p_user_id\)/);
    expect(fn).toMatch(/learning_course_staff_role_rank\([\s\S]*?'instructor'/);
  });

  it("revalidates active space membership via course staff helpers (stale row cannot grant authority)", () => {
    // update RPC path uses is_learning_course_staff + learning_course_staff_role,
    // both of which revalidate active space membership in the courses migration.
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_lesson"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.publish_learning_lesson",
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

describe("Lessons Foundation V1 — parent gates (full 5-level chain) & lifecycle", () => {
  const sql = read(MIGRATION);

  it("requires active parent space and draft|published program AND course AND section", () => {
    expect(
      (sql.match(/Learning space must be active for lesson changes/g) ?? [])
        .length
    ).toBeGreaterThanOrEqual(5);
    expect(sql).toMatch(/learning_lesson_require_parent_program_status/);
    expect(sql).toMatch(
      /Parent program must be draft or published for lesson changes/
    );
    expect(sql).toMatch(/learning_lesson_require_parent_course_status/);
    expect(sql).toMatch(
      /Parent course must be draft or published for lesson changes/
    );
    expect(sql).toMatch(/learning_lesson_require_parent_section_status/);
    expect(sql).toMatch(
      /Parent section must be draft or published for lesson changes/
    );
  });

  it("creates draft lessons and publishes draft→published only", () => {
    expect(sql).toMatch(/'draft'/);
    expect(sql).toMatch(/Only draft lessons can be published/);
    expect(sql).toMatch(/'lesson\.publish'/);
  });

  it("rejects normal mutations on suspended/archived lessons (moderate only)", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_lesson"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.publish_learning_lesson",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toMatch(/learning_lesson_require_mutable_status/);
    expect(sql).toMatch(/Lesson is %; only platform moderation may change it/);
  });

  it("blocks owner/lead archive while suspended (platform moderate only)", () => {
    const archiveStart = sql.indexOf(
      "create or replace function public.archive_learning_lesson"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_lesson",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(
      /Lesson is suspended; only platform moderation may change it/
    );
  });

  it("platform moderate accepts suspended|published|archived only", () => {
    expect(sql).toMatch(
      /moderate_learning_lesson status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });

  it("normalizes lifecycle timestamps on publish/archive/moderate", () => {
    const publishStart = sql.indexOf(
      "create or replace function public.publish_learning_lesson"
    );
    const publishEnd = sql.indexOf(
      "create or replace function public.archive_learning_lesson",
      publishStart
    );
    const publishFn = sql.slice(publishStart, publishEnd);
    expect(publishFn).toMatch(/suspended_at = null/);
    expect(publishFn).toMatch(/archived_at = null/);

    const moderateStart = sql.indexOf(
      "create or replace function public.moderate_learning_lesson"
    );
    const moderateEnd = sql.indexOf(
      "create or replace function public.reorder_learning_lessons",
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

describe("Lessons Foundation V1 — ordering", () => {
  const sql = read(MIGRATION);

  it("reorder is transactional within section with non-negative positions and full unique set", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_lessons"
    );
    const reorderFn = sql.slice(reorderStart);
    expect(reorderFn).toMatch(/for update/);
    expect(reorderFn).toMatch(/requires all lesson ids for the section/);
    expect(reorderFn).toMatch(/lesson_ids must be unique/);
    expect(reorderFn).toMatch(/All lesson_ids must belong to the section/);
    expect(reorderFn).toMatch(/position = \(u\.ord::integer - 1\)/);
    expect(reorderFn).toMatch(
      /Cannot reorder while a lesson is suspended or archived/
    );
    expect(sql).toMatch(/position >= 0/);
  });

  it("prevents unsafe cross-section reorder and cannot change section_id", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_lessons"
    );
    const reorderFn = sql.slice(reorderStart);
    // Every targeted row is constrained to the requested section_id.
    expect(reorderFn).toMatch(/and les\.section_id = p_section_id/);
    // No RPC assigns section_id anywhere in the migration.
    expect(sql).not.toMatch(/set\s+section_id\s*=/i);
  });

  it("appends new lessons at max(position)+1", () => {
    const createStart = sql.indexOf(
      "create or replace function public.create_learning_lesson"
    );
    const createEnd = sql.indexOf(
      "create or replace function public.update_learning_lesson",
      createStart
    );
    const createFn = sql.slice(createStart, createEnd);
    expect(createFn).toMatch(/coalesce\(max\(les\.position\), -1\) \+ 1/);
  });
});

describe("Lessons Foundation V1 — visibility / public read", () => {
  const sql = read(MIGRATION);

  it("gates public lesson reads on full parent chain without is_platform_admin on anon policy", () => {
    const policyStart = sql.indexOf(
      'create policy "Public read published public lessons"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Space members read accessible lessons"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/to anon, authenticated/);
    expect(policy).toMatch(/status = 'published'/);
    expect(policy).toMatch(/visibility = 'public'/);
    expect(policy).not.toMatch(/is_platform_admin/i);
    expect(policy).toMatch(/sec\.status = 'published'/);
    expect(policy).toMatch(/sec\.visibility = 'public'/);
    expect(policy).toMatch(/c\.status = 'published'/);
    expect(policy).toMatch(/c\.visibility = 'public'/);
    expect(policy).toMatch(/p\.status = 'published'/);
    expect(policy).toMatch(/p\.visibility = 'public'/);
    expect(policy).toMatch(/s\.status = 'active'/);
    expect(policy).toMatch(/s\.visibility = 'public'/);
  });

  it("has a separate authenticated platform-admin read policy", () => {
    expect(sql).toMatch(
      /create policy "Platform admins read all lessons"[\s\S]*?using \(public\.is_platform_admin\(\)\)/
    );
  });
});

describe("Lessons Foundation V1 — security hardening", () => {
  const sql = read(MIGRATION);

  it("FORCE RLS on lessons; ENABLE (not FORCE) on settings; clients cannot write", () => {
    expect(sql).toMatch(
      /alter table public\.learning_lessons[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_lesson_settings enable row level security/i
    );
    // settings table must NOT be forced (1:1 pattern mirrors section settings).
    expect(sql).not.toMatch(
      /alter table public\.learning_lesson_settings force row level security/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_lessons/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_lesson_settings/
    );
  });

  it("all RPCs are SECURITY DEFINER with search_path = public", () => {
    for (const name of Object.values(LEARNING_LESSON_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      // Slice generously — update_learning_lesson has a long parameter list.
      const body = sql.slice(start, start + 1400);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
    }
  });

  it("grants RPCs to authenticated+service_role; validators stay internal", () => {
    expect(sql).toMatch(
      /grant execute on function public\.create_learning_lesson\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.reorder_learning_lessons\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_lesson_validate_supported_languages\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_lesson_validate_metadata_object\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
  });

  it("enforces JSON metadata size, allowlists, and shallow shapes", () => {
    expect(sql).toMatch(/v_max_bytes integer := 8192/);
    expect(sql).toMatch(/octet_length\(p_value::text\) > v_max_bytes/);
    expect(sql).toMatch(/% exceeds maximum size of % bytes/);
    expect(sql).toMatch(/% contains unexpected key: %/);
    expect(LEARNING_LESSON_METADATA_MAX_BYTES).toBe(8192);
    expect(LEARNING_LESSON_METADATA_LIMITS.brandingUrlMaxChars).toBe(2048);
    expect(LEARNING_LESSON_METADATA_LIMITS.aiArrayMaxItems).toBe(64);
  });
});

describe("Lessons Foundation V1 — audit & settings", () => {
  const sql = read(MIGRATION);

  it("audits lesson lifecycle and reorder via learning_audit_write", () => {
    expect(sql).toMatch(/'lesson\.create'/);
    expect(sql).toMatch(/'lesson\.update'/);
    expect(sql).toMatch(/'lesson\.publish'/);
    expect(sql).toMatch(/'lesson\.archive'/);
    expect(sql).toMatch(/'lesson\.moderation'/);
    expect(sql).toMatch(/'lesson\.reorder'/);
    // constants module mirrors the audit action strings
    expect(Object.values(LEARNING_LESSON_AUDIT_ACTIONS)).toEqual([
      "lesson.create",
      "lesson.update",
      "lesson.publish",
      "lesson.archive",
      "lesson.moderation",
      "lesson.reorder",
    ]);
  });

  it("reserved settings are inert with locked defaults", () => {
    expect(sql).toMatch(/is_required boolean not null default true/);
    expect(sql).toMatch(/is_previewable boolean not null default false/);
    expect(sql).toMatch(/allow_comments boolean not null default false/);
    expect(sql).toMatch(/min_completion_seconds integer/);
    expect(sql).toMatch(/inert contracts/i);
    expect(LEARNING_LESSON_SETTINGS_DEFAULTS).toEqual({
      is_required: true,
      is_previewable: false,
      allow_comments: false,
      min_completion_seconds: null,
    });
  });

  it("does not implement excluded features (only the two lesson tables are created)", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_lessons",
      "learning_lesson_settings",
    ]);
    // No excluded objects are created/referenced as concrete tables/functions.
    expect(sql).not.toMatch(/public\.learning_enrollments?\b/i);
    expect(sql).not.toMatch(/public\.learning_certificates?\b/i);
    expect(sql).not.toMatch(/public\.learning_activit(y|ies)\b/i);
    expect(sql).not.toMatch(/public\.learning_lesson_progress\b/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*activity/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*progress/i);
  });
});

describe("Lessons Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, exclusions, and next slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Lessons Foundation V1/i);
    expect(doc).toMatch(/learning_lessons/);
    expect(doc).toMatch(
      /Space → Program → Course → Section → Lesson|Space -> Program -> Course -> Section -> Lesson/
    );
    expect(doc).toMatch(/Does not include|exclusions|out of scope/i);
    expect(doc).toMatch(/inherit(s|ed)? from (the )?section/i);
    expect(doc).toMatch(/reorder_learning_lessons/);
    expect(doc).toMatch(
      /Next slice = Lesson Content|next slice.*(content|progress)/i
    );
  });
});
