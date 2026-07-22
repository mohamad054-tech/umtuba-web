import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES,
  LEARNING_ENROLLMENT_AUDIT_ACTIONS,
  LEARNING_ENROLLMENT_EVENT_TYPES,
  LEARNING_ENROLLMENT_HELPERS,
  LEARNING_ENROLLMENT_LIVE_STATUSES,
  LEARNING_ENROLLMENT_METADATA_LIMITS,
  LEARNING_ENROLLMENT_RPCS,
  LEARNING_ENROLLMENT_SOURCE_REFERENCE_LIMITS,
  LEARNING_ENROLLMENT_SOURCES,
  LEARNING_ENROLLMENT_STATUSES,
  LEARNING_ENROLLMENT_TARGET_TYPES,
  LEARNING_ENROLLMENT_TERMINAL_STATUSES,
} from "./enrollmentsFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260834_learning_enrollments_foundation_v1.sql";
const DOC = "docs/learning/implementation/ENROLLMENTS_FOUNDATION_V1.md";
const ACTIVITIES_MIGRATION =
  "supabase/migrations/20260833_learning_activities_foundation_v1.sql";
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

describe("Enrollments Foundation V1 — files", () => {
  it("ships migration, constants module, documentation, and depends on the full chain", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/learning/enrollmentsFoundation.ts"))
    ).toBe(true);
    expect(existsSync(join(ROOT, ACTIVITIES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, LESSONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SECTIONS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, COURSES_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, PROGRAMS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, SPACES_MIGRATION))).toBe(true);
  });

  it("is ordered after the Activities migration (20260834 > 20260833)", () => {
    expect(MIGRATION > ACTIVITIES_MIGRATION).toBe(true);
  });
});

describe("Enrollments Foundation V1 — enums mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes target types (Program XOR Course)", () => {
    expect([...LEARNING_ENROLLMENT_TARGET_TYPES]).toEqual(["program", "course"]);
    expect(sql).toMatch(/learning_enrollments_target_type_check/);
    expect(sql).toMatch(/target_type in \('program', 'course'\)/);
  });

  it("exposes the entitlement lifecycle statuses", () => {
    expect([...LEARNING_ENROLLMENT_STATUSES]).toEqual([
      "pending",
      "active",
      "suspended",
      "expired",
      "cancelled",
      "completed",
    ]);
    expect(sql).toMatch(/learning_enrollments_status_check/);
  });

  it("splits live vs terminal statuses consistently", () => {
    expect([...LEARNING_ENROLLMENT_LIVE_STATUSES]).toEqual([
      "pending",
      "active",
      "suspended",
    ]);
    expect([...LEARNING_ENROLLMENT_TERMINAL_STATUSES]).toEqual([
      "expired",
      "cancelled",
      "completed",
    ]);
    // Live + terminal must partition the full status set with no overlap.
    const union = new Set([
      ...LEARNING_ENROLLMENT_LIVE_STATUSES,
      ...LEARNING_ENROLLMENT_TERMINAL_STATUSES,
    ]);
    expect(union.size).toBe(LEARNING_ENROLLMENT_STATUSES.length);
    for (const s of LEARNING_ENROLLMENT_STATUSES) {
      expect(union.has(s)).toBe(true);
    }
  });

  it("exposes the immutable 10-source allowlist and mirrors it in SQL", () => {
    expect([...LEARNING_ENROLLMENT_SOURCES]).toEqual([
      "self_enrollment",
      "invitation",
      "admin_assignment",
      "institution_assignment",
      "corporate_assignment",
      "scholarship",
      "voucher",
      "gift",
      "bundle",
      "migration",
    ]);
    expect(LEARNING_ENROLLMENT_SOURCES).toHaveLength(10);
    expect(sql).toMatch(/learning_enrollments_source_check/);
    for (const source of LEARNING_ENROLLMENT_SOURCES) {
      expect(sql).toMatch(new RegExp(`'${source}'`));
    }
  });

  it("reserves self_enrollment for the learner-driven RPCs only", () => {
    expect(LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES).not.toContain(
      "self_enrollment"
    );
    expect(LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES).toHaveLength(9);
    expect(sql).toMatch(
      /self_enrollment is reserved for learner self-enrollment/
    );
  });

  it("exposes the append-only event types and mirrors them in SQL", () => {
    expect([...LEARNING_ENROLLMENT_EVENT_TYPES]).toEqual([
      "created",
      "activated",
      "suspended",
      "reinstated",
      "cancelled",
      "completed",
      "moderated",
      "expired",
    ]);
    expect(sql).toMatch(/learning_enrollment_events_type_check/);
    for (const evt of LEARNING_ENROLLMENT_EVENT_TYPES) {
      expect(sql).toMatch(new RegExp(`'${evt}'`));
    }
  });
});

describe("Enrollments Foundation V1 — target model (Program XOR Course)", () => {
  const sql = read(MIGRATION);

  it("uses nullable hard FKs + discriminator + denormalized space_id", () => {
    expect(sql).toMatch(
      /space_id uuid not null[\s\S]*?references public\.learning_spaces \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /program_id uuid[\s\S]*?references public\.learning_programs \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /course_id uuid[\s\S]*?references public\.learning_courses \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /user_id uuid not null[\s\S]*?references public\.profiles \(id\) on delete restrict/
    );
  });

  it("enforces exactly one target FK via an XOR check", () => {
    expect(sql).toMatch(/learning_enrollments_target_xor/);
    expect(sql).toMatch(
      /target_type = 'program'[\s\S]*?program_id is not null[\s\S]*?course_id is null/
    );
    expect(sql).toMatch(
      /target_type = 'course'[\s\S]*?course_id is not null[\s\S]*?program_id is null/
    );
  });

  it("uses SOFT references for payments/UEOS (no cross-product FKs)", () => {
    expect(sql).toMatch(/source_reference_type text/);
    expect(sql).toMatch(/source_reference_id text/);
    // No FK to payments/orders/UEOS tables.
    expect(sql).not.toMatch(/references public\.store_/i);
    expect(sql).not.toMatch(/references public\.ueos_/i);
    expect(sql).not.toMatch(/references public\.payments/i);
  });
});

describe("Enrollments Foundation V1 — one live enrollment per target", () => {
  const sql = read(MIGRATION);

  it("enforces partial unique indexes on non-terminal statuses", () => {
    expect(sql).toMatch(
      /create unique index[\s\S]*?learning_enrollments_one_live_program_uidx[\s\S]*?\(user_id, program_id\)[\s\S]*?status in \('pending', 'active', 'suspended'\)/
    );
    expect(sql).toMatch(
      /create unique index[\s\S]*?learning_enrollments_one_live_course_uidx[\s\S]*?\(user_id, course_id\)[\s\S]*?status in \('pending', 'active', 'suspended'\)/
    );
  });

  it("RPCs also guard the live-uniqueness invariant defensively", () => {
    expect(
      (sql.match(/A live enrollment already exists/g) ?? []).length
    ).toBeGreaterThanOrEqual(2);
    expect(
      (sql.match(/Another live enrollment already exists for this target/g) ??
        [])
        .length
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("Enrollments Foundation V1 — immutability & append-only events", () => {
  const sql = read(MIGRATION);

  it("guards identity/provenance columns as immutable", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_enrollments_guard_immutable/
    );
    expect(sql).toMatch(
      /identity\/provenance columns are immutable/
    );
    // space/target/user/source/created_at all guarded.
    const start = sql.indexOf(
      "create or replace function public.learning_enrollments_guard_immutable"
    );
    const end = sql.indexOf("create trigger", start);
    const fn = sql.slice(start, end);
    for (const col of [
      "space_id",
      "target_type",
      "program_id",
      "course_id",
      "user_id",
      "source",
      "created_at",
    ]) {
      expect(fn).toMatch(new RegExp(`new\\.${col} is distinct from old\\.${col}`));
    }
  });

  it("has an append-only events table forbidding update/delete", () => {
    expect(sql).toMatch(
      /create table if not exists public\.learning_enrollment_events/
    );
    expect(sql).toMatch(/learning_enrollment_events is append-only/);
    expect(sql).toMatch(
      /create or replace function public\.learning_enrollment_events_forbid_mutation/
    );
    expect(sql).toMatch(/learning_enrollment_events_forbid_update/);
    expect(sql).toMatch(/learning_enrollment_events_forbid_delete/);
  });

  it("event writer is internal only (never granted to clients)", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_enrollment_event_write/
    );
    expect(sql).toMatch(
      /revoke all on function public\.learning_enrollment_event_write[\s\S]*?from public, anon, authenticated/
    );
  });
});

describe("Enrollments Foundation V1 — helpers & entitlement (live)", () => {
  const sql = read(MIGRATION);

  it("names all client RPCs and helpers in SQL", () => {
    for (const name of Object.values(LEARNING_ENROLLMENT_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}\\b`, "i")
      );
    }
    for (const name of Object.values(LEARNING_ENROLLMENT_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}\\b`, "i")
      );
    }
  });

  it("evaluates entitlement LIVE (active + within window), never cached", () => {
    for (const helper of ["has_learning_program_access", "has_learning_course_access"]) {
      const start = sql.indexOf(
        `create or replace function public.${helper}`
      );
      const end = sql.indexOf("$$;", start);
      const fn = sql.slice(start, end);
      expect(fn).toMatch(/status = 'active'/);
      expect(fn).toMatch(/starts_at is null or [\s\S]*?starts_at <= now\(\)/);
      expect(fn).toMatch(/expires_at is null or [\s\S]*?expires_at > now\(\)/);
      // managers/admins implicitly have access
      expect(fn).toMatch(/is_platform_admin/);
    }
  });

  it("self-enroll eligibility uses the existing settings flags", () => {
    const progStart = sql.indexOf(
      "create or replace function public.can_enroll_in_learning_program"
    );
    const progEnd = sql.indexOf("$$;", progStart);
    const progFn = sql.slice(progStart, progEnd);
    expect(progFn).toMatch(/ps\.allow_self_enroll is true/);
    expect(progFn).toMatch(/ps\.require_space_membership is not true/);
    expect(progFn).toMatch(/is_learning_space_member\(p\.space_id, p_user_id\)/);
    expect(progFn).toMatch(/p\.status = 'published'/);
    expect(progFn).toMatch(/s\.status = 'active'/);

    const courseStart = sql.indexOf(
      "create or replace function public.can_enroll_in_learning_course"
    );
    const courseEnd = sql.indexOf("$$;", courseStart);
    const courseFn = sql.slice(courseStart, courseEnd);
    expect(courseFn).toMatch(/cs\.allow_self_enroll is true/);
    expect(courseFn).toMatch(/cs\.require_program_enrollment is not true/);
    expect(courseFn).toMatch(
      /has_learning_program_access\(c\.program_id, p_user_id\)/
    );
    expect(courseFn).toMatch(/c\.status = 'published'/);
    expect(courseFn).toMatch(/p\.status = 'published'/);
    expect(courseFn).toMatch(/s\.status = 'active'/);
  });

  it("can_manage_learning_enrollment defers to program/course managers or admin", () => {
    const start = sql.indexOf(
      "create or replace function public.can_manage_learning_enrollment"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/is_platform_admin\(p_user_id\)/);
    expect(fn).toMatch(/can_manage_learning_program\(e\.program_id, p_user_id\)/);
    expect(fn).toMatch(/can_manage_learning_course\(e\.course_id, p_user_id\)/);
  });
});

describe("Enrollments Foundation V1 — lifecycle RPCs", () => {
  const sql = read(MIGRATION);

  it("self-enrollment RPCs use the reserved self_enrollment source", () => {
    for (const rpc of ["enroll_in_learning_program", "enroll_in_learning_course"]) {
      const start = sql.indexOf(`create or replace function public.${rpc}`);
      const end = sql.indexOf("$$;", start);
      const fn = sql.slice(start, end);
      expect(fn).toMatch(/'self_enrollment'/);
      expect(fn).toMatch(/Authentication required/);
    }
  });

  it("manager create forbids self_enrollment and only pending|active", () => {
    const start = sql.indexOf(
      "create or replace function public.create_learning_enrollment"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(
      /create_learning_enrollment status must be pending or active/
    );
    expect(fn).toMatch(/self_enrollment is reserved/);
    expect(fn).toMatch(/Learner profile not found/);
  });

  it("enforces lifecycle transition gates", () => {
    expect(sql).toMatch(/Only pending enrollments can be activated/);
    expect(sql).toMatch(/Only pending or active enrollments can be suspended/);
    expect(sql).toMatch(/Only suspended enrollments can be reinstated/);
    expect(sql).toMatch(/Only live enrollments can be cancelled/);
    expect(sql).toMatch(/Only active enrollments can be completed/);
  });

  it("cancel allows the learner or a manager", () => {
    const start = sql.indexOf(
      "create or replace function public.cancel_learning_enrollment"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/v_enrollment\.user_id = v_uid/);
    expect(fn).toMatch(/can_manage_learning_enrollment/);
  });

  it("complete is inert (no progress/grade/certificate reads or writes)", () => {
    const start = sql.indexOf(
      "create or replace function public.complete_learning_enrollment"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).not.toMatch(/progress/i);
    expect(fn).not.toMatch(/certificate/i);
    expect(fn).not.toMatch(/grade/i);
    expect(fn).not.toMatch(/attempt/i);
  });

  it("moderate is platform-admin only and guards the live invariant", () => {
    const start = sql.indexOf(
      "create or replace function public.moderate_learning_enrollment"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/Platform admin required/);
    expect(fn).toMatch(
      /moderate_learning_enrollment status must be active\|suspended\|cancelled/
    );
    expect(fn).toMatch(/Another live enrollment already exists for this target/);
  });

  it("expire sweep is platform-admin only and bounded", () => {
    const start = sql.indexOf(
      "create or replace function public.expire_due_learning_enrollments"
    );
    const end = sql.indexOf("$$;", start);
    const fn = sql.slice(start, end);
    expect(fn).toMatch(/Platform admin required/);
    expect(fn).toMatch(/for update skip locked/);
    expect(fn).toMatch(/expires_at <= now\(\)/);
    expect(fn).toMatch(/status = 'expired'/);
  });
});

describe("Enrollments Foundation V1 — security hardening (NO anon)", () => {
  const sql = read(MIGRATION);

  it("enables and FORCES RLS on both tables", () => {
    expect(sql).toMatch(
      /alter table public\.learning_enrollments enable row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_enrollments force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_enrollment_events enable row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_enrollment_events force row level security/i
    );
  });

  it("has NO anon grant and NO anon policy at all", () => {
    expect(sql).not.toMatch(/\bto anon\b/);
    expect(sql).not.toMatch(/grant select on table[\s\S]*?to anon/);
    expect(sql).not.toMatch(/for select[\s\S]*?to anon/);
  });

  it("grants SELECT to authenticated only; clients cannot write tables", () => {
    expect(sql).toMatch(
      /grant select on table public\.learning_enrollments to authenticated/
    );
    expect(sql).toMatch(
      /grant select on table public\.learning_enrollment_events to authenticated/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_enrollments[\s\S]*?from anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_enrollment_events[\s\S]*?from anon, authenticated/
    );
  });

  it("all client RPCs are SECURITY DEFINER with search_path = public and granted to authenticated+service_role", () => {
    for (const name of Object.values(LEARNING_ENROLLMENT_RPCS)) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const body = sql.slice(start, start + 1200);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = public/i);
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([\\s\\S]*?\\)\\s+to authenticated, service_role`,
          "i"
        )
      );
    }
  });

  it("keeps internal validators/writer revoked from clients", () => {
    for (const name of [
      "learning_enrollment_validate_metadata",
      "learning_enrollment_validate_source",
      "learning_enrollment_event_write",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([\\s\\S]*?\\)\\s+from public, anon, authenticated`,
          "i"
        )
      );
    }
  });
});

describe("Enrollments Foundation V1 — RLS read model", () => {
  const sql = read(MIGRATION);

  it("learners read own enrollments; managers read scoped; admins read all", () => {
    expect(sql).toMatch(
      /create policy "Learners read own enrollments"[\s\S]*?user_id = \(select auth\.uid\(\)\)/
    );
    expect(sql).toMatch(
      /create policy "Managers read scoped enrollments"[\s\S]*?can_manage_learning_program\(program_id\)/
    );
    expect(sql).toMatch(
      /create policy "Platform admins read all enrollments"[\s\S]*?is_platform_admin\(\)/
    );
  });

  it("mirrors the same read model on the events table", () => {
    expect(sql).toMatch(/create policy "Learners read own enrollment events"/);
    expect(sql).toMatch(/create policy "Managers read scoped enrollment events"/);
    expect(sql).toMatch(
      /create policy "Platform admins read all enrollment events"/
    );
  });
});

describe("Enrollments Foundation V1 — metadata & bounds", () => {
  const sql = read(MIGRATION);

  it("validates bounded metadata mirrored in constants", () => {
    expect(sql).toMatch(
      /create or replace function public\.learning_enrollment_validate_metadata/
    );
    expect(sql).toMatch(/v_max_bytes integer := 4096/);
    expect(sql).toMatch(/v_max_keys integer := 32/);
    expect(LEARNING_ENROLLMENT_METADATA_LIMITS.maxBytes).toBe(4096);
    expect(LEARNING_ENROLLMENT_METADATA_LIMITS.maxTopLevelKeys).toBe(32);
    expect(LEARNING_ENROLLMENT_METADATA_LIMITS.maxDepth).toBe(2);
    expect(LEARNING_ENROLLMENT_METADATA_LIMITS.maxArrayItems).toBe(64);
    expect(LEARNING_ENROLLMENT_METADATA_LIMITS.maxStringChars).toBe(512);
  });

  it("bounds the soft-reference fields consistently with constants", () => {
    expect(sql).toMatch(/learning_enrollments_source_reference_type_len/);
    expect(sql).toMatch(/learning_enrollments_source_reference_id_len/);
    expect(LEARNING_ENROLLMENT_SOURCE_REFERENCE_LIMITS.typeMaxChars).toBe(80);
    expect(LEARNING_ENROLLMENT_SOURCE_REFERENCE_LIMITS.idMaxChars).toBe(128);
  });
});

describe("Enrollments Foundation V1 — audit & table inventory", () => {
  const sql = read(MIGRATION);

  it("audits every lifecycle action via learning_audit_write", () => {
    for (const action of Object.values(LEARNING_ENROLLMENT_AUDIT_ACTIONS)) {
      expect(sql).toMatch(new RegExp(`'${action.replace(".", "\\.")}'`));
    }
    expect(sql).toMatch(/learning_audit_write/);
  });

  it("creates exactly the two enrollment tables (no payment/progress/certificate objects)", () => {
    const createdTables = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(createdTables).toEqual([
      "learning_enrollments",
      "learning_enrollment_events",
    ]);
    expect(sql).not.toMatch(/create table if not exists public\.\w*payment/i);
    expect(sql).not.toMatch(/create table if not exists public\.\w*progress/i);
    expect(sql).not.toMatch(
      /create table if not exists public\.\w*certificate/i
    );
    expect(sql).not.toMatch(/create table if not exists public\.\w*attempt/i);
  });
});

describe("Enrollments Foundation V1 — documentation", () => {
  it("documents entitlement scope, XOR target, no-anon, sources, and next slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Enrollments Foundation V1/i);
    expect(doc).toMatch(/learning_enrollments/);
    expect(doc).toMatch(/entitlement/i);
    expect(doc).toMatch(/Program XOR Course|Program \(XOR\) Course/i);
    // NOT payment/progress/certificate
    expect(doc).toMatch(/not.{0,40}(payment|progress|certificate)/i);
    // no anon
    expect(doc).toMatch(/no (anonymous|anon).{0,40}SELECT/i);
    // one live enrollment
    expect(doc).toMatch(/one live enrollment/i);
    // soft refs
    expect(doc).toMatch(/soft ref/i);
    expect(doc).toMatch(/next slice/i);
  });
});
