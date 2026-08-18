import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_ENROLLMENT_HELPERS } from "./enrollmentsFoundation";
import {
  LEARNING_PUBLIC_FREE_SELF_ENROLL_MIGRATION,
  enrollErrorKey,
  isPublicFreeSelfEnrollEligible,
  mapEnrollRpcError,
  resolvePostEnrollHref,
} from "./publicCatalogSelfEnroll";

const ROOT = process.cwd();
const MIGRATION = `supabase/migrations/${LEARNING_PUBLIC_FREE_SELF_ENROLL_MIGRATION}`;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("public catalog free self-enroll contract", () => {
  it("allows published public non-marketplace courses", () => {
    expect(
      isPublicFreeSelfEnrollEligible({
        status: "published",
        visibility: "public",
        marketplace_ready: false,
      })
    ).toBe(true);
    expect(
      isPublicFreeSelfEnrollEligible({
        status: "published",
        visibility: "public",
      })
    ).toBe(true);
  });

  it("rejects draft, private, unlisted, and marketplace-ready paid courses", () => {
    expect(
      isPublicFreeSelfEnrollEligible({
        status: "draft",
        visibility: "public",
      })
    ).toBe(false);
    expect(
      isPublicFreeSelfEnrollEligible({
        status: "published",
        visibility: "private",
      })
    ).toBe(false);
    expect(
      isPublicFreeSelfEnrollEligible({
        status: "published",
        visibility: "unlisted",
      })
    ).toBe(false);
    expect(
      isPublicFreeSelfEnrollEligible({
        status: "published",
        visibility: "public",
        marketplace_ready: true,
      })
    ).toBe(false);
  });

  it("maps RPC errors to stable codes without leaking raw English in keys", () => {
    expect(mapEnrollRpcError("Not eligible to self-enroll in this course")).toBe(
      "not_eligible"
    );
    expect(
      mapEnrollRpcError("A live enrollment already exists for this course")
    ).toBe("already_enrolled");
    expect(mapEnrollRpcError("Course is required")).toBe("course_required");
    expect(mapEnrollRpcError("Learning space must be active for enrollment")).toBe(
      "failed"
    );
    expect(enrollErrorKey("not_eligible")).toBe("learning.enroll.notEligible");
    expect(enrollErrorKey("mystery")).toBe("learning.enroll.failed");
  });

  it("preserves the requested lesson after enroll", () => {
    const lessonId = "8934ff00-6661-42bb-92c8-efe559e76ea1";
    expect(resolvePostEnrollHref("course-ja-09", lessonId)).toBe(
      `/learning/lessons/${lessonId}`
    );
    expect(resolvePostEnrollHref("course-ja-09", "not-a-uuid")).toBe(
      "/learning/courses/course-ja-09"
    );
    expect(resolvePostEnrollHref("course-ja-09")).toBe(
      "/learning/courses/course-ja-09"
    );
  });

  it("enroll action and lesson page preserve the requested lesson id", () => {
    const action = read("app/learning/catalog/actions.ts");
    expect(action).toContain("nextLessonId");
    expect(action).toContain("resolvePostEnrollHref");
    expect(action).not.toMatch(/service_role|SERVICE_ROLE|createServiceRole/);
    const lessonPage = read("app/learning/lessons/[lessonId]/page.tsx");
    expect(lessonPage).toContain("renderEnrollmentRequired");
    expect(lessonPage).toContain('name="nextLessonId"');
    expect(lessonPage).toContain("canUserSelfEnrollInCourse");
  });
});

describe("public catalog self-enroll migration", () => {
  it("replaces can_enroll_in_learning_course after 20260928 and skips 20260929", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(LEARNING_PUBLIC_FREE_SELF_ENROLL_MIGRATION.startsWith("20260930")).toBe(
      true
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      new RegExp(
        `create or replace function public\\.${LEARNING_ENROLLMENT_HELPERS.canEnrollCourse}`
      )
    );
    expect(sql).toMatch(/c\.visibility = 'public'/);
    expect(sql).toMatch(/p\.visibility = 'public'/);
    expect(sql).toMatch(/s\.visibility = 'public'/);
    expect(sql).toMatch(/coalesce\(c\.marketplace_ready, false\) is not true/);
    expect(sql).toMatch(/cs\.allow_self_enroll is true/);
    expect(sql).toMatch(/cs\.require_program_enrollment is not true/);
    expect(sql).toMatch(/has_learning_program_access/);
    expect(sql).toMatch(/revoke all on function public\.can_enroll_in_learning_course/);
    expect(sql).toMatch(/revoke all[\s\S]*from public, anon/);
    expect(sql).toMatch(/grant execute[\s\S]*to authenticated, service_role/);
    expect(sql).not.toMatch(/grant execute[\s\S]*to anon/);
    expect(sql).toMatch(/allow_self_enroll = true/);
    expect(sql).toMatch(/require_program_enrollment = false/);
  });
});
