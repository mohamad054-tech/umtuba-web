import { getSandboxCourse } from "../fixtures/courses";
import type { SandboxCourse } from "../fixtures/types";
import { isPaidCourse } from "./catalog";
import type { LearningPaymentOutcome } from "./payments";

export const ENROLLMENT_MODES = [
  "HOSTED",
  "SANDBOX_ENROLL",
  "EXTERNAL_CONTINUE",
] as const;

export type SandboxEnrollmentStatus =
  | "NOT_ENROLLED"
  | "SANDBOX_ENROLLED"
  | "PAYMENT_REQUIRED"
  | "PAYMENT_PENDING"
  | "EXTERNAL_ONLY";

export type EnrollmentExplain = {
  mode: SandboxCourse["enrollmentMode"];
  status: SandboxEnrollmentStatus;
  why: string;
  whatNext: string;
  productionEnrollment: false;
  ja09Ambiguous: false;
};

export function explainEnrollment(
  course: SandboxCourse,
  opts: { enrolled?: boolean; paymentOutcome?: LearningPaymentOutcome | null }
): EnrollmentExplain {
  if (course.enrollmentMode === "EXTERNAL_CONTINUE") {
    return {
      mode: "EXTERNAL_CONTINUE",
      status: "EXTERNAL_ONLY",
      why: "UMTUBA does not host this course. The preview is affiliate / referral UX only.",
      whatNext:
        "Use Continue with provider (sandbox). No hosted lessons, no UMTUBA certificate, and no Coursera/Udemy/edX certificate is issued here.",
      productionEnrollment: false,
      ja09Ambiguous: false,
    };
  }

  if (isPaidCourse(course) && opts.paymentOutcome !== "SUCCESS") {
    if (opts.paymentOutcome === "PENDING") {
      return {
        mode: course.enrollmentMode,
        status: "PAYMENT_PENDING",
        why: "Sandbox payment is pending. Access is not granted until a mock SUCCESS.",
        whatNext: "Stay on the mock payment page or simulate SUCCESS. No real charge is possible.",
        productionEnrollment: false,
        ja09Ambiguous: false,
      };
    }
    if (opts.paymentOutcome === "FAILURE") {
      return {
        mode: course.enrollmentMode,
        status: "PAYMENT_REQUIRED",
        why: "Mock payment failed. You are not enrolled.",
        whatNext: "Retry simulate SUCCESS, simulate refund after a later success, or leave the course.",
        productionEnrollment: false,
        ja09Ambiguous: false,
      };
    }
    return {
      mode: course.enrollmentMode,
      status: "PAYMENT_REQUIRED",
      why: `This hosted preview is paid in sandbox (${course.listPriceMinor} USD cents). You are not enrolled until mock payment succeeds.`,
      whatNext: "Open mock payment. Do not enter a real card. Production checkout is off.",
      productionEnrollment: false,
      ja09Ambiguous: false,
    };
  }

  const enrolled = Boolean(opts.enrolled) || opts.paymentOutcome === "SUCCESS";
  if (!enrolled) {
    return {
      mode: course.enrollmentMode,
      status: "NOT_ENROLLED",
      why: isPaidCourse(course)
        ? "Paid hosted preview. You are not enrolled."
        : "Free hosted sandbox course. You have not confirmed sandbox enrollment.",
      whatNext: isPaidCourse(course)
        ? "Complete mock payment SUCCESS first."
        : "Confirm sandbox enroll. This does not create a production learning_enrollments row.",
      productionEnrollment: false,
      ja09Ambiguous: false,
    };
  }

  return {
    mode: course.enrollmentMode,
    status: "SANDBOX_ENROLLED",
    why:
      course.enrollmentMode === "HOSTED"
        ? "Free hosted UMTUBA Original sandbox enroll. Isolated fixture state only."
        : "Sandbox enroll after mock payment SUCCESS. Isolated fixture state only.",
    whatNext: "Open the first lesson, then quiz, exercise, and final assessment. Not a production enrollment.",
    productionEnrollment: false,
    ja09Ambiguous: false,
  };
}

export function enrollmentModelsCatalog(): Array<{
  mode: SandboxCourse["enrollmentMode"] | "PAID_SANDBOX";
  title: string;
  why: string;
  whatNext: string;
  exampleSlug: string | null;
}> {
  const original = getSandboxCourse("umtuba-platform-essentials");
  const partner = getSandboxCourse("demo-partner-structured-thinking");
  const external = getSandboxCourse("demo-external-cloud-primer");
  return [
    {
      mode: "HOSTED",
      title: "Free hosted (UMTUBA Originals)",
      why: "First-party draft content. Certificate owner is UMTUBA. Not in the public catalog.",
      whatNext: "Sandbox enroll → lesson → quiz → exercise → assessment → UMTUBA sandbox certificate preview.",
      exampleSlug: original?.slug ?? null,
    },
    {
      mode: "PAID_SANDBOX",
      title: "Paid hosted partner preview",
      why: "Synthetic partner-course economics. Provider is a demo label, not a live contract.",
      whatNext: "Mock payment SUCCESS before lessons. Failure leaves you not enrolled. Refund revokes access.",
      exampleSlug: partner?.slug ?? null,
    },
    {
      mode: "SANDBOX_ENROLL",
      title: "Sandbox enroll label",
      why: "Hosted preview inside /sandbox/business-preview only. Never writes production enrollments.",
      whatNext: "Use the enroll or pay slice. Status always includes WHY and WHAT NEXT.",
      exampleSlug: partner?.slug ?? null,
    },
    {
      mode: "EXTERNAL_CONTINUE",
      title: "External continue",
      why: "UMTUBA does not host third-party lessons and does not import their catalogs.",
      whatNext: "Continue with provider (sandbox). No certificate from Coursera, Udemy, edX, or any real brand.",
      exampleSlug: external?.slug ?? null,
    },
  ];
}
