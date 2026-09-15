import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_ONE_TO_ONE_MIGRATION } from "./oneToOne";

function loadSql(): string {
  const path = resolve(
    process.cwd(),
    "supabase/migrations",
    LEARNING_ONE_TO_ONE_MIGRATION
  );
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

describe("1-to-1 authorization SQL lock", () => {
  const sql = loadSql();

  it("A: teacher can create only own availability", () => {
    expect(sql).toMatch(/upsert_learning_one_to_one_availability/);
    expect(sql).toMatch(/v_uid, p_starts_at, p_ends_at, v_status/);
    expect(sql).toMatch(
      /Teachers insert own one-to-one availability[\s\S]*teacher_id = \(select auth\.uid\(\)\)/
    );
    const upsert = sql.slice(sql.indexOf("upsert_learning_one_to_one_availability"));
    expect(upsert).not.toMatch(/p_teacher_id/);
  });

  it("A: learners read open slots and cannot see blocked unless they are the teacher", () => {
    expect(sql).toMatch(/a\.status = 'open' or a\.teacher_id = v_uid/);
    expect(sql).toMatch(
      /status = 'open'\s+or teacher_id = \(select auth\.uid\(\)\)/
    );
  });

  it("B: learner requests an open slot and cannot book as another learner or as the teacher", () => {
    expect(sql).toMatch(/request_learning_one_to_one_booking/);
    expect(sql).toMatch(/v_slot\.teacher_id, v_uid, v_slot\.id/);
    expect(sql).toMatch(/Teacher cannot book own availability/);
    expect(sql).toMatch(/v_slot\.status <> 'open'/);
    expect(sql).toMatch(/learner_id = \(select auth\.uid\(\)\)/);
    expect(sql).toMatch(/teacher_id <> \(select auth\.uid\(\)\)/);
    expect(sql).toMatch(
      /learning_one_to_one_one_active_booking_per_availability/
    );
  });

  it("C: booking reads are limited to the learner or assigned teacher", () => {
    expect(sql).toMatch(/b\.learner_id = v_uid or b\.teacher_id = v_uid/);
    expect(sql).toMatch(
      /learner_id = \(select auth\.uid\(\)\)\s+or teacher_id = \(select auth\.uid\(\)\)/
    );
  });

  it("D: only booking parties may cancel and identity columns stay off the update list", () => {
    expect(sql).toMatch(/cancel_learning_one_to_one_booking/);
    expect(sql).toMatch(
      /v_booking\.learner_id <> v_uid and v_booking\.teacher_id <> v_uid/
    );
    const cancelFn = sql.slice(
      sql.indexOf("cancel_learning_one_to_one_booking"),
      sql.indexOf("confirm_learning_one_to_one_booking")
    );
    expect(cancelFn).toMatch(/status = 'cancelled'/);
    expect(cancelFn).not.toMatch(/teacher_id =/);
    expect(cancelFn).not.toMatch(/learner_id =/);
  });

  it("E: reschedule keeps the same teacher/learner and requires an open slot", () => {
    const rescheduleFn = sql.slice(
      sql.indexOf("reschedule_learning_one_to_one_booking"),
      sql.indexOf("cancel_learning_one_to_one_booking")
    );
    expect(rescheduleFn).toMatch(/v_slot\.status <> 'open'/);
    expect(rescheduleFn).toMatch(/v_slot\.teacher_id <> v_booking\.teacher_id/);
    expect(rescheduleFn).toMatch(/availability_id = v_slot\.id/);
    expect(rescheduleFn).not.toMatch(/teacher_id = v_slot/);
    expect(rescheduleFn).not.toMatch(/learner_id =/);
  });

  it("F: confirm/complete are teacher-only and reject terminal states", () => {
    expect(sql).toMatch(
      /confirm_learning_one_to_one_booking[\s\S]*v_booking\.teacher_id <> v_uid/
    );
    expect(sql).toMatch(
      /complete_learning_one_to_one_booking[\s\S]*v_booking\.teacher_id <> v_uid/
    );
    expect(sql).toMatch(/v_booking\.status <> 'requested'/);
    expect(sql).toMatch(/v_booking\.status <> 'confirmed'/);
  });

  it("locks RLS, no anon grants, and no payment columns", () => {
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(
      /revoke all on table public\.learning_one_to_one_availability from anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on table public\.learning_one_to_one_bookings from anon, authenticated/
    );
    expect(sql).toMatch(/from public, anon/);
    expect(sql).not.toMatch(/grant[\s\S]*to anon/i);
    expect(sql).not.toMatch(/user_metadata/);
    expect(sql).not.toMatch(/stripe|checkout|payout|amount_minor/i);
    expect(sql).toMatch(
      /Teachers update own one-to-one availability[\s\S]*using \([\s\S]*teacher_id = \(select auth\.uid\(\)\)[\s\S]*with check \([\s\S]*teacher_id = \(select auth\.uid\(\)\)/
    );
  });
});
