import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_QUESTION_ANSWER_KEY_KEYS,
  LEARNING_QUESTION_AUDIT_ACTIONS,
  LEARNING_QUESTION_CONTENT_KEYS,
  LEARNING_QUESTION_CREATABLE_TYPES,
  LEARNING_QUESTION_DEFERRED_TYPES,
  LEARNING_QUESTION_HELPERS,
  LEARNING_QUESTION_KEY_PATTERN,
  LEARNING_QUESTION_LIMITS,
  LEARNING_QUESTION_NORMALIZATION_KEYS,
  LEARNING_QUESTION_RESERVED_TYPES,
  LEARNING_QUESTION_RPCS,
  LEARNING_QUESTION_STATUSES,
  LEARNING_QUESTION_TYPES,
} from "./questionsFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260837_learning_questions_foundation_v1.sql";
const DOC = "docs/learning/implementation/QUESTIONS_FOUNDATION_V1.md";
const CONTENT_BLOCKS_MIGRATION =
  "supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql";
const ACTIVITIES_MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
const PROGRESS_MIGRATION =
  "supabase/migrations/20260835_learning_progress_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Questions Foundation V1 — files & ordering", () => {
  it("ships migration, constants module, documentation, and prior deps exist", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/questionsFoundation.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, CONTENT_BLOCKS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ACTIVITIES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRESS_MIGRATION))).toBe(true);
  });

  it("is ordered after Content Blocks (20260837 > 20260836)", () => {
    expect(MIGRATION > CONTENT_BLOCKS_MIGRATION).toBe(true);
  });

  it("does NOT modify prior committed migrations (20260828–20260836 untouched here)", () => {
    // This slice only adds 20260837; the file name encodes that invariant.
    expect(MIGRATION).toContain("20260837");
  });
});

describe("Questions Foundation V1 — schema: both tables", () => {
  const sql = read(MIGRATION);

  it("creates exactly two tables: learning_questions + learning_question_answer_keys", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_questions",
      "learning_question_answer_keys",
    ]);
  });

  it("scopes each question to exactly one activity with ON DELETE RESTRICT", () => {
    expect(sql).toMatch(
      /activity_id uuid not null\s*\n\s*references public\.learning_activities \(id\) on delete restrict/
    );
  });

  it("answer keys are 1:1 with question (question_id PK FK ON DELETE CASCADE)", () => {
    expect(sql).toMatch(
      /question_id uuid primary key\s*\n\s*references public\.learning_questions \(id\) on delete cascade/
    );
    expect(sql).toMatch(/answer_key jsonb not null default '\{\}'::jsonb/);
    expect(sql).toMatch(/learning_question_answer_keys_object/);
  });

  it("declares statuses, non-negative position, object content, and inert points", () => {
    expect([...LEARNING_QUESTION_STATUSES]).toEqual([
      "draft",
      "published",
      "suspended",
      "archived",
    ]);
    expect(sql).toMatch(/learning_questions_status_check/);
    expect(sql).toMatch(/position integer not null/);
    expect(sql).toMatch(/learning_questions_position_non_negative/);
    expect(sql).toMatch(/position >= 0/);
    expect(sql).toMatch(/content jsonb not null default '\{\}'::jsonb/);
    expect(sql).toMatch(/jsonb_typeof\(content\) = 'object'/);
    expect(sql).toMatch(/points numeric/);
    expect(sql).toMatch(/learning_questions_points_non_negative/);
    expect(sql).toMatch(/inert/i);
  });

  it("tracks created_by/updated_by and lifecycle timestamps", () => {
    expect(sql).toMatch(
      /created_by uuid not null\s*\n\s*references public\.profiles \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /updated_by uuid\s*\n\s*references public\.profiles \(id\) on delete set null/
    );
    expect(sql).toMatch(/published_at timestamptz/);
    expect(sql).toMatch(/suspended_at timestamptz/);
    expect(sql).toMatch(/archived_at timestamptz/);
  });

  it("declares required indexes", () => {
    expect(sql).toMatch(/learning_questions_activity_status_idx/);
    expect(sql).toMatch(
      /learning_questions_activity_position_idx[\s\S]*?\(activity_id, position, id\)/
    );
    expect(sql).toMatch(/learning_questions_type_idx/);
    expect(sql).toMatch(/learning_questions_created_by_idx/);
  });

  it("enforces identity immutability via a guard trigger (activity_id/question_type/created_by/created_at)", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_question_guard_immutable/
    );
    const start = sql.indexOf(
      "function public.learning_question_guard_immutable"
    );
    const fn = sql.slice(start, start + 700);
    expect(fn).toMatch(/new\.activity_id is distinct from old\.activity_id/);
    expect(fn).toMatch(/new\.question_type is distinct from old\.question_type/);
    expect(fn).toMatch(/new\.created_by is distinct from old\.created_by/);
    expect(fn).toMatch(/new\.created_at is distinct from old\.created_at/);
    expect(fn).toMatch(/identity columns are immutable/);
    expect(sql).toMatch(
      /create trigger learning_questions_guard_immutable[\s\S]*?before update/
    );
    // No RPC ever assigns the immutable columns.
    expect(sql).not.toMatch(/set\s+activity_id\s*=/i);
    expect(sql).not.toMatch(/set\s+question_type\s*=/i);
    expect(sql).not.toMatch(/set\s+created_by\s*=/i);
  });
});

describe("Questions Foundation V1 — Activity → Question only (no banks/reuse/move)", () => {
  const sql = read(MIGRATION);

  it("stores only activity_id (no denormalized course_id/space_id/lesson_id columns)", () => {
    const tableStart = sql.indexOf(
      "create table if not exists public.learning_questions"
    );
    const tableEnd = sql.indexOf(");", tableStart);
    const tableBody = sql.slice(tableStart, tableEnd);
    expect(tableBody).not.toMatch(/course_id/);
    expect(tableBody).not.toMatch(/space_id/);
    expect(tableBody).not.toMatch(/lesson_id/);
    expect(tableBody).toMatch(/activity_id uuid not null/);
  });

  it("creates NO bank/join/pool/reuse tables", () => {
    expect(sql).not.toMatch(
      /create table if not exists public\.\w*question_bank/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.\w*question_pool/i
    );
    expect(sql).not.toMatch(
      /create table if not exists public\.learning_activity_questions/i
    );
    expect(sql).not.toMatch(/create table if not exists public\.\w*_pool/i);
  });

  it("a question can NEVER be moved to another activity (no RPC assigns activity_id)", () => {
    expect(sql).not.toMatch(/set\s+activity_id\s*=/i);
    // reorder is scoped to a single activity and cannot cross activities.
    const start = sql.indexOf(
      "function public.reorder_learning_questions"
    );
    const fn = sql.slice(start);
    expect(fn).toMatch(/and q\.activity_id = p_activity_id/);
    expect(fn).toMatch(/All question_ids must belong to the activity/);
  });

  it("derives course/space/lesson from the parent chain in create (no client scope input)", () => {
    const createStart = sql.indexOf(
      "function public.create_learning_question("
    );
    const createFn = sql.slice(
      createStart,
      sql.indexOf("function public.update_learning_question")
    );
    expect(createFn).toMatch(/p_activity_id uuid/);
    expect(createFn).toMatch(/p_question_type text/);
    expect(createFn).toMatch(/p_content jsonb default '\{\}'::jsonb/);
    expect(createFn).not.toMatch(/p_course_id/);
    expect(createFn).not.toMatch(/p_space_id/);
    expect(createFn).not.toMatch(/p_lesson_id/);
    expect(createFn).not.toMatch(/p_created_by/);
    expect(createFn).toMatch(/from public\.learning_lessons\s+where id = v_activity\.lesson_id/);
    expect(createFn).toMatch(/from public\.learning_sections\s+where id = v_lesson\.section_id/);
    expect(createFn).toMatch(/from public\.learning_courses\s+where id = v_section\.course_id/);
    expect(createFn).toMatch(/from public\.learning_programs\s+where id = v_course\.program_id/);
    expect(createFn).toMatch(/from public\.learning_spaces\s+where id = v_program\.space_id/);
  });
});

describe("Questions Foundation V1 — type allowlist (V1/reserved/deferred)", () => {
  const sql = read(MIGRATION);

  it("exposes the 8-value immutable allowlist (6 creatable + 2 reserved)", () => {
    expect([...LEARNING_QUESTION_CREATABLE_TYPES]).toEqual([
      "multiple_choice_single",
      "multiple_choice_multiple",
      "true_false",
      "short_answer",
      "fill_blank",
      "numeric",
    ]);
    expect([...LEARNING_QUESTION_RESERVED_TYPES]).toEqual([
      "long_answer",
      "essay",
    ]);
    expect(LEARNING_QUESTION_TYPES).toHaveLength(8);
    expect(sql).toMatch(/learning_questions_type_check/);
    for (const t of LEARNING_QUESTION_TYPES) {
      expect(sql).toMatch(new RegExp(`'${t}'`));
    }
  });

  it("REJECTS reserved types (long_answer/essay) at create time", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_question_validate_type/
    );
    const start = sql.indexOf(
      "function public.learning_question_validate_type"
    );
    const fn = sql.slice(start, start + 900);
    expect(fn).toMatch(/p_is_create and p_type in \('long_answer', 'essay'\)/);
    expect(fn).toMatch(/is reserved and cannot be created in V1/);
    // create passes p_is_create = true
    const createStart = sql.indexOf(
      "function public.create_learning_question"
    );
    const createFn = sql.slice(
      createStart,
      sql.indexOf("function public.update_learning_question")
    );
    expect(createFn).toMatch(
      /learning_question_validate_type\(v_type, true\)/
    );
  });

  it("fails closed on fully deferred types (matching/ordering/file_upload/... not in allowlist)", () => {
    const checkStart = sql.indexOf("learning_questions_type_check");
    const checkSlice = sql.slice(checkStart, checkStart + 400);
    for (const t of LEARNING_QUESTION_DEFERRED_TYPES) {
      expect(checkSlice).not.toMatch(new RegExp(`'${t}'`));
    }
    expect(sql).toMatch(/Invalid question type/);
  });

  it("does NOT implement matching/ordering validators (fully deferred)", () => {
    // Deferred types are absent from the DB allowlist (fail closed); they may be
    // named only in explanatory comments/constants, never implemented.
    const checkStart = sql.indexOf("learning_questions_type_check");
    const checkSlice = sql.slice(checkStart, checkStart + 400);
    expect(checkSlice).not.toMatch(/'matching'/);
    expect(checkSlice).not.toMatch(/'ordering'/);
    // No dedicated matching/ordering validator functions or dispatcher branches.
    expect(sql).not.toMatch(/create or replace function public\.\w*matching/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*ordering/i);
    expect(sql).not.toMatch(/p_type = 'matching'/);
    expect(sql).not.toMatch(/p_type = 'ordering'/);
  });

  it("question_type is immutable (update RPC takes no question_type param)", () => {
    expect(sql).toMatch(/Immutable question type allowlist/i);
    const updateStart = sql.indexOf(
      "function public.update_learning_question"
    );
    const updateFn = sql.slice(
      updateStart,
      sql.indexOf("function public.set_learning_question_answer_key")
    );
    expect(updateFn).not.toMatch(/p_question_type/);
  });
});

describe("Questions Foundation V1 — per-type content validation", () => {
  const sql = read(MIGRATION);

  it("validates content object-only and bounded to 16384 bytes with a prompt", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_question_validate_content/
    );
    expect(sql).toMatch(/content must be a JSON object/);
    expect(sql).toMatch(/v_max_bytes integer := 16384/);
    expect(sql).toMatch(/prompt must be between 1 and 4000 chars/);
    expect(LEARNING_QUESTION_LIMITS.contentMaxBytes).toBe(16384);
    expect(LEARNING_QUESTION_LIMITS.promptMaxChars).toBe(4000);
  });

  it("rejects raw HTML/JS/iframe/event-handlers in text fields (safe-text)", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_question_assert_safe_text/
    );
    const start = sql.indexOf(
      "function public.learning_question_assert_safe_text"
    );
    const fn = sql.slice(start, start + 900);
    expect(fn).toMatch(/script\|iframe\|object\|embed\|html/);
    expect(fn).toMatch(/javascript\|vbscript/);
    expect(fn).toMatch(/contains unsafe HTML or script content/);
  });

  it("MCQ: ordered options with stable unique keys, min 2, bounded text, no duplicates", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_question_validate_options/
    );
    const start = sql.indexOf(
      "function public.learning_question_validate_options"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.learning_question_validate_content")
    );
    expect(fn).toMatch(/options must be an array/);
    expect(fn).toMatch(/options must contain at least 2 entries/);
    expect(fn).toMatch(/option\.key must match/);
    expect(fn).toMatch(/option keys must be unique/);
    expect(fn).toMatch(/option\.text must be between 1 and 1000 chars/);
    expect(LEARNING_QUESTION_LIMITS.minOptions).toBe(2);
    expect(LEARNING_QUESTION_KEY_PATTERN.test("opt_1")).toBe(true);
    expect(LEARNING_QUESTION_KEY_PATTERN.test("<script>")).toBe(false);
  });

  it("true_false content is prompt-only (correctness lives only in the key)", () => {
    expect(LEARNING_QUESTION_CONTENT_KEYS.true_false).toEqual(["prompt"]);
  });

  it("fill_blank declares bounded blanks with clear unique keys", () => {
    expect(sql).toMatch(/blanks must be an array/);
    expect(sql).toMatch(/blank\.key must match/);
    expect(sql).toMatch(/blank keys must be unique/);
    expect(sql).toMatch(/blanks exceeds the maximum of 20 entries/);
    expect(LEARNING_QUESTION_CONTENT_KEYS.fill_blank).toEqual([
      "prompt",
      "blanks",
    ]);
    expect(LEARNING_QUESTION_LIMITS.maxBlanks).toBe(20);
  });

  it("numeric content is prompt (+ optional bounded unit); no expression evaluator", () => {
    expect(sql).toMatch(/unit must be a string up to 64 chars/);
    expect(LEARNING_QUESTION_CONTENT_KEYS.numeric).toEqual(["prompt", "unit"]);
    // No equation/expression evaluator machinery.
    expect(sql).not.toMatch(/eval\(/i);
    expect(sql).not.toMatch(/to_expression/i);
  });

  it("enforces a strict per-type content key allowlist (no correctness flags)", () => {
    expect(sql).toMatch(/content contains unexpected key % for type %/);
    // content never carries correctness (correct_key/correct/answers live in key)
    const start = sql.indexOf(
      "function public.learning_question_validate_content"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.learning_question_validate_answer_key")
    );
    expect(fn).not.toMatch(/correct_key/);
    expect(fn).not.toMatch(/correct_keys/);
  });
});

describe("Questions Foundation V1 — per-type answer key validation", () => {
  const sql = read(MIGRATION);
  const start = sql.indexOf(
    "function public.learning_question_validate_answer_key"
  );
  const fn = sql.slice(
    start,
    sql.indexOf(
      "function public.learning_question_require_mutable_status"
    )
  );

  it("answer_key is object-only and bounded to 16384 bytes", () => {
    expect(fn).toMatch(/answer_key must be a JSON object/);
    expect(fn).toMatch(/answer_key exceeds maximum size of % bytes/);
    expect(LEARNING_QUESTION_LIMITS.answerKeyMaxBytes).toBe(16384);
  });

  it("MCQ single: exactly one correct key that must exist among options", () => {
    expect(fn).toMatch(/answer_key\.correct_key must be a string/);
    expect(fn).toMatch(
      /answer_key\.correct_key must reference an existing option key/
    );
    expect(LEARNING_QUESTION_ANSWER_KEY_KEYS.multiple_choice_single).toEqual([
      "correct_key",
    ]);
  });

  it("MCQ multiple: at least one, unique, all keys must exist among options", () => {
    expect(fn).toMatch(/answer_key\.correct_keys must be an array/);
    expect(fn).toMatch(
      /answer_key\.correct_keys must contain at least 1 key/
    );
    expect(fn).toMatch(
      /answer_key\.correct_keys must reference existing option keys/
    );
    expect(fn).toMatch(/answer_key\.correct_keys must be unique/);
    expect(LEARNING_QUESTION_ANSWER_KEY_KEYS.multiple_choice_multiple).toEqual([
      "correct_keys",
    ]);
  });

  it("true_false: answer_key boolean only", () => {
    expect(fn).toMatch(/answer_key\.correct must be a boolean/);
    expect(LEARNING_QUESTION_ANSWER_KEY_KEYS.true_false).toEqual(["correct"]);
  });

  it("short_answer: bounded accepted answers + normalization allowlist (no regex)", () => {
    expect(fn).toMatch(/answer_key\.accepted must be an array/);
    expect(fn).toMatch(/answer_key\.accepted entries must be 1\.\.200 chars/);
    expect(fn).toMatch(
      /answer_key\.accepted exceeds the maximum of 20 entries/
    );
    expect(fn).toMatch(/normalization contains unexpected key/);
    expect(fn).toMatch(/normalization\.% must be a boolean/);
    expect([...LEARNING_QUESTION_NORMALIZATION_KEYS]).toEqual([
      "trim",
      "case_sensitive",
    ]);
    // Normalization is a booleans-only allowlist (trim / case_sensitive); there
    // is no client-supplied regex field in the allowlist.
    expect(fn).not.toMatch(/'regex'/);
    expect(fn).not.toMatch(/~\s*p_answer_key/);
  });

  it("fill_blank: answer_key covers ALL blanks (complete) and only known blanks", () => {
    expect(fn).toMatch(/answer_key\.answers must be a JSON object/);
    expect(fn).toMatch(/answer_key\.answers references unknown blank/);
    expect(fn).toMatch(/answer_key\.answers must cover all blanks/);
    expect(LEARNING_QUESTION_ANSWER_KEY_KEYS.fill_blank).toEqual(["answers"]);
  });

  it("numeric: numeric value with optional non-negative tolerance; no evaluator", () => {
    expect(fn).toMatch(/answer_key\.value must be a number/);
    expect(fn).toMatch(/answer_key\.tolerance must be a number/);
    expect(fn).toMatch(/answer_key\.tolerance must be non-negative/);
    expect(LEARNING_QUESTION_ANSWER_KEY_KEYS.numeric).toEqual([
      "value",
      "tolerance",
    ]);
  });

  it("enforces a strict per-type answer_key key allowlist", () => {
    expect(fn).toMatch(/answer_key contains unexpected key % for type %/);
  });
});

describe("Questions Foundation V1 — answer keys are staff/platform-only & never leaked", () => {
  const sql = read(MIGRATION);

  it("answer key table has FORCE + ENABLE RLS and no anon/learner grant", () => {
    expect(sql).toMatch(
      /alter table public\.learning_question_answer_keys enable row level security/
    );
    expect(sql).toMatch(
      /alter table public\.learning_question_answer_keys force row level security/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_question_answer_keys/
    );
    expect(sql).toMatch(
      /grant select on table public\.learning_question_answer_keys to authenticated/
    );
    expect(sql).not.toMatch(/\bto anon\b/);
  });

  it("answer key SELECT policies are staff/platform only (never learner, never space member)", () => {
    expect(sql).toMatch(
      /create policy "Course staff read scoped answer keys"/
    );
    expect(sql).toMatch(/create policy "Question managers read answer keys"/);
    expect(sql).toMatch(/create policy "Platform admins read all answer keys"/);
    // No learner/space-member path anywhere in the migration.
    expect(sql).not.toMatch(/is_learning_space_member\(/);
    expect(sql).not.toMatch(/has_learning_course_access\(/);
  });

  it("answer keys are written only via set_learning_question_answer_key", () => {
    const writes = [
      ...sql.matchAll(/insert into public\.learning_question_answer_keys/g),
    ];
    expect(writes.length).toBe(1);
    const start = sql.indexOf(
      "function public.set_learning_question_answer_key"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.publish_learning_question")
    );
    expect(fn).toMatch(/insert into public\.learning_question_answer_keys/);
    expect(fn).toMatch(/on conflict \(question_id\) do update/);
    expect(fn).toMatch(
      /learning_question_validate_answer_key\(\s*v_question\.question_type, v_question\.content, v_answer_key/
    );
  });

  it("non-key RPCs never reference or return answer_key fields", () => {
    // Non-key RPC bodies never touch the answer key at all (they neither read,
    // join, nor return it). Slice each function to the next function boundary.
    const fnStarts = [
      ...sql.matchAll(/create or replace function public\.(\w+)/g),
    ];
    const boundaryFor = (name: string) => {
      const idx = fnStarts.findIndex((m) => m[1] === name);
      const start = fnStarts[idx].index ?? 0;
      const end =
        idx + 1 < fnStarts.length ? fnStarts[idx + 1].index ?? sql.length : sql.length;
      return sql.slice(start, end);
    };
    for (const name of [
      "create_learning_question",
      "update_learning_question",
      "publish_learning_question",
      "unpublish_learning_question",
      "archive_learning_question",
      "moderate_learning_question",
    ]) {
      const fn = boundaryFor(name);
      expect(fn).not.toMatch(/answer_key/);
    }
    // set_answer_key returns only a flag, never the payload.
    const setFn = boundaryFor("set_learning_question_answer_key");
    const setReturn = setFn.slice(setFn.lastIndexOf("return jsonb_build_object"));
    expect(setReturn).toMatch(/answer_key_set/);
    expect(setReturn).not.toMatch(/'answer_key',/);
  });

  it("no learner-facing read RPC returns questions or answer keys", () => {
    // Only mutating/staff RPCs exist — no get_/read_/list_ RPCs.
    expect(sql).not.toMatch(/function public\.get_learning_question/i);
    expect(sql).not.toMatch(/function public\.read_learning_question/i);
    expect(sql).not.toMatch(/function public\.list_learning_question/i);
  });
});

describe("Questions Foundation V1 — RLS: staff-only question reads (no learner/space member)", () => {
  const sql = read(MIGRATION);

  it("has staff/manager/admin question read policies but NO learner policy", () => {
    expect(sql).toMatch(/create policy "Course staff read scoped questions"/);
    expect(sql).toMatch(/create policy "Question managers read questions"/);
    expect(sql).toMatch(/create policy "Platform admins read all questions"/);
    // No entitled-learner policy at all.
    expect(sql).not.toMatch(/Entitled learners/);
  });

  it("ordinary space members get NO draft/question/answer_key reads", () => {
    // is_learning_space_member is never called anywhere in this migration.
    expect(sql).not.toMatch(/is_learning_space_member\(/);
  });

  it("does not widen the Activities M1 draft surface (no has_learning_course_access)", () => {
    expect(sql).not.toMatch(/has_learning_course_access\(/);
  });

  it("has NO anon SELECT policy and never grants table SELECT to anon", () => {
    expect(sql).not.toMatch(/\bto anon\b/);
    expect(sql).not.toMatch(/grant select on table[\s\S]*?to anon/);
    expect(sql).toMatch(
      /grant select on table public\.learning_questions to authenticated/
    );
  });
});

describe("Questions Foundation V1 — authority inherits (no staff table)", () => {
  const sql = read(MIGRATION);

  it("creates NO question staff table and NO staff-assignment RPCs", () => {
    expect(sql).not.toMatch(/learning_question_staff/);
    expect(sql).not.toMatch(/assign_learning_question/);
  });

  it("can_manage defers to platform admin or can_manage_learning_activity", () => {
    const start = sql.indexOf(
      "function public.can_manage_learning_question"
    );
    const fn = sql.slice(
      start,
      sql.indexOf("function public.can_create_learning_question")
    );
    expect(fn).toMatch(/is_platform_admin\(p_user_id\)/);
    expect(fn).toMatch(
      /can_manage_learning_activity\(q\.activity_id, p_user_id\)/
    );
  });

  it("can_create allows activity manage or course staff ≥ instructor (space revalidated)", () => {
    const start = sql.indexOf(
      "function public.can_create_learning_question"
    );
    const fn = sql.slice(
      start,
      sql.indexOf(
        "revoke all on function public.can_manage_learning_question"
      )
    );
    expect(fn).toMatch(
      /can_manage_learning_activity\(p_activity_id, p_user_id\)/
    );
    expect(fn).toMatch(/is_learning_course_staff\(sec\.course_id, p_user_id\)/);
    expect(fn).toMatch(/learning_course_staff_role_rank\([\s\S]*?'instructor'/);
  });

  it("names both helpers in constants", () => {
    for (const name of Object.values(LEARNING_QUESTION_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });
});

describe("Questions Foundation V1 — parent gates & lifecycle", () => {
  const sql = read(MIGRATION);

  it("requires active space and draft|published program/course/section/lesson/activity on every mutation", () => {
    expect(
      (
        sql.match(/Learning space must be active for question changes/g) ?? []
      ).length
    ).toBeGreaterThanOrEqual(6);
    expect(sql).toMatch(/learning_question_require_parent_program_status/);
    expect(sql).toMatch(/learning_question_require_parent_course_status/);
    expect(sql).toMatch(/learning_question_require_parent_section_status/);
    expect(sql).toMatch(/learning_question_require_parent_lesson_status/);
    expect(sql).toMatch(/learning_question_require_parent_activity_status/);
    expect(sql).toMatch(
      /Parent activity must be draft or published for question changes/
    );
  });

  it("rejects normal mutations on suspended/archived questions (moderate only)", () => {
    expect(sql).toMatch(/learning_question_require_mutable_status/);
    expect(sql).toMatch(
      /Question is %; only platform moderation may change it/
    );
  });

  it("archive is blocked while suspended (platform moderate only)", () => {
    const start = sql.indexOf("function public.archive_learning_question");
    const fn = sql.slice(
      start,
      sql.indexOf("function public.moderate_learning_question")
    );
    expect(fn).toMatch(
      /Question is suspended; only platform moderation may change it/
    );
  });

  it("platform moderate accepts suspended|published|archived only (admin-only)", () => {
    expect(sql).toMatch(
      /moderate_learning_question status must be suspended\|published\|archived/
    );
    expect(sql).toMatch(/Platform admin required/);
  });
});

describe("Questions Foundation V1 — publish/unpublish idempotent lifecycle", () => {
  const sql = read(MIGRATION);

  it("publish is idempotent (already-published → no-op success)", () => {
    const start = sql.indexOf("function public.publish_learning_question");
    const fn = sql.slice(
      start,
      sql.indexOf("function public.unpublish_learning_question")
    );
    expect(fn).toMatch(
      /if v_question\.status = 'published' then[\s\S]*?return jsonb_build_object/
    );
    expect(fn).toMatch(/published_at = coalesce\(published_at, now\(\)\)/);
  });

  it("unpublish is idempotent (already-draft → no-op) and transitions to draft", () => {
    const start = sql.indexOf("function public.unpublish_learning_question");
    const fn = sql.slice(
      start,
      sql.indexOf("function public.archive_learning_question")
    );
    expect(fn).toMatch(
      /if v_question\.status = 'draft' then[\s\S]*?return jsonb_build_object/
    );
    expect(fn).toMatch(/set status = 'draft'/);
  });

  it("activity/lesson/course publish does NOT auto-publish questions (explicit only)", () => {
    // No trigger/RPC cascades a parent publish into question publishing.
    expect(sql).not.toMatch(/auto.?publish/i);
    // Questions are created draft.
    const createStart = sql.indexOf("function public.create_learning_question");
    const createFn = sql.slice(
      createStart,
      sql.indexOf("function public.update_learning_question")
    );
    expect(createFn).toMatch(/'draft'/);
  });
});

describe("Questions Foundation V1 — safe reorder (two-phase, no unique position)", () => {
  const sql = read(MIGRATION);

  it("reorder is transactional within activity with full unique set + belongs check", () => {
    const start = sql.indexOf("function public.reorder_learning_questions");
    const fn = sql.slice(start);
    expect(fn).toMatch(/for update/);
    expect(fn).toMatch(/requires all question ids for the activity/);
    expect(fn).toMatch(/question_ids must be unique/);
    expect(fn).toMatch(/All question_ids must belong to the activity/);
    expect(fn).toMatch(/position = \(u\.ord::integer - 1\)/);
    expect(fn).toMatch(/Cannot reorder while a question is suspended or archived/);
    expect(fn).toMatch(/and q\.activity_id = p_activity_id/);
  });

  it("has NO UNIQUE(activity_id, position) (Plan-B compatible)", () => {
    expect(sql).not.toMatch(/unique \(activity_id, position\)/i);
  });

  it("appends new questions at max(position)+1 with the activity locked", () => {
    const start = sql.indexOf("function public.create_learning_question(");
    const fn = sql.slice(
      start,
      sql.indexOf("function public.update_learning_question")
    );
    expect(fn).toMatch(/coalesce\(max\(q\.position\), -1\) \+ 1/);
    expect(fn).toMatch(
      /from public\.learning_activities\s+where id = p_activity_id\s+for update/
    );
  });
});

describe("Questions Foundation V1 — security hardening & RPC-only writes", () => {
  const sql = read(MIGRATION);

  it("FORCE + ENABLE RLS on questions; clients cannot write directly", () => {
    expect(sql).toMatch(
      /alter table public\.learning_questions enable row level security/
    );
    expect(sql).toMatch(
      /alter table public\.learning_questions force row level security/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_questions/
    );
  });

  it("requires authentication (auth.uid()) in every RPC", () => {
    for (const name of Object.values(LEARNING_QUESTION_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 900);
      expect(body).toMatch(/v_uid uuid := auth\.uid\(\)/);
      expect(body).toMatch(/Authentication required/);
    }
  });

  it("all RPCs are SECURITY DEFINER with search_path = public", () => {
    for (const name of Object.values(LEARNING_QUESTION_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 400);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
    }
  });

  it("grants RPC EXECUTE to authenticated+service_role, revokes from public/anon", () => {
    for (const name of Object.values(LEARNING_QUESTION_RPCS)) {
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
      /revoke all on function public\.learning_question_validate_type\([\s\S]*?from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_question_validate_content\([\s\S]*?from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_question_validate_answer_key\([\s\S]*?from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_question_validate_options\([\s\S]*?from public, anon, authenticated/
    );
  });

  it("update sets server-authoritative updated_by = auth.uid() (no client identity)", () => {
    const start = sql.indexOf("function public.update_learning_question");
    const fn = sql.slice(
      start,
      sql.indexOf("function public.set_learning_question_answer_key")
    );
    expect(fn).toMatch(/updated_by = v_uid/);
    expect(fn).not.toMatch(/p_updated_by/);
    expect(fn).not.toMatch(/p_created_by/);
  });
});

describe("Questions Foundation V1 — audit & scope containment (no attempts/grades/banks)", () => {
  const sql = read(MIGRATION);

  it("audits the full lifecycle via learning_audit_write", () => {
    for (const action of Object.values(LEARNING_QUESTION_AUDIT_ACTIONS)) {
      expect(sql).toMatch(new RegExp(`'${action.replace(".", "\\.")}'`));
    }
    expect(Object.values(LEARNING_QUESTION_AUDIT_ACTIONS)).toEqual([
      "question.create",
      "question.update",
      "question.publish",
      "question.unpublish",
      "question.archive",
      "question.moderation",
      "question.reorder",
      "question.answer_key_set",
    ]);
  });

  it("does NOT create any out-of-scope tables (attempts/grades/certificates/assignments/banks/progress)", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_questions",
      "learning_question_answer_keys",
    ]);
    expect(sql).not.toMatch(/create table if not exists public\.\w*attempt/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*grade/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*score/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*certificate/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*assignment/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*response/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*submission/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*progress/i);
    // No attempt/grade RPCs.
    expect(sql).not.toMatch(/create or replace function public\.\w*attempt/i);
    expect(sql).not.toMatch(/create or replace function public\.\w*_grade/i);
  });

  it("names all client RPCs in constants and SQL", () => {
    for (const name of Object.values(LEARNING_QUESTION_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });
});

describe("Questions Foundation V1 — documentation", () => {
  it("documents scope, hierarchy, staff-only reads, answer-key secrecy, exclusions", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Questions Foundation V1/i);
    expect(doc).toMatch(/learning_questions/);
    expect(doc).toMatch(/learning_question_answer_keys/);
    expect(doc).toMatch(
      /Space → Program → Course → Section → Lesson → Activity → Question|Space -> Program -> Course -> Section -> Lesson -> Activity -> Question/
    );
    expect(doc).toMatch(/staff.?only/i);
    expect(doc).toMatch(/no (anonymous|anon).{0,40}SELECT/i);
    expect(doc).toMatch(/reserved|deferred/i);
    expect(doc).toMatch(/reorder_learning_questions/);
    expect(doc).toMatch(/Attempts/i);
  });
});
