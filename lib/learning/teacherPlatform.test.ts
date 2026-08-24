import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_TEACHER_CENTER_NAV,
  LEARNING_TEACHER_PLATFORM_MIGRATION,
  LEARNING_TEACHER_RPCS,
  LEARNING_TEACHER_STATUSES,
  canSubmitTeacherApplication,
  canTeacherEditApplication,
  canTeacherUseCenter,
  isPublicTeacherProfile,
  teacherStatusMessageKey,
  validateTeacherDraftInput,
} from "./teacherPlatform";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations",
    LEARNING_TEACHER_PLATFORM_MIGRATION
  ),
  "utf8"
);

describe("teacher platform lifecycle", () => {
  it("uses the five authorized statuses and never auto-approves", () => {
    expect([...LEARNING_TEACHER_STATUSES]).toEqual([
      "draft",
      "pending_review",
      "approved",
      "suspended",
      "rejected",
    ]);
    expect(canTeacherUseCenter("draft")).toBe(false);
    expect(canTeacherUseCenter("pending_review")).toBe(false);
    expect(canTeacherUseCenter("approved")).toBe(true);
    expect(canTeacherUseCenter("suspended")).toBe(false);
    expect(canTeacherUseCenter("rejected")).toBe(false);
    expect(canTeacherEditApplication("pending_review")).toBe(false);
    expect(isPublicTeacherProfile("pending_review")).toBe(false);
    expect(isPublicTeacherProfile("approved")).toBe(true);
  });

  it("requires a complete application before submit", () => {
    expect(
      canSubmitTeacherApplication({ display_name: "A" })
    ).toBe(false);
    expect(
      canSubmitTeacherApplication({
        display_name: "Nour Teacher",
        biography: "Teaches Arabic.",
        subjects: ["language"],
        teaching_languages: ["ar"],
        teaching_description: "Structured lessons.",
      })
    ).toBe(true);
  });

  it("rejects non-http profile images", () => {
    const result = validateTeacherDraftInput({
      display_name: "Nour Teacher",
      profile_image_url: "javascript:alert(1)",
    });
    expect(result.ok).toBe(false);
  });

  it("maps status copy keys", () => {
    expect(teacherStatusMessageKey("pending_review")).toBe(
      "teacher.become.status.pending_review"
    );
  });

  it("exposes the full Teacher Center nav", () => {
    expect(LEARNING_TEACHER_CENTER_NAV.map((item) => item.id)).toEqual([
      "dashboard",
      "courses",
      "create",
      "students",
      "reviews",
      "analytics",
      "earnings",
      "profile",
      "settings",
    ]);
  });
});

describe("teacher platform SQL contracts", () => {
  it("keeps RLS forced and does not disable it", () => {
    expect(sql).toMatch(/alter table public\.learning_teacher_profiles enable row level security/i);
    expect(sql).toMatch(/alter table public\.learning_teacher_profiles force row level security/i);
    expect(sql).not.toMatch(/disable row level security/i);
  });

  it("never lets a teacher self-approve", () => {
    expect(sql).toMatch(/submit_learning_teacher_application/);
    expect(sql).toMatch(/pending_review/);
    expect(sql).toMatch(/moderate_learning_teacher_application/);
    expect(sql).toMatch(/is_platform_admin\(v_uid\)/);
    const submitStart = sql.indexOf(
      "function public.submit_learning_teacher_application"
    );
    const submitEnd = sql.indexOf(
      "function public.get_public_learning_teacher_profile"
    );
    const submit = sql.slice(submitStart, submitEnd);
    expect(submit).toMatch(/status = 'pending_review'/);
    expect(submit).not.toMatch(/status\s*=\s*'approved'/);
  });

  it("hides unpublished teacher applications from public RPC", () => {
    expect(sql).toMatch(/function public\.get_public_learning_teacher_profile/);
    const publicFn = sql.slice(
      sql.indexOf("function public.get_public_learning_teacher_profile")
    );
    expect(publicFn.slice(0, 1800)).toMatch(/status = 'approved'/);
    expect(publicFn.slice(0, 1800)).not.toMatch(/is_platform_admin\(\)/);
  });

  it("registers the teacher RPCs", () => {
    for (const name of Object.values(LEARNING_TEACHER_RPCS)) {
      expect(sql).toContain(`function public.${name}`);
    }
  });
});
