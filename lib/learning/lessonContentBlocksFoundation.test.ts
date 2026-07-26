import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_LESSON_CONTENT_BLOCK_ACCESS_HELPER,
  LEARNING_LESSON_CONTENT_BLOCK_AUDIT_ACTIONS,
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS,
  LEARNING_LESSON_CONTENT_BLOCK_CODE_LANGUAGE_PATTERN,
  LEARNING_LESSON_CONTENT_BLOCK_CONTENT_KEYS,
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS,
  LEARNING_LESSON_CONTENT_BLOCK_HELPERS,
  LEARNING_LESSON_CONTENT_BLOCK_LIMITS,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RPCS,
  LEARNING_LESSON_CONTENT_BLOCK_STATUSES,
  LEARNING_LESSON_CONTENT_BLOCK_TYPES,
} from "./lessonContentBlocksFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/LESSON_CONTENT_BLOCKS_FOUNDATION_V1.md";
const PROGRESS_MIGRATION =
  "supabase/migrations/20260835_learning_progress_foundation_v1.sql";
const ACTIVITIES_MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
const LESSONS_MIGRATION =
  "supabase/migrations/20260832_learning_lessons_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Lesson Content Blocks Foundation V1 — files & ordering", () => {
  it("ships migration, constants module, documentation, and prior deps exist", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/learning/lessonContentBlocksFoundation.ts"))
    ).toBe(true);
    expect(existsSync(join(ROOT, PROGRESS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ACTIVITIES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, LESSONS_MIGRATION))).toBe(true);
  });

  it("is ordered after the Progress migration (20260836 > 20260835)", () => {
    expect(MIGRATION > PROGRESS_MIGRATION).toBe(true);
  });

  it("does NOT modify prior committed migrations (20260828–20260835 untouched here)", () => {
    // This slice only adds 20260836; the file name encodes that invariant.
    expect(MIGRATION).toContain("20260836");
  });
});

describe("Lesson Content Blocks Foundation V1 — schema & identity", () => {
  const sql = read(MIGRATION);

  it("creates exactly one table: learning_lesson_content_blocks", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual(["learning_lesson_content_blocks"]);
  });

  it("scopes each block to exactly one lesson with ON DELETE RESTRICT", () => {
    expect(sql).toMatch(
      /lesson_id uuid not null\s*\n\s*references public\.learning_lessons \(id\) on delete restrict/
    );
  });

  it("declares statuses, non-negative position, and object content", () => {
    expect([...LEARNING_LESSON_CONTENT_BLOCK_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect(sql).toMatch(/learning_lesson_content_blocks_status_check/);
    expect(sql).toMatch(/position integer not null/);
    expect(sql).toMatch(/learning_lesson_content_blocks_position_non_negative/);
    expect(sql).toMatch(/position >= 0/);
    expect(sql).toMatch(/content jsonb not null default '\{\}'::jsonb/);
    expect(sql).toMatch(/jsonb_typeof\(content\) = 'object'/);
  });

  it("tracks created_by/updated_by and lifecycle timestamps", () => {
    expect(sql).toMatch(
      /created_by uuid not null\s*\n\s*references public\.profiles \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /updated_by uuid\s*\n\s*references public\.profiles \(id\) on delete set null/
    );
    expect(sql).toMatch(/created_at timestamptz not null default now\(\)/);
    expect(sql).toMatch(/updated_at timestamptz not null default now\(\)/);
    expect(sql).toMatch(/published_at timestamptz/);
    expect(sql).toMatch(/suspended_at timestamptz/);
    expect(sql).toMatch(/archived_at timestamptz/);
  });

  it("enforces identity immutability via a guard trigger (lesson_id/block_type/created_by/created_at)", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_lesson_content_block_guard_immutable/
    );
    const start = sql.indexOf(
      "function public.learning_lesson_content_block_guard_immutable"
    );
    const fn = sql.slice(start, start + 700);
    expect(fn).toMatch(/new\.lesson_id is distinct from old\.lesson_id/);
    expect(fn).toMatch(/new\.block_type is distinct from old\.block_type/);
    expect(fn).toMatch(/new\.created_by is distinct from old\.created_by/);
    expect(fn).toMatch(/new\.created_at is distinct from old\.created_at/);
    expect(fn).toMatch(/identity columns are immutable/);
    // Trigger is actually installed.
    expect(sql).toMatch(
      /create trigger learning_lesson_content_blocks_guard_immutable[\s\S]*?before update/
    );
    // No RPC ever assigns the immutable columns.
    expect(sql).not.toMatch(/set\s+lesson_id\s*=/i);
    expect(sql).not.toMatch(/set\s+block_type\s*=/i);
    expect(sql).not.toMatch(/set\s+created_by\s*=/i);
  });

  it("declares required indexes", () => {
    expect(sql).toMatch(/learning_lesson_content_blocks_lesson_status_idx/);
    expect(sql).toMatch(
      /learning_lesson_content_blocks_lesson_position_idx[\s\S]*?\(lesson_id, position, id\)/
    );
    expect(sql).toMatch(/learning_lesson_content_blocks_type_idx/);
    expect(sql).toMatch(/learning_lesson_content_blocks_created_by_idx/);
  });
});

describe("Lesson Content Blocks Foundation V1 — block type allowlist", () => {
  const sql = read(MIGRATION);

  it("exposes the 15-value immutable allowlist (13 creatable + 2 reserved)", () => {
    expect([...LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES]).toEqual([
      "rich_text",
      "heading",
      "image",
      "video",
      "audio",
      "quote",
      "divider",
      "callout",
      "external_link",
      "code_block",
      "transcript",
      "pdf",
      "downloadable_file",
    ]);
    expect([...LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES]).toEqual([
      "ai_block",
      "interactive_block",
    ]);
    expect(LEARNING_LESSON_CONTENT_BLOCK_TYPES).toHaveLength(15);
    expect(sql).toMatch(/learning_lesson_content_blocks_type_check/);
    // Original V1 types appear in 20260836; readiness expansion is in 20260863.
    const readiness = read(
      "supabase/migrations/20260863_learning_first_course_readiness_v1.sql"
    );
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_TYPES) {
      const inFoundation = sql.match(new RegExp(`'${t}'`));
      const inReadiness = readiness.match(new RegExp(`'${t}'`));
      expect(Boolean(inFoundation || inReadiness)).toBe(true);
    }
  });

  it("REJECTS reserved types (ai_block/interactive_block) at create time", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_lesson_content_block_validate_type/
    );
    const start = sql.indexOf(
      "function public.learning_lesson_content_block_validate_type"
    );
    const fn = sql.slice(start, start + 900);
    expect(fn).toMatch(/p_is_create and p_type in \('ai_block', 'interactive_block'\)/);
    expect(fn).toMatch(/is reserved and cannot be created in V1/);
    // create passes p_is_create = true
    const createStart = sql.indexOf(
      "function public.create_learning_lesson_content_block"
    );
    const createFn = sql.slice(
      createStart,
      sql.indexOf("function public.update_learning_lesson_content_block")
    );
    expect(createFn).toMatch(
      /learning_lesson_content_block_validate_type\(v_type, true\)/
    );
  });

  it("fails closed on fully deferred types (gallery/table/embed/html)", () => {
    expect([...LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES]).toEqual([
      "gallery",
      "table",
      "embed",
      "html",
    ]);
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES) {
      // Deferred types are NOT part of the DB allowlist / check constraint.
      const checkStart = sql.indexOf(
        "learning_lesson_content_blocks_type_check"
      );
      const checkSlice = sql.slice(checkStart, checkStart + 400);
      expect(checkSlice).not.toMatch(new RegExp(`'${t}'`));
    }
    // Validator rejects anything outside the allowlist.
    expect(sql).toMatch(/Invalid content block type/);
  });

  it("block_type is immutable (update RPC takes no block_type param)", () => {
    expect(sql).toMatch(/Immutable content type allowlist/i);
    const updateStart = sql.indexOf(
      "function public.update_learning_lesson_content_block"
    );
    const updateFn = sql.slice(
      updateStart,
      sql.indexOf("function public.publish_learning_lesson_content_block")
    );
    expect(updateFn).not.toMatch(/p_block_type/);
  });
});

describe("Lesson Content Blocks Foundation V1 — DB-authoritative parent scope", () => {
  const sql = read(MIGRATION);

  it("stores only lesson_id (no denormalized course_id/space_id columns)", () => {
    // The table body (before the first function) must not declare course_id or
    // space_id columns — scope is derived from the parent chain.
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_lesson_content_blocks"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = sql.slice(tableStart, tableEnd);
    expect(tableBody).not.toMatch(/course_id/);
    expect(tableBody).not.toMatch(/space_id/);
    expect(tableBody).toMatch(/lesson_id uuid not null/);
  });

  it("derives course/space from the parent chain in create (no client scope input)", () => {
    const createStart = sql.indexOf(
      "function public.create_learning_lesson_content_block("
    );
    const createFn = sql.slice(
      createStart,
      sql.indexOf("function public.update_learning_lesson_content_block")
    );
    // Only lesson_id + block_type + content are accepted from the client.
    expect(createFn).toMatch(/p_lesson_id uuid/);
    expect(createFn).toMatch(/p_block_type text/);
    expect(createFn).toMatch(/p_content jsonb default '\{\}'::jsonb/);
    expect(createFn).not.toMatch(/p_course_id/);
    expect(createFn).not.toMatch(/p_space_id/);
    // course/space resolved via chain and locked.
    expect(createFn).toMatch(/from public\.learning_sections\s+where id = v_lesson\.section_id/);
    expect(createFn).toMatch(/from public\.learning_courses\s+where id = v_section\.course_id/);
    expect(createFn).toMatch(/from public\.learning_programs\s+where id = v_course\.program_id/);
    expect(createFn).toMatch(/from public\.learning_spaces\s+where id = v_program\.space_id/);
  });
});

describe("Lesson Content Blocks Foundation V1 — authority inherits (no staff table)", () => {
  const sql = read(MIGRATION);

  it("creates NO block staff table and NO staff-assignment RPCs", () => {
    expect(sql).not.toMatch(/learning_lesson_content_block_staff/);
    expect(sql).not.toMatch(/assign_learning_lesson_content_block/);
  });

  it("can_manage defers to platform admin or can_manage_learning_lesson", () => {
    const start = sql.indexOf(
      "function public.can_manage_learning_lesson_content_block"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.can_create_learning_lesson_content_block")
    );
    expect(fn).toMatch(/is_platform_admin\(p_user_id\)/);
    expect(fn).toMatch(/can_manage_learning_lesson\(b\.lesson_id, p_user_id\)/);
  });

  it("can_create allows lesson manage or course staff ≥ instructor (space revalidated)", () => {
    const start = sql.indexOf(
      "function public.can_create_learning_lesson_content_block"
    );
    const fn = sql.slice(
      start,
      sql.indexOf(
        "revoke all on function public.can_manage_learning_lesson_content_block"
      )
    );
    expect(fn).toMatch(/can_manage_learning_lesson\(p_lesson_id, p_user_id\)/);
    expect(fn).toMatch(/is_learning_course_staff\(sec\.course_id, p_user_id\)/);
    expect(fn).toMatch(/learning_course_staff_role_rank\([\s\S]*?'instructor'/);
  });

  it("names both helpers in constants", () => {
    for (const name of Object.values(LEARNING_LESSON_CONTENT_BLOCK_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });
});

describe("Lesson Content Blocks Foundation V1 — RLS: learner reads via has_learning_course_access", () => {
  const sql = read(MIGRATION);

  it("learner SELECT requires published block + published lesson + has_learning_course_access", () => {
    const policyStart = sql.indexOf(
      'create policy "Entitled learners read published content blocks"'
    );
    // End before the next policy's leading comment block (which mentions
    // is_learning_space_member in prose) to inspect the learner policy only.
    const policyEnd = sql.indexOf("-- Authorized managers", policyStart);
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/to authenticated/);
    expect(policy).toMatch(/status = 'published'/);
    expect(policy).toMatch(/les\.status = 'published'/);
    expect(policy).toMatch(/public\.has_learning_course_access\(sec\.course_id\)/);
    // Does NOT gate learner content-body reads on plain space membership
    // (no is_learning_space_member function call in the learner policy).
    expect(policy).not.toMatch(/is_learning_space_member\(/);
    expect(LEARNING_LESSON_CONTENT_BLOCK_ACCESS_HELPER).toBe(
      "has_learning_course_access"
    );
  });

  it("drafts are hidden from entitled learners (learner policy is published-only)", () => {
    const policyStart = sql.indexOf(
      'create policy "Entitled learners read published content blocks"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Course staff read scoped content blocks"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    // The only status permitted in the learner path is 'published'.
    expect(policy).toMatch(/status = 'published'/);
    expect(policy).not.toMatch(/status = 'draft'/);
  });

  it("does NOT widen space-member draft access (no is_learning_space_member call anywhere)", () => {
    // Deliberate divergence: unlike Lessons/Activities, no policy grants plain
    // space members access to the content body (draft or published). The name
    // appears only in explanatory prose, never as a function call.
    expect(sql).not.toMatch(/is_learning_space_member\(/);
  });

  it("managers/course staff may read drafts within their scope", () => {
    const policyStart = sql.indexOf(
      'create policy "Course staff read scoped content blocks"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Content block managers read blocks"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/can_manage_learning_space\(p\.space_id\)/);
    expect(policy).toMatch(/can_manage_learning_program\(p\.id\)/);
    expect(policy).toMatch(/can_manage_learning_course\(c\.id\)/);
    expect(policy).toMatch(/is_learning_course_staff\(c\.id\)/);
  });

  it("has a separate authenticated platform-admin read policy", () => {
    expect(sql).toMatch(
      /create policy "Platform admins read all content blocks"[\s\S]*?using \(public\.is_platform_admin\(\)\)/
    );
  });
});

describe("Lesson Content Blocks Foundation V1 — no anon exposure", () => {
  const sql = read(MIGRATION);

  it("has NO anon SELECT policy and never grants table SELECT to anon", () => {
    expect(sql).not.toMatch(/\bto anon\b/);
    expect(sql).not.toMatch(/to anon, authenticated/);
    expect(sql).toMatch(
      /grant select on table public\.learning_lesson_content_blocks to authenticated/
    );
    expect(sql).not.toMatch(/grant select on table[\s\S]*?to anon/);
  });

  it("never calls is_platform_admin on an anon path (no anon policy target)", () => {
    // No policy/grant targets anon (word-boundary avoids matching "anonymous"
    // in prose), so is_platform_admin is only reachable from authenticated paths.
    expect(sql).not.toMatch(/\bto anon\b/);
  });
});

describe("Lesson Content Blocks Foundation V1 — parent gates & lifecycle", () => {
  const sql = read(MIGRATION);

  it("requires active space and draft|published program/course/section/lesson on every mutation", () => {
    expect(
      (
        sql.match(
          /Learning space must be active for content block changes/g
        ) ?? []
      ).length
    ).toBeGreaterThanOrEqual(6);
    expect(sql).toMatch(
      /learning_lesson_content_block_require_parent_program_status/
    );
    expect(sql).toMatch(
      /Parent program must be draft or published for content block changes/
    );
    expect(sql).toMatch(
      /learning_lesson_content_block_require_parent_course_status/
    );
    expect(sql).toMatch(
      /learning_lesson_content_block_require_parent_section_status/
    );
    expect(sql).toMatch(
      /learning_lesson_content_block_require_parent_lesson_status/
    );
  });

  it("rejects normal mutations on suspended/archived blocks (moderate only)", () => {
    expect(sql).toMatch(
      /learning_lesson_content_block_require_mutable_status/
    );
    expect(sql).toMatch(
      /Content block is %; only platform moderation may change it/
    );
  });

  it("archive is blocked while suspended (platform moderate only)", () => {
    const start = sql.indexOf(
      "function public.archive_learning_lesson_content_block"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.moderate_learning_lesson_content_block")
    );
    expect(fn).toMatch(
      /Content block is suspended; only platform moderation may change it/
    );
  });

  it("platform moderate accepts suspended|published|archived only", () => {
    expect(sql).toMatch(
      /moderate_learning_lesson_content_block status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });
});

describe("Lesson Content Blocks Foundation V1 — publish/unpublish idempotent", () => {
  const sql = read(MIGRATION);

  it("publish is idempotent (already-published → no-op success)", () => {
    const start = sql.indexOf(
      "function public.publish_learning_lesson_content_block"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.unpublish_learning_lesson_content_block")
    );
    expect(fn).toMatch(
      /if v_block\.status = 'published' then[\s\S]*?return jsonb_build_object/
    );
    expect(fn).toMatch(/status = 'published'/);
    expect(fn).toMatch(/published_at = coalesce\(published_at, now\(\)\)/);
  });

  it("unpublish is idempotent (already-draft → no-op success) and transitions to draft", () => {
    const start = sql.indexOf(
      "function public.unpublish_learning_lesson_content_block"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.archive_learning_lesson_content_block")
    );
    expect(fn).toMatch(
      /if v_block\.status = 'draft' then[\s\S]*?return jsonb_build_object/
    );
    expect(fn).toMatch(/set status = 'draft'/);
  });

  it("both refuse suspended/archived blocks (moderation only)", () => {
    const pubStart = sql.indexOf(
      "function public.publish_learning_lesson_content_block"
    );
    const unpubEnd = sql.indexOf(
      "function public.archive_learning_lesson_content_block"
    );
    const region = sql.slice(pubStart, unpubEnd);
    expect(
      (region.match(/only platform moderation may change it/g) ?? []).length
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("Lesson Content Blocks Foundation V1 — safe reorder (two-phase, no unique position)", () => {
  const sql = read(MIGRATION);

  it("reorder is transactional within lesson with full unique set + belongs check", () => {
    const start = sql.indexOf(
      "function public.reorder_learning_lesson_content_blocks"
    );
    const fn = sql.slice(start);
    expect(fn).toMatch(/for update/);
    expect(fn).toMatch(/requires all block ids for the lesson/);
    expect(fn).toMatch(/block_ids must be unique/);
    expect(fn).toMatch(/All block_ids must belong to the lesson/);
    expect(fn).toMatch(/position = \(u\.ord::integer - 1\)/);
    expect(fn).toMatch(
      /Cannot reorder while a content block is suspended or archived/
    );
    expect(fn).toMatch(/and b\.lesson_id = p_lesson_id/);
  });

  it("has NO UNIQUE(lesson_id, position) (Plan-B compatible; reserved learning_lesson_items)", () => {
    expect(sql).not.toMatch(/unique \(lesson_id, position\)/i);
    expect(sql).toMatch(/learning_lesson_items/i);
    expect(sql).toMatch(/order within the parent lesson/i);
  });

  it("appends new blocks at max(position)+1", () => {
    const start = sql.indexOf(
      "function public.create_learning_lesson_content_block("
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.update_learning_lesson_content_block")
    );
    expect(fn).toMatch(/coalesce\(max\(b\.position\), -1\) \+ 1/);
  });
});

describe("Lesson Content Blocks Foundation V1 — payload validation & unsafe HTML", () => {
  const sql = read(MIGRATION);

  it("validates content object-only and bounded to 16384 bytes", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_lesson_content_block_validate_content/
    );
    expect(sql).toMatch(/content must be a JSON object/);
    expect(sql).toMatch(/v_max_bytes integer := 16384/);
    expect(LEARNING_LESSON_CONTENT_BLOCK_LIMITS.contentMaxBytes).toBe(16384);
  });

  it("rejects raw HTML/JS/iframe/event-handlers in text fields", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_lesson_content_block_assert_safe_text/
    );
    const start = sql.indexOf(
      "function public.learning_lesson_content_block_assert_safe_text"
    );
    const fn = sql.slice(start, start + 900);
    expect(fn).toMatch(/script\|iframe\|object\|embed\|html/);
    expect(fn).toMatch(/javascript\|vbscript/);
    expect(fn).toMatch(/data\\s\*:\\s\*text\/html/);
    expect(fn).toMatch(/on\[a-z\]\+\\s\*=/);
    expect(fn).toMatch(/contains unsafe HTML or script content/);
  });

  it("validates media references as http(s)-only opaque URLs (no upload/buckets)", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_lesson_content_block_assert_safe_url/
    );
    const start = sql.indexOf(
      "function public.learning_lesson_content_block_assert_safe_url"
    );
    const fn = sql.slice(start, start + 900);
    expect(fn).toMatch(/must be a valid http\(s\) URL/);
    expect(fn).toMatch(/contains an unsafe scheme/);
    expect(fn).toMatch(/exceeds maximum length/);
    expect(LEARNING_LESSON_CONTENT_BLOCK_LIMITS.urlMaxChars).toBe(2048);
    // No storage/upload/signed-url machinery anywhere (target real constructs,
    // not prose mentioning "storage" / "signed-URL").
    expect(sql).not.toMatch(/\bstorage\.(objects|buckets|foldername)/i);
    expect(sql).not.toMatch(/create_signed_url/i);
    expect(sql).not.toMatch(/create\s+bucket/i);
    expect(sql).not.toMatch(/storage\.create/i);
  });

  it("validates heading levels 1..6, callout variants, code language, rich_text format", () => {
    expect(sql).toMatch(/heading\.level must be an integer between 1 and 6/);
    expect([...LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS]).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(sql).toMatch(
      /callout\.variant must be info\|note\|tip\|success\|warning\|danger/
    );
    for (const v of LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS) {
      expect(sql).toMatch(new RegExp(`'${v}'`));
    }
    expect(sql).toMatch(/code_block\.language must be a short identifier/);
    expect(LEARNING_LESSON_CONTENT_BLOCK_CODE_LANGUAGE_PATTERN.test("ts")).toBe(
      true
    );
    expect(
      LEARNING_LESSON_CONTENT_BLOCK_CODE_LANGUAGE_PATTERN.test("<script>")
    ).toBe(false);
    expect(sql).toMatch(/rich_text\.format must be plain or markdown/);
  });

  it("enforces a strict per-type content key allowlist", () => {
    expect(sql).toMatch(/content contains unexpected key % for type %/);
    // Constants mirror the SQL per-type key allowlists.
    expect(LEARNING_LESSON_CONTENT_BLOCK_CONTENT_KEYS.heading).toEqual([
      "text",
      "level",
    ]);
    expect(LEARNING_LESSON_CONTENT_BLOCK_CONTENT_KEYS.image).toEqual([
      "url",
      "alt",
      "caption",
    ]);
    expect(LEARNING_LESSON_CONTENT_BLOCK_CONTENT_KEYS.code_block).toEqual([
      "code",
      "language",
    ]);
  });
});

describe("Lesson Content Blocks Foundation V1 — unauthorized writes denied", () => {
  const sql = read(MIGRATION);

  it("create/update/publish/unpublish/archive check authority explicitly", () => {
    expect(sql).toMatch(/Not allowed to create content blocks in this lesson/);
    expect(sql).toMatch(/Not allowed to update this content block/);
    expect(sql).toMatch(/Not allowed to publish this content block/);
    expect(sql).toMatch(/Not allowed to unpublish this content block/);
    expect(sql).toMatch(/Not allowed to archive this content block/);
    expect(sql).toMatch(/Not allowed to reorder content blocks in this lesson/);
  });

  it("requires authentication (auth.uid()) in every RPC", () => {
    for (const name of Object.values(LEARNING_LESSON_CONTENT_BLOCK_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 900);
      expect(body).toMatch(/v_uid uuid := auth\.uid\(\)/);
      expect(body).toMatch(/Authentication required/);
    }
  });

  it("update sets server-authoritative updated_by = auth.uid() (no client identity)", () => {
    const start = sql.indexOf(
      "function public.update_learning_lesson_content_block"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.publish_learning_lesson_content_block")
    );
    expect(fn).toMatch(/updated_by = v_uid/);
    expect(fn).not.toMatch(/p_updated_by/);
    expect(fn).not.toMatch(/p_created_by/);
  });
});

describe("Lesson Content Blocks Foundation V1 — security hardening", () => {
  const sql = read(MIGRATION);

  it("FORCE + ENABLE RLS on the table; clients cannot write directly", () => {
    expect(sql).toMatch(
      /alter table public\.learning_lesson_content_blocks enable row level security/
    );
    expect(sql).toMatch(
      /alter table public\.learning_lesson_content_blocks force row level security/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_lesson_content_blocks/
    );
  });

  it("all RPCs are SECURITY DEFINER with search_path = public", () => {
    for (const name of Object.values(LEARNING_LESSON_CONTENT_BLOCK_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 400);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
    }
  });

  it("grants RPC EXECUTE to authenticated+service_role, revokes from public/anon", () => {
    for (const name of Object.values(LEARNING_LESSON_CONTENT_BLOCK_RPCS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([\\s\\S]*?\\)\\s+from public, anon`,
          "i"
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([\\s\\S]*?\\)\\s+to authenticated, service_role`,
          "i"
        )
      );
    }
  });

  it("keeps validators internal (revoked from public/anon/authenticated)", () => {
    expect(sql).toMatch(
      /revoke all on function public\.learning_lesson_content_block_validate_type\([\s\S]*?from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_lesson_content_block_validate_content\([\s\S]*?from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_lesson_content_block_assert_safe_url\([\s\S]*?from public, anon, authenticated/
    );
  });

  it("grants table SELECT to authenticated and all to service_role only", () => {
    expect(sql).toMatch(
      /grant select on table public\.learning_lesson_content_blocks to authenticated/
    );
    expect(sql).toMatch(
      /grant all on table public\.learning_lesson_content_blocks to service_role/
    );
  });
});

describe("Lesson Content Blocks Foundation V1 — audit & scope containment", () => {
  const sql = read(MIGRATION);

  it("audits the full lifecycle via learning_audit_write", () => {
    for (const action of Object.values(
      LEARNING_LESSON_CONTENT_BLOCK_AUDIT_ACTIONS
    )) {
      expect(sql).toMatch(new RegExp(`'${action.replace(".", "\\.")}'`));
    }
    expect(Object.values(LEARNING_LESSON_CONTENT_BLOCK_AUDIT_ACTIONS)).toEqual([
      "content_block.create",
      "content_block.update",
      "content_block.publish",
      "content_block.unpublish",
      "content_block.archive",
      "content_block.moderation",
      "content_block.reorder",
    ]);
  });

  it("does NOT create any out-of-scope tables/objects", () => {
    // Target actual `create table if not exists public.<name>` statements so
    // scope words in explanatory comments do not cause false positives.
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual(["learning_lesson_content_blocks"]);
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_lesson_items/i
    );
    expect(sql).not.toMatch(/create table if not exists public\.\w*progress/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*attempt/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*question/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*assignment/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*certificate/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*grade/i);
    // No new RPCs for progress/attempts/questions/etc.
    expect(sql).not.toMatch(/create or replace function public\.\w*attempt/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*question/i);
  });

  it("names all client RPCs in constants and SQL", () => {
    for (const name of Object.values(LEARNING_LESSON_CONTENT_BLOCK_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });
});

describe("Lesson Content Blocks Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, learner access, exclusions, and next slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Lesson Content Blocks Foundation V1/i);
    expect(doc).toMatch(/learning_lesson_content_blocks/);
    expect(doc).toMatch(
      /Space → Program → Course → Section → Lesson|Space -> Program -> Course -> Section -> Lesson/
    );
    expect(doc).toMatch(/has_learning_course_access/);
    expect(doc).toMatch(/no (anonymous|anon).{0,40}SELECT/i);
    expect(doc).toMatch(/reserved|deferred/i);
    expect(doc).toMatch(/learning_lesson_items/);
    expect(doc).toMatch(/reorder_learning_lesson_content_blocks/);
  });
});
