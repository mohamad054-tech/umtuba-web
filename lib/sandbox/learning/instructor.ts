import { SANDBOX_COURSES } from "../fixtures/courses";
import { SANDBOX_INSTRUCTORS } from "../fixtures/people";
import type { LifecycleStatus, SandboxCourse } from "../fixtures/types";

export const COURSE_CREATION_STEPS = [
  "DRAFT",
  "REVIEW",
  "SANDBOX_ONLY",
] as const;

export type InstructorDraft = {
  id: string;
  instructorId: string;
  title: string;
  step: (typeof COURSE_CREATION_STEPS)[number];
  publicCatalog: false;
  payoutEnabled: false;
  synthetic: true;
};

export function instructorCourses(instructorId: string): SandboxCourse[] {
  return SANDBOX_COURSES.filter((course) => course.instructorId === instructorId);
}

export function createInstructorDraft(
  instructorId: string,
  title: string,
  existingCount: number
): InstructorDraft | { ok: false; reason: string } {
  const instructor = SANDBOX_INSTRUCTORS.find((person) => person.id === instructorId);
  if (!instructor) {
    return { ok: false, reason: "Unknown sandbox instructor." };
  }
  const trimmed = title.trim().slice(0, 80);
  if (trimmed.length < 4) {
    return { ok: false, reason: "Title must be at least 4 characters." };
  }
  return {
    id: `sandbox-draft-${instructorId}-${existingCount + 1}`,
    instructorId,
    title: trimmed,
    step: "DRAFT",
    publicCatalog: false,
    payoutEnabled: false,
    synthetic: true,
  };
}

export function advanceInstructorDraft(draft: InstructorDraft): InstructorDraft {
  if (draft.step === "DRAFT") return { ...draft, step: "REVIEW" };
  if (draft.step === "REVIEW") return { ...draft, step: "SANDBOX_ONLY" };
  return { ...draft, publicCatalog: false };
}

export function instructorOnboardingTruth(status: "DRAFT" | "ACTIVE"): {
  legalVerification: "NONE";
  note: string;
} {
  return {
    legalVerification: "NONE",
    note:
      status === "ACTIVE"
        ? "ACTIVE is a sandbox onboarding label only. It is not legal verification or a payout grant."
        : "DRAFT instructor. Complete the labeled sandbox onboarding steps. No fake KYC.",
  };
}

export function instructorFinancialDemo(instructorId: string) {
  const courses = instructorCourses(instructorId);
  const paid = courses.filter((course) => (course.listPriceMinor ?? 0) > 0);
  const syntheticGross = paid.reduce((sum, course) => sum + (course.listPriceMinor ?? 0), 0);
  return {
    instructorId,
    courseCount: courses.length,
    paidCourseCount: paid.length,
    syntheticGrossMinor: syntheticGross,
    currency: "USD" as const,
    payoutEnabled: false,
    payoutReason: "SANDBOX · no actual payout · no real settlement",
    status: "DEMO" as const,
  };
}

export function instructorAnalytics(instructorId: string) {
  const courses = instructorCourses(instructorId);
  return {
    instructorId,
    courses: courses.map((course) => ({
      slug: course.slug,
      title: course.title,
      kind: course.kind,
      status: course.status as LifecycleStatus,
      learnersSynthetic: course.kind === "EXTERNAL_COURSE" ? 0 : 3,
      completionSynthetic: course.kind === "UMTUBA_ORIGINAL" ? 42 : 18,
    })),
    note: "Synthetic analytics for Product Owner review. Not live telemetry.",
  };
}
