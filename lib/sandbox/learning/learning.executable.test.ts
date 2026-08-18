import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { courseLessonCount, SANDBOX_COURSES } from "../fixtures/courses";
import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "../fixtures/originals";
import { PROSPECTIVE_LEARNING_PARTNERS } from "../fixtures/partners";
import { SANDBOX_INSTRUCTORS, SANDBOX_STUDENTS } from "../fixtures/people";
import { effectiveRights } from "../fixtures/types";
import { attemptAdminPartnerAction } from "./admin";
import {
  filterSandboxCatalog,
  findLesson,
  flattenLessons,
  isPaidCourse,
  lessonBodyState,
} from "./catalog";
import { certificateDecision, isForbiddenCertificateIssuer } from "./certificates";
import { studentE2eClickPath } from "./clickPath";
import { enrollmentModelsCatalog, explainEnrollment } from "./enrollment";
import { createInstructorDraft, instructorFinancialDemo } from "./instructor";
import { learningSandboxJudgments } from "./judgments";
import { applyLearningPayment, canMockPay, LEARNING_MOCK_ADAPTER } from "./payments";
import { parseSandboxSection } from "../paths";
import { parseLearningSandboxRoute, learningSandboxHref } from "./routes";
import {
  EMPTY_LEARNING_SANDBOX_STATE,
  certificateFor,
  isEnrolled,
  reduceLearningSandboxState,
} from "./state";
import { resolveSandboxTutorAccess, sandboxTutorAnswer } from "./tutor";

const ROOT = process.cwd();

describe("P0 containment — learning executable does not graft production", () => {
  it("does not import sandbox fixtures into public /learning", () => {
    expect(readFileSync(join(ROOT, "app/learning/page.tsx"), "utf8")).not.toMatch(/lib\/sandbox/);
  });

  it("does not add sandbox hrefs to public chrome", () => {
    expect(readFileSync(join(ROOT, "app/components/AppTopNav.tsx"), "utf8")).not.toMatch(
      /sandbox\/business-preview\/learning/
    );
  });

  it("keeps prospective AI rights denied", () => {
    for (const partner of PROSPECTIVE_LEARNING_PARTNERS) {
      expect(effectiveRights(partner.rights).AI_USAGE_ALLOWED).toBe(false);
      expect(partner.status).toBe("PROSPECTIVE");
    }
  });
});

describe("Learning routes", () => {
  it("parses the student E2E click path", () => {
    const steps = studentE2eClickPath();
    expect(steps.length).toBeGreaterThanOrEqual(20);
    for (const step of steps) {
      const parsed = parseLearningSandboxRoute(step.href.replace("/sandbox/business-preview/", "").split("/"));
      expect(parsed).toEqual(step.route);
      expect(learningSandboxHref(step.route)).toBe(step.href);
    }
  });

  it("rejects unknown deep paths", () => {
    expect(parseLearningSandboxRoute(["learning", "nope"])).toBeNull();
    expect(parseLearningSandboxRoute(["store", "cart"])).toBeNull();
  });

  it("keeps the catch-all page from 404ing executable Learning slices", () => {
    const parsed = parseSandboxSection([
      "learning",
      "courses",
      "umtuba-platform-essentials",
      "lessons",
      "pe-m1-l1",
    ]);
    expect(parsed.kind).toBe("learning");
    if (parsed.kind === "learning") {
      expect(parsed.route).toEqual({
        surface: "lesson",
        slug: "umtuba-platform-essentials",
        lessonId: "pe-m1-l1",
      });
    }
    expect(parseSandboxSection(["store", "cart"]).kind).toBe("section");
  });
});

describe("Catalog / people bands", () => {
  it("keeps 20–30 students and 6–10 instructors", () => {
    expect(SANDBOX_STUDENTS.length).toBeGreaterThanOrEqual(20);
    expect(SANDBOX_STUDENTS.length).toBeLessThanOrEqual(30);
    expect(SANDBOX_INSTRUCTORS.length).toBeGreaterThanOrEqual(6);
    expect(SANDBOX_INSTRUCTORS.length).toBeLessThanOrEqual(10);
  });

  it("filters by kind, price, and query", () => {
    expect(filterSandboxCatalog({ kind: "UMTUBA_ORIGINAL" })).toHaveLength(3);
    expect(filterSandboxCatalog({ price: "PAID" }).every(isPaidCourse)).toBe(true);
    expect(filterSandboxCatalog({ q: "platform essentials" })[0]?.slug).toBe(
      "umtuba-platform-essentials"
    );
    expect(filterSandboxCatalog({ q: "zzzz-not-a-course" })).toHaveLength(0);
  });
});

describe("Originals + executable lesson/quiz", () => {
  it("keeps three 4x12 originals with authored or honestly missing bodies", () => {
    expect(UMTUBA_ORIGINAL_SANDBOX_COURSES).toHaveLength(3);
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      expect(course.modules).toHaveLength(4);
      expect(courseLessonCount(course)).toBe(12);
      expect(course.publicCatalog).toBe(false);
      expect(course.certificateOwner).toBe("UMTUBA");
      for (const row of flattenLessons(course)) {
        expect(["PRESENT", "MISSING"]).toContain(lessonBodyState(row.lesson));
      }
    }
  });

  it("walks enroll → lesson → quiz → exercise → assessment → certificate", () => {
    const slug = "umtuba-platform-essentials";
    const studentId = "demo-student-01";
    let state = EMPTY_LEARNING_SANDBOX_STATE;
    expect(isEnrolled(state, studentId, slug)).toBe(false);
    state = reduceLearningSandboxState(state, { type: "enroll", studentId, courseSlug: slug });
    expect(isEnrolled(state, studentId, slug)).toBe(true);

    const course = SANDBOX_COURSES.find((row) => row.slug === slug)!;
    for (const row of flattenLessons(course)) {
      state = reduceLearningSandboxState(state, {
        type: "completeLesson",
        studentId,
        courseSlug: slug,
        lessonId: row.lesson.id,
      });
      if (row.lesson.quiz.length > 0) {
        state = reduceLearningSandboxState(state, {
          type: "submitQuiz",
          studentId,
          courseSlug: slug,
          lessonId: row.lesson.id,
          answers: Object.fromEntries(row.lesson.quiz.map((question) => [question.id, question.correctChoiceId])),
        });
      }
    }
    for (const exercise of course.exercises) {
      state = reduceLearningSandboxState(state, {
        type: "submitExercise",
        studentId,
        courseSlug: slug,
        exerciseId: exercise.id,
        answer: "Sandbox exercise answer.",
      });
    }
    const answers: Record<string, string> = Object.fromEntries(
      (course.finalAssessment?.questions ?? []).map((question) => [question.id, question.correctChoiceId])
    );
    state = reduceLearningSandboxState(state, { type: "submitAssessment", studentId, courseSlug: slug, answers });
    const cert = certificateFor(state, studentId, slug);
    expect(cert?.canIssue).toBe(true);
    expect(cert?.issuer).toBe("UMTUBA");
    expect(cert?.accreditationClaim).toBe("NONE");
  });

  it("does not complete a lesson before enroll", () => {
    const next = reduceLearningSandboxState(EMPTY_LEARNING_SANDBOX_STATE, {
      type: "completeLesson",
      studentId: "demo-student-01",
      courseSlug: "umtuba-platform-essentials",
      lessonId: "pe-m1-l1",
    });
    expect(next.completedLessons).toEqual({});
  });
});

describe("AI tutor permission contract", () => {
  it("allows owned originals locally and denies partner/external", () => {
    const original = SANDBOX_COURSES.find((course) => course.slug === "ai-fundamentals-for-everyone")!;
    const partner = SANDBOX_COURSES.find((course) => course.kind === "PARTNER_COURSE")!;
    const external = SANDBOX_COURSES.find((course) => course.kind === "EXTERNAL_COURSE")!;
    expect(resolveSandboxTutorAccess(original).allowed).toBe(true);
    expect(resolveSandboxTutorAccess(original).sendsToExternalAi).toBe(false);
    expect(resolveSandboxTutorAccess(partner).allowed).toBe(false);
    expect(resolveSandboxTutorAccess(external).allowed).toBe(false);
    const lesson = findLesson(original, "ai-m1-l1")!.lesson;
    expect(sandboxTutorAnswer(original, lesson, "explain").sendsToExternalAi).toBe(false);
    expect(sandboxTutorAnswer(partner, lesson, "explain").allowed).toBe(false);
  });
});

describe("Certificates and forbidden issuers", () => {
  it("never issues Coursera/Udemy/edX certificates", () => {
    expect(isForbiddenCertificateIssuer("Coursera")).toBe(true);
    expect(isForbiddenCertificateIssuer("Udemy")).toBe(true);
    expect(isForbiddenCertificateIssuer("edX")).toBe(true);
    const external = SANDBOX_COURSES.find((course) => course.kind === "EXTERNAL_COURSE")!;
    expect(certificateDecision(external, { complete: true, enrolled: true }).canIssue).toBe(false);
    expect(certificateDecision(external, { complete: true, enrolled: true }).kind).toBe("NONE");
  });
});

describe("Paid learning + mock payment", () => {
  it("requires SUCCESS to enroll and never charges", () => {
    const slug = "demo-partner-structured-thinking";
    const studentId = "demo-student-02";
    const course = SANDBOX_COURSES.find((row) => row.slug === slug)!;
    expect(canMockPay(course)).toBe(true);
    expect(LEARNING_MOCK_ADAPTER.realPayment).toBe(false);
    expect(LEARNING_MOCK_ADAPTER.storesCardNumbers).toBe(false);
    let state = reduceLearningSandboxState(EMPTY_LEARNING_SANDBOX_STATE, {
      type: "enroll",
      studentId,
      courseSlug: slug,
    });
    expect(isEnrolled(state, studentId, slug)).toBe(false);
    state = reduceLearningSandboxState(state, { type: "pay", studentId, courseSlug: slug, outcome: "FAILURE" });
    expect(isEnrolled(state, studentId, slug)).toBe(false);
    state = reduceLearningSandboxState(state, { type: "pay", studentId, courseSlug: slug, outcome: "SUCCESS" });
    expect(isEnrolled(state, studentId, slug)).toBe(true);
    expect(state.payments[`${studentId}::${slug}`]?.realChargePossible).toBe(false);
    const record = applyLearningPayment(course, studentId, "REFUND");
    expect(record.realPayment).toBe(false);
  });
});

describe("Enrollment models are not JA-09 ambiguous", () => {
  it("always returns WHY and WHAT NEXT", () => {
    for (const course of SANDBOX_COURSES) {
      const row = explainEnrollment(course, { enrolled: false, paymentOutcome: null });
      expect(row.why.length).toBeGreaterThan(10);
      expect(row.whatNext.length).toBeGreaterThan(10);
      expect(row.productionEnrollment).toBe(false);
      expect(row.ja09Ambiguous).toBe(false);
    }
    expect(enrollmentModelsCatalog().every((row) => row.why && row.whatNext)).toBe(true);
  });
});

describe("Instructor + admin", () => {
  it("creates drafts that cannot enter the public catalog", () => {
    const draft = createInstructorDraft("demo-instructor-01", "Sandbox draft course", 0);
    expect("ok" in draft).toBe(false);
    if ("ok" in draft) return;
    expect(draft.publicCatalog).toBe(false);
    expect(draft.payoutEnabled).toBe(false);
    expect(instructorFinancialDemo("demo-instructor-01").payoutEnabled).toBe(false);
  });

  it("refuses to activate prospective partners", () => {
    const partner = PROSPECTIVE_LEARNING_PARTNERS[0]!;
    const result = attemptAdminPartnerAction(partner, "ACTIVATE");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("PROSPECTIVE");
    expect(result.reason).toMatch(/PROSPECTIVE_CANNOT_BECOME_ACTIVE/);
  });
});

describe("Honest judgments", () => {
  it("does not claim world-class YES across the board", () => {
    const rows = learningSandboxJudgments();
    expect(rows.some((row) => row.verdict === "PARTIAL")).toBe(true);
    expect(rows.every((row) => row.note.length > 20)).toBe(true);
  });
});
