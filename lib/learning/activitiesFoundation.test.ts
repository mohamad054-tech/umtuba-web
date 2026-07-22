import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_ACTIVITY_AI_KEYS,
  LEARNING_ACTIVITY_AUDIT_ACTIONS,
  LEARNING_ACTIVITY_COMPLETION_MODES,
  LEARNING_ACTIVITY_CONFIG_LIMITS,
  LEARNING_ACTIVITY_EVALUATION_MODES,
  LEARNING_ACTIVITY_HELPERS,
  LEARNING_ACTIVITY_METADATA_LIMITS,
  LEARNING_ACTIVITY_METADATA_MAX_BYTES,
  LEARNING_ACTIVITY_RPCS,
  LEARNING_ACTIVITY_SETTINGS_DEFAULTS,
  LEARNING_ACTIVITY_SHOW_RESULT_POLICIES,
  LEARNING_ACTIVITY_STATUSES,
  LEARNING_ACTIVITY_TYPES,
  LEARNING_ACTIVITY_VISIBILITIES,
} from "./activitiesFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
const DOC = "docs/learning/implementation/ACTIVITIES_FOUNDATION_V1.md";
const LESSONS_MIGRATION =
  "supabase/migrations/20260832_learning_lessons_foundation_v1.sql";
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

describe("Activities Foundation V1 — files", () => {
  it("ships migration, constants module, documentation, and depends on the full chain", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/activitiesFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, LESSONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SECTIONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, COURSES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRAMS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SPACES_MIGRATION))).toBe(true);
  });

  it("is ordered after the Lessons migration (20260833 > 20260832)", () => {
    expect(MIGRATION > LESSONS_MIGRATION).toBe(true);
  });
});

describe("Activities Foundation V1 — constants mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes statuses and visibility", () => {
    expect([...LEARNING_ACTIVITY_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect([...LEARNING_ACTIVITY_VISIBILITIES]).toEqual([
      "private",
      "unlisted",
      "public",
    ]);
    expect(sql).toMatch(/position integer not null/);
    expect(sql).toMatch(/learning_activities_position_non_negative/);
  });

  it("names all client RPCs and helpers", () => {
    for (const name of Object.values(LEARNING_ACTIVITY_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(LEARNING_ACTIVITY_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });

  it("is a lean container: only ai_metadata, no branding/seo/category/marketplace", () => {
    expect([...LEARNING_ACTIVITY_AI_KEYS]).toEqual([
      "skills",
      "outcomes",
      "tags",
    ]);
    expect(sql).toMatch(/ai_metadata jsonb not null default '\{\}'::jsonb/);
    expect(sql).not.toMatch(/branding_metadata/);
    expect(sql).not.toMatch(/seo_metadata/);
    expect(sql).not.toMatch(/marketplace_ready/);
    expect(sql).not.toMatch(/certification_ready/);
    expect(sql).not.toMatch(/\bcategory\b/);
    expect(sql).not.toMatch(/target_audience/);
    // Lesson-only descriptive content_type is not copied onto activities.
    expect(sql).not.toMatch(/content_type/);
  });
});

describe("Activities Foundation V1 — immutable type allowlist", () => {
  const sql = read(MIGRATION);

  it("exposes the 16-type immutable allowlist and mirrors it in constants", () => {
    expect([...LEARNING_ACTIVITY_TYPES]).toEqual([
      "quiz",
      "assignment",
      "practice",
      "coding",
      "essay",
      "discussion",
      "reflection",
      "survey",
      "oral",
      "upload",
      "matching",
      "flashcards",
      "ai_task",
      "project",
      "lab",
      "live_check",
    ]);
    expect(LEARNING_ACTIVITY_TYPES).toHaveLength(16);
    expect(sql).toMatch(/learning_activities_type_check/);
    expect(sql).toMatch(/type text not null/);
    expect(sql).toMatch(/Immutable activity type/i);
  });

  it("validates type fail-closed and never updates type after create", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_activity_validate_type/
    );
    expect(sql).toMatch(/Invalid activity type/);
    // No RPC assigns type anywhere in the migration (immutable).
    expect(sql).not.toMatch(/set\s+type\s*=/i);
    // update RPC does not accept a p_type parameter.
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_activity("
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.update_learning_activity_settings",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).not.toMatch(/p_type/);
  });
});

describe("Activities Foundation V1 — identity & schema contracts", () => {
  const sql = read(MIGRATION);

  it("scopes activities to one lesson with unique slug and RESTRICT delete", () => {
    expect(sql).toMatch(/learning_activities_lesson_slug_unique/);
    expect(sql).toMatch(
      /references public\.learning_lessons \(id\) on delete restrict/
    );
  });

  it("declares lesson_id immutable and activity is an interaction container", () => {
    expect(sql).toMatch(/lesson_id and type are immutable after creation/i);
    expect(sql).toMatch(/interaction container/i);
    expect(sql).toMatch(
      /NOT a question, attempt, submission, answer, grade/i
    );
    expect(sql).toMatch(/Immutable parent lesson/i);
  });

  it("has a 3–64 kebab slug and 1–160 name like lessons", () => {
    expect(sql).toMatch(/learning_activities_slug_format/);
    expect(sql).toMatch(/char_length\(slug\) between 3 and 64/);
    expect(sql).toMatch(/learning_activities_name_len/);
    expect(sql).toMatch(/char_length\(btrim\(name\)\) between 1 and 160/);
  });

  it("declares required indexes including a type index", () => {
    expect(sql).toMatch(/learning_activities_lesson_status_idx/);
    expect(sql).toMatch(
      /learning_activities_lesson_position_idx[\s\S]*?\(lesson_id, position, id\)/
    );
    expect(sql).toMatch(/learning_activities_status_visibility_idx/);
    expect(sql).toMatch(/learning_activities_created_by_idx/);
    expect(sql).toMatch(/learning_activities_type_idx[\s\S]*?\(type\)/);
  });

  it("does NOT implement excluded child tables/engines", () => {
    // Only named-as-reserved (learning_lesson_items) may appear in comments; no
    // excluded tables/functions are created.
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_lesson_items/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_activity_questions/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_activity_attempts/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_activity_submissions/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_activity_grades/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.\w*rubric/i
    );
  });
});

describe("Activities Foundation V1 — authority inherits from Lesson/Course (no staff table)", () => {
  const sql = read(MIGRATION);

  it("creates NO learning_activity_staff table and NO staff-assignment RPCs", () => {
    expect(sql).not.toMatch(/learning_activity_staff/);
    expect(sql).not.toMatch(/assign_learning_activity_staff/);
    expect(sql).not.toMatch(/remove_learning_activity_staff/);
  });

  it("can_manage_learning_activity defers to platform admin or can_manage_learning_lesson", () => {
    const start = sql.indexOf(
      "create or replace function public.can_manage_learning_activity"
    );
    const end = sql.indexOf(
      "create or replace function public.can_create_learning_activity",
      start
    );
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/is_platform_admin\(p_user_id\)/);
    expect(fn).toMatch(
      /can_manage_learning_lesson\(act\.lesson_id, p_user_id\)/
    );
  });

  it("can_create_learning_activity allows lesson manage or course staff ≥ instructor", () => {
    const start = sql.indexOf(
      "create or replace function public.can_create_learning_activity"
    );
    const end = sql.indexOf(
      "revoke all on function public.can_manage_learning_activity",
      start
    );
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/can_manage_learning_lesson\(p_lesson_id, p_user_id\)/);
    expect(fn).toMatch(/is_learning_course_staff\(sec\.course_id, p_user_id\)/);
    expect(fn).toMatch(/learning_course_staff_role_rank\([\s\S]*?'instructor'/);
  });

  it("revalidates active space membership via course staff helpers (stale row cannot grant authority)", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_activity("
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.update_learning_activity_settings",
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

describe("Activities Foundation V1 — parent gates (full 6-level chain) & lifecycle", () => {
  const sql = read(MIGRATION);

  it("requires active space and draft|published program AND course AND section AND lesson", () => {
    // create, update, update_settings, publish, archive, reorder each check space.
    expect(
      (sql.match(/Learning space must be active for activity changes/g) ?? [])
        .length
    ).toBeGreaterThanOrEqual(6);
    expect(sql).toMatch(/learning_activity_require_parent_program_status/);
    expect(sql).toMatch(
      /Parent program must be draft or published for activity changes/
    );
    expect(sql).toMatch(/learning_activity_require_parent_course_status/);
    expect(sql).toMatch(
      /Parent course must be draft or published for activity changes/
    );
    expect(sql).toMatch(/learning_activity_require_parent_section_status/);
    expect(sql).toMatch(
      /Parent section must be draft or published for activity changes/
    );
    expect(sql).toMatch(/learning_activity_require_parent_lesson_status/);
    expect(sql).toMatch(
      /Parent lesson must be draft or published for activity changes/
    );
  });

  it("published activity does NOT require a published lesson (only draft|published chain)", () => {
    // The lesson gate accepts draft OR published — it never demands 'published'.
    const start = sql.indexOf(
      "create or replace function public.learning_activity_require_parent_lesson_status"
    );
    const end = sql.indexOf("revoke all on function", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/p_lesson_status is distinct from 'draft'/);
    expect(fn).toMatch(/p_lesson_status is distinct from 'published'/);
  });

  it("creates draft activities and publishes draft→published only", () => {
    expect(sql).toMatch(/'draft'/);
    expect(sql).toMatch(/Only draft activities can be published/);
    expect(sql).toMatch(/'activity\.publish'/);
  });

  it("rejects normal mutations on suspended/archived activities (moderate only)", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_activity("
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.update_learning_activity_settings",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toMatch(/learning_activity_require_mutable_status/);
    expect(sql).toMatch(/Activity is %; only platform moderation may change it/);
  });

  it("blocks owner/lead archive while suspended (platform moderate only)", () => {
    const archiveStart = sql.indexOf(
      "create or replace function public.archive_learning_activity"
    );
    const archiveEnd = sql.indexOf(
      "create or replace function public.moderate_learning_activity",
      archiveStart
    );
    const archiveFn = sql.slice(archiveStart, archiveEnd);
    expect(archiveFn).toMatch(
      /Activity is suspended; only platform moderation may change it/
    );
  });

  it("platform moderate accepts suspended|published|archived only", () => {
    expect(sql).toMatch(
      /moderate_learning_activity status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });

  it("normalizes lifecycle timestamps on publish/archive/moderate", () => {
    const publishStart = sql.indexOf(
      "create or replace function public.publish_learning_activity"
    );
    const publishEnd = sql.indexOf(
      "create or replace function public.archive_learning_activity",
      publishStart
    );
    const publishFn = sql.slice(publishStart, publishEnd);
    expect(publishFn).toMatch(/suspended_at = null/);
    expect(publishFn).toMatch(/archived_at = null/);

    const moderateStart = sql.indexOf(
      "create or replace function public.moderate_learning_activity"
    );
    const moderateEnd = sql.indexOf(
      "create or replace function public.reorder_learning_activities",
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

describe("Activities Foundation V1 — ordering (within lesson, B-compatible)", () => {
  const sql = read(MIGRATION);

  it("reorder is transactional within lesson with non-negative positions and full unique set", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_activities"
    );
    const reorderFn = sql.slice(reorderStart);
    expect(reorderFn).toMatch(/for update/);
    expect(reorderFn).toMatch(/requires all activity ids for the lesson/);
    expect(reorderFn).toMatch(/activity_ids must be unique/);
    expect(reorderFn).toMatch(/All activity_ids must belong to the lesson/);
    expect(reorderFn).toMatch(/position = \(u\.ord::integer - 1\)/);
    expect(reorderFn).toMatch(
      /Cannot reorder while an activity is suspended or archived/
    );
    expect(sql).toMatch(/position >= 0/);
  });

  it("prevents unsafe cross-lesson reorder and cannot change lesson_id", () => {
    const reorderStart = sql.indexOf(
      "create or replace function public.reorder_learning_activities"
    );
    const reorderFn = sql.slice(reorderStart);
    expect(reorderFn).toMatch(/and act\.lesson_id = p_lesson_id/);
    // No RPC assigns lesson_id anywhere in the migration.
    expect(sql).not.toMatch(/set\s+lesson_id\s*=/i);
  });

  it("appends new activities at max(position)+1", () => {
    const createStart = sql.indexOf(
      "create or replace function public.create_learning_activity"
    );
    const createEnd = sql.indexOf(
      "create or replace function public.update_learning_activity(",
      createStart
    );
    const createFn = sql.slice(createStart, createEnd);
    expect(createFn).toMatch(/coalesce\(max\(a\.position\), -1\) \+ 1/);
  });

  it("documents position is order within lesson, NOT global lesson-item order, no UNIQUE(lesson_id, position)", () => {
    expect(sql).toMatch(/order within the parent lesson/i);
    expect(sql).toMatch(/NOT a global lesson-item order/i);
    expect(sql).not.toMatch(/unique \(lesson_id, position\)/i);
    // reserved future table named-only, not implemented
    expect(sql).toMatch(/learning_lesson_items/i);
  });
});

describe("Activities Foundation V1 — visibility (NO anon SELECT)", () => {
  const sql = read(MIGRATION);

  it("has NO anonymous SELECT policy at all (privacy-safe assessments)", () => {
    // There must be no policy targeting anon for the activities table.
    expect(sql).not.toMatch(/to anon, authenticated/);
    expect(sql).not.toMatch(/\bto anon\b/);
    // No public-read policy title like the lessons module has.
    expect(sql).not.toMatch(/Public read published public activities/);
  });

  it("never grants table SELECT to anon", () => {
    expect(sql).toMatch(
      /grant select on table public\.learning_activities to authenticated/
    );
    // anon is explicitly not granted select on either table.
    expect(sql).not.toMatch(/to anon, authenticated;/);
    expect(sql).not.toMatch(/grant select on table[\s\S]*?to anon/);
  });

  it("authenticated space-member read gates on the full parent chain", () => {
    const policyStart = sql.indexOf(
      'create policy "Space members read accessible activities"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Activity managers read activities"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/to authenticated/);
    expect(policy).toMatch(/is_learning_space_member\(p\.space_id\)/);
    expect(policy).toMatch(/learning_activities\.status = 'published'/);
  });

  it("has a separate authenticated platform-admin read policy", () => {
    expect(sql).toMatch(
      /create policy "Platform admins read all activities"[\s\S]*?using \(public\.is_platform_admin\(\)\)/
    );
  });
});

describe("Activities Foundation V1 — settings sidecar (inert)", () => {
  const sql = read(MIGRATION);

  it("declares the 1:1 settings table with locked defaults", () => {
    expect(sql).toMatch(
      /activity_id uuid primary key[\s\S]*?references public\.learning_activities \(id\) on delete cascade/
    );
    expect(sql).toMatch(/is_required boolean not null default true/);
    expect(sql).toMatch(/evaluation_mode text not null default 'none'/);
    expect(sql).toMatch(/completion_mode text not null default 'view'/);
    expect(sql).toMatch(/allow_late_submission boolean not null default false/);
    expect(sql).toMatch(/show_result_policy text not null default 'never'/);
    expect(sql).toMatch(/config jsonb not null default '\{\}'::jsonb/);
    expect(LEARNING_ACTIVITY_SETTINGS_DEFAULTS).toEqual({
      is_required: true,
      max_score: null,
      passing_score: null,
      max_attempts: null,
      time_limit_seconds: null,
      evaluation_mode: "none",
      completion_mode: "view",
      allow_late_submission: false,
      show_result_policy: "never",
      config: {},
    });
  });

  it("exposes enum constants that mirror SQL check constraints", () => {
    expect([...LEARNING_ACTIVITY_EVALUATION_MODES]).toEqual([
      "none",
      "auto",
      "manual",
      "hybrid",
    ]);
    expect([...LEARNING_ACTIVITY_COMPLETION_MODES]).toEqual([
      "view",
      "submit",
      "score",
      "manual",
    ]);
    expect([...LEARNING_ACTIVITY_SHOW_RESULT_POLICIES]).toEqual([
      "never",
      "immediately",
      "after_submit",
      "after_close",
      "manual",
    ]);
  });

  it("enforces scoring bounds via check constraints and a validator", () => {
    expect(sql).toMatch(/max_score is null or max_score >= 0/);
    expect(sql).toMatch(/passing_score is null or passing_score >= 0/);
    expect(sql).toMatch(/max_attempts is null or max_attempts >= 1/);
    expect(sql).toMatch(/time_limit_seconds between 1 and 1000000/);
    expect(sql).toMatch(/learning_activity_settings_score_bounds/);
    expect(sql).toMatch(/passing_score <= max_score/);
    expect(sql).toMatch(
      /create or replace function public\.learning_activity_validate_scoring/
    );
    expect(sql).toMatch(/passing_score must be <= max_score/);
  });

  it("has a dedicated update_learning_activity_settings RPC", () => {
    expect(sql).toMatch(
      /create or replace function public\.update_learning_activity_settings/
    );
    expect(sql).toMatch(/'activity\.settings_update'/);
  });

  it("ENABLE (not FORCE) RLS on settings; no attempt/submission/scoring behavior", () => {
    expect(sql).toMatch(
      /alter table public\.learning_activity_settings enable row level security/i
    );
    expect(sql).not.toMatch(
      /alter table public\.learning_activity_settings force row level security/i
    );
    expect(sql).toMatch(/inert/i);
  });
});

describe("Activities Foundation V1 — config JSON limits", () => {
  const sql = read(MIGRATION);

  it("validates config object-only, bounded, shallow, capped keys, scalar/array values", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_activity_validate_config/
    );
    expect(sql).toMatch(/config must be a JSON object/);
    expect(sql).toMatch(/v_max_bytes integer := 8192/);
    expect(sql).toMatch(/v_max_keys integer := 32/);
    expect(sql).toMatch(/config exceeds maximum of % top-level keys/);
    expect(sql).toMatch(/nested objects not allowed/);
    expect(sql).toMatch(/array items must be scalars/);
    expect(LEARNING_ACTIVITY_CONFIG_LIMITS).toEqual({
      maxBytes: 8192,
      maxTopLevelKeys: 32,
      maxDepth: 2,
      maxArrayItems: 64,
      maxStringChars: 512,
    });
  });

  it("config must not be used for questions/answers/large content (documented)", () => {
    expect(sql).toMatch(
      /Must NOT store questions\/answers\/submissions\/rubrics\/files\/code/i
    );
  });
});

describe("Activities Foundation V1 — security hardening", () => {
  const sql = read(MIGRATION);

  it("FORCE RLS on activities; ENABLE on settings; clients cannot write", () => {
    expect(sql).toMatch(
      /alter table public\.learning_activities[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_activities/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_activity_settings/
    );
  });

  it("all RPCs are SECURITY DEFINER with search_path = public", () => {
    for (const name of Object.values(LEARNING_ACTIVITY_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 1600);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
    }
  });

  it("grants RPCs to authenticated+service_role; validators stay internal", () => {
    expect(sql).toMatch(
      /grant execute on function public\.create_learning_activity\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.update_learning_activity_settings\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.reorder_learning_activities\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_activity_validate_type\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_activity_validate_config\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
  });

  it("enforces ai_metadata size and allowlist", () => {
    expect(sql).toMatch(/ai_metadata must be a JSON object/);
    expect(sql).toMatch(/ai_metadata contains unexpected key: %/);
    expect(sql).toMatch(/ai_metadata exceeds maximum size of % bytes/);
    expect(LEARNING_ACTIVITY_METADATA_MAX_BYTES).toBe(8192);
    expect(LEARNING_ACTIVITY_METADATA_LIMITS.aiArrayMaxItems).toBe(64);
    expect(LEARNING_ACTIVITY_METADATA_LIMITS.aiItemMaxChars).toBe(120);
  });
});

describe("Activities Foundation V1 — audit & table inventory", () => {
  const sql = read(MIGRATION);

  it("audits activity lifecycle, reorder, and settings via learning_audit_write", () => {
    expect(sql).toMatch(/'activity\.create'/);
    expect(sql).toMatch(/'activity\.update'/);
    expect(sql).toMatch(/'activity\.publish'/);
    expect(sql).toMatch(/'activity\.archive'/);
    expect(sql).toMatch(/'activity\.moderation'/);
    expect(sql).toMatch(/'activity\.reorder'/);
    expect(sql).toMatch(/'activity\.settings_update'/);
    expect(Object.values(LEARNING_ACTIVITY_AUDIT_ACTIONS)).toEqual([
      "activity.create",
      "activity.update",
      "activity.publish",
      "activity.archive",
      "activity.moderation",
      "activity.reorder",
      "activity.settings_update",
    ]);
  });

  it("includes parent ids in audit metadata but not the config payload", () => {
    const settingsStart = sql.indexOf(
      "create or replace function public.update_learning_activity_settings"
    );
    const settingsEnd = sql.indexOf(
      "create or replace function public.publish_learning_activity",
      settingsStart
    );
    const settingsFn = sql.slice(settingsStart, settingsEnd);
    // audit metadata for settings must include parent ids
    expect(settingsFn).toMatch(/'lesson_id', v_activity\.lesson_id/);
    expect(settingsFn).toMatch(/'course_id', v_section\.course_id/);
    // and must NOT embed the config payload in the audit call
    const auditStart = settingsFn.indexOf("learning_audit_write");
    const auditSlice = settingsFn.slice(auditStart);
    expect(auditSlice).not.toMatch(/'config', /);
  });

  it("creates exactly the two activity tables (no excluded objects)", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_activities",
      "learning_activity_settings",
    ]);
    expect(sql).not.toMatch(/public\.learning_enrollments?\b/i);
    expect(sql).not.toMatch(/public\.learning_certificates?\b/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*attempt/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*submission/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*progress/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*question/i);
  });
});

describe("Activities Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, exclusions, no-anon, and next slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Activities Foundation V1/i);
    expect(doc).toMatch(/learning_activities/);
    expect(doc).toMatch(
      /Space → Program → Course → Section → Lesson → Activity|Space -> Program -> Course -> Section -> Lesson -> Activity/
    );
    expect(doc).toMatch(/Does not include|exclusions|out of scope/i);
    expect(doc).toMatch(/inherit(s|ed)? from (the )?lesson/i);
    expect(doc).toMatch(/reorder_learning_activities/);
    // No anon SELECT is a documented, deliberate divergence from Lessons.
    expect(doc).toMatch(/no (anonymous|anon).{0,40}SELECT/i);
    // A→B ordering decision documented.
    expect(doc).toMatch(/learning_lesson_items/);
    expect(doc).toMatch(/next slice/i);
  });
});
