import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_TEACHER_PLATFORM_MIGRATION } from "./teacherPlatform";
import {
  LEARNING_TEACHER_COMMISSION_PERCENT,
  LEARNING_TEACHER_EARNINGS_KINDS,
  PAYMENT_PROVIDER_CONNECTED,
  REAL_COURSE_PAYMENT,
  REAL_TEACHER_PAYOUT,
  emptyTeacherEarningsSnapshot,
  isTeacherEarningsKind,
} from "./teacherEarnings";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations",
    LEARNING_TEACHER_PLATFORM_MIGRATION
  ),
  "utf8"
);

describe("teacher earnings architecture", () => {
  it("keeps payments and payouts disabled and does not invent commission", () => {
    expect(REAL_COURSE_PAYMENT).toBe(false);
    expect(REAL_TEACHER_PAYOUT).toBe(false);
    expect(PAYMENT_PROVIDER_CONNECTED).toBe(false);
    expect(LEARNING_TEACHER_COMMISSION_PERCENT).toBeNull();
    const snap = emptyTeacherEarningsSnapshot();
    expect(snap.commission_percent).toBeNull();
    expect(snap.rows).toHaveLength(LEARNING_TEACHER_EARNINGS_KINDS.length);
    expect(isTeacherEarningsKind("PLATFORM_COMMISSION")).toBe(true);
    expect(isTeacherEarningsKind("mystery")).toBe(false);
  });

  it("persists ledger kinds without a commission constant", () => {
    for (const kind of LEARNING_TEACHER_EARNINGS_KINDS) {
      expect(sql).toContain(kind);
    }
    expect(sql).not.toMatch(/commission_percent\s*=\s*\d+/);
    expect(sql).toMatch(/learning_teacher_earnings_entries/);
    expect(sql).toMatch(/force row level security/);
  });
});
