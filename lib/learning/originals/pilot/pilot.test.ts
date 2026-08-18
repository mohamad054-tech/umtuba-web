import { describe, expect, it } from "vitest";
import { publishOriginal } from "../authoring";
import { importLearningCourses } from "../../providers/importContract";
import { MOCK_PROVIDER_B_COURSES, mockProviderB } from "../../providers/mockProviderB";
import {
  AI_FUNDAMENTALS_FOR_EVERYONE,
  DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS,
  PILOT_PASS_THRESHOLD_PERCENT,
  UMTUBA_ORIGINAL_PILOT_COURSES,
  UMTUBA_PLATFORM_ESSENTIALS,
  assemblePilotDraft,
  buildAiTutorContext,
  buildLearnerOverview,
  correctAnswersFor,
  countPilotLessons,
  countPilotQuizzes,
  emptyPilotProgress,
  evaluateDraftProtection,
  evaluateLearningE2ePath,
  evaluateOwnedVersusPartnerAi,
  evaluatePilotAiTutor,
  evaluatePilotCertificatePath,
  evaluatePilotCompletion,
  getAdjacentLessons,
  getPilotCourseBySlug,
  gradeQuiz,
  markLessonComplete,
  recordQuizResult,
  searchPilotCatalog,
} from "./index";

const AT = "2026-08-18T12:00:00.000Z";

function completeCourse(
  course: (typeof UMTUBA_ORIGINAL_PILOT_COURSES)[number]
) {
  let progress = emptyPilotProgress(course.id);
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      if (lesson.kind === "quiz") {
        const graded = gradeQuiz(lesson.quiz, correctAnswersFor(lesson.quiz));
        progress = recordQuizResult(progress, lesson.id, graded);
      } else {
        progress = markLessonComplete(progress, lesson.id);
      }
    }
  }
      const final = gradeQuiz(
        course.finalAssessment,
        correctAnswersFor(course.finalAssessment),
        course.passThresholdPercent
      );
  progress = { ...progress, finalAssessment: { percent: final.percent, passed: final.passed } };
  return progress;
}

describe("UMTUBA Originals pilot", () => {
  it("ships three owned draft courses with real depth", () => {
    expect(UMTUBA_ORIGINAL_PILOT_COURSES).toHaveLength(3);
    expect(UMTUBA_PLATFORM_ESSENTIALS.title).toBe("UMTUBA Platform Essentials");
    expect(DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS.title).toBe("Digital Safety & Privacy Fundamentals");
    expect(AI_FUNDAMENTALS_FOR_EVERYONE.title).toBe("AI Fundamentals for Everyone");

    for (const course of UMTUBA_ORIGINAL_PILOT_COURSES) {
      expect(course.status).toBe("draft");
      expect(course.publishState).toBe("DRAFT");
      expect(course.providerType).toBe("UMTUBA_ORIGINAL");
      expect(course.contentOwner).toBe("UMTUBA");
      expect(course.contentRights).toBe("OWNED");
      expect(course.aiTutorAllowed).toBe(true);
      expect(course.fullDescription.length).toBeGreaterThan(120);
      expect(course.prerequisites.length).toBeGreaterThanOrEqual(2);
      expect(course.passThresholdPercent).toBe(PILOT_PASS_THRESHOLD_PERCENT);
      expect(course.progressRules.length).toBeGreaterThanOrEqual(4);
      expect(course.certificatePolicy.passingScorePercent).toBe(course.passThresholdPercent);
      expect(course.authors.every((author) => /umtuba/i.test(author.displayName))).toBe(true);
      expect(course.modules.length).toBeGreaterThanOrEqual(4);
      expect(countPilotLessons(course)).toBeGreaterThanOrEqual(10);
      expect(countPilotQuizzes(course)).toBeGreaterThanOrEqual(4);
      expect(course.exercises.length).toBeGreaterThanOrEqual(2);
      expect(course.finalAssessment.length).toBeGreaterThanOrEqual(8);
      expect(course.certificatePolicy.represents).toBe("UMTUBA_ONLY");
      expect(course.shortDescription.toLowerCase()).not.toMatch(/lorem ipsum/);
      for (const lesson of course.modules.flatMap((courseModule) => courseModule.lessons)) {
        if (lesson.kind === "quiz") {
          expect(lesson.body.length).toBeGreaterThan(20);
          expect(lesson.quiz.length).toBeGreaterThanOrEqual(1);
          for (const question of lesson.quiz) {
            expect(question.choices.some((choice) => choice.id === question.correctChoiceId)).toBe(true);
          }
        } else {
          expect(lesson.body.length).toBeGreaterThan(120);
        }
      }
    }
  });

  it("assembles drafts and does not auto-publish", () => {
    const assembled = assemblePilotDraft(UMTUBA_PLATFORM_ESSENTIALS, AT);
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    expect(assembled.original.status).toBe("draft");
    expect(assembled.original.publishedAt).toBeNull();
    expect(assembled.original.lessons.length).toBe(countPilotLessons(UMTUBA_PLATFORM_ESSENTIALS));
    expect(assembled.original.rights.owner).toBe("UMTUBA");
    expect(assembled.original.rights.aiUsageAllowed).toBe(true);
    expect(assembled.original.rights.certificateOwnedByUmtuba).toBe(true);
  });

  it("exposes a learner surface: overview, progress, quiz, completion, certificate, AI context", () => {
    const course = UMTUBA_PLATFORM_ESSENTIALS;
    const overview = buildLearnerOverview(course);
    expect(overview.moduleCount).toBe(4);
    expect(overview.lessonCount).toBeGreaterThanOrEqual(10);
    expect(overview.status).toBe("draft");

    const assembled = assemblePilotDraft(course, AT);
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;

    const empty = emptyPilotProgress(course.id);
    expect(evaluatePilotCompletion({ course, progress: empty }).complete).toBe(false);

    const progress = completeCourse(course);
    expect(evaluatePilotCompletion({ course, progress }).complete).toBe(true);

    const certDraft = evaluatePilotCertificatePath({
      course,
      original: assembled.original,
      progress,
    });
    expect(certDraft.ready).toBe(true);
    expect(certDraft.issuable).toBe(false);

    const aiDraft = evaluatePilotAiTutor({ course, original: assembled.original });
    expect(aiDraft.contextReady).toBe(true);
    expect(aiDraft.ingestAllowed).toBe(false);
    expect(buildAiTutorContext(course).excerpts.length).toBeGreaterThan(0);

    const published = publishOriginal(assembled.original, AT);
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    const certLive = evaluatePilotCertificatePath({
      course,
      original: published.course,
      progress,
    });
    expect(certLive.issuable).toBe(true);
    expect(evaluatePilotAiTutor({ course, original: published.course }).ingestAllowed).toBe(true);
  });

  it("fails quizzes when answers do not match the lessons", () => {
    const questions = UMTUBA_PLATFORM_ESSENTIALS.finalAssessment;
    const wrong = Object.fromEntries(questions.map((question) => [question.id, "nope"]));
    const graded = gradeQuiz(questions, wrong);
    expect(graded.passed).toBe(false);
    expect(gradeQuiz(questions, correctAnswersFor(questions)).passed).toBe(true);
  });

  it("documents supported web surfaces and refuses public partner claims", () => {
    const hay = UMTUBA_PLATFORM_ESSENTIALS.modules
      .flatMap((courseModule) => courseModule.lessons.map((lesson) => lesson.body))
      .join("\n")
      .toLowerCase();
    for (const token of [
      "settings",
      "watch",
      "create",
      "messages",
      "learning",
      "store",
      "world",
      "privacy",
      "support",
    ]) {
      expect(hay).toContain(token);
    }
    expect(hay).not.toMatch(/world, create, and collaboration are outside the scope/);
    const allText = UMTUBA_ORIGINAL_PILOT_COURSES.flatMap((course) => [
      course.shortDescription,
      course.fullDescription,
      ...course.modules.flatMap((courseModule) => courseModule.lessons.map((lesson) => lesson.body)),
    ])
      .join("\n")
      .toLowerCase();
    expect(allText).not.toMatch(/lorem ipsum/);
    expect(allText).not.toMatch(/official umtuba partner (shein|temu|amazon|coursera|udemy)/);
  });

  it("covers catalog, next/previous, draft protection, and AI deny for partners", () => {
    expect(searchPilotCatalog().state).toBe("empty");
    expect(searchPilotCatalog({ includeDrafts: true }).total).toBe(3);
    expect(searchPilotCatalog({ includeDrafts: true, q: "privacy" }).items.some((item) => item.slug.includes("digital-safety"))).toBe(true);
    expect(searchPilotCatalog({ includeDrafts: true, category: "ai-literacy" }).items).toHaveLength(1);
    expect(getPilotCourseBySlug("umtuba-platform-essentials")).toBeNull();
    expect(getPilotCourseBySlug("umtuba-platform-essentials", { allowDraft: true })?.title).toBe(
      "UMTUBA Platform Essentials"
    );
    expect(evaluateDraftProtection(UMTUBA_PLATFORM_ESSENTIALS).publicCatalogVisible).toBe(false);

    const first = UMTUBA_PLATFORM_ESSENTIALS.modules[0].lessons[0];
    const adjacent = getAdjacentLessons(UMTUBA_PLATFORM_ESSENTIALS, first.id);
    expect(adjacent.current?.id).toBe(first.id);
    expect(adjacent.next?.id).toBe(UMTUBA_PLATFORM_ESSENTIALS.modules[0].lessons[1].id);

    const assembled = assemblePilotDraft(UMTUBA_PLATFORM_ESSENTIALS, AT);
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    const progress = completeCourse(UMTUBA_PLATFORM_ESSENTIALS);
    const e2e = evaluateLearningE2ePath({
      course: UMTUBA_PLATFORM_ESSENTIALS,
      original: assembled.original,
      progress,
    });
    expect(e2e.catalogHiddenWhileDraft).toBe(true);
    expect(e2e.courseDetail).toBe(true);
    expect(e2e.lesson).toBe(true);
    expect(e2e.nextPrevious).toBe(true);
    expect(e2e.progress).toBe(true);
    expect(e2e.quiz).toBe(true);
    expect(e2e.finalAssessment).toBe(true);
    expect(e2e.completion).toBe(true);
    expect(e2e.certificatePath).toBe(true);
    expect(e2e.aiTutorPermission).toBe(true);

    const partner = mockProviderB();
    const imported = importLearningCourses({
      runId: "pilot-partner-ai",
      provider: partner,
      records: MOCK_PROVIDER_B_COURSES.slice(0, 1),
      at: AT,
    });
    const published = publishOriginal(assembled.original, AT);
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    const gates = evaluateOwnedVersusPartnerAi({
      ownedCourse: UMTUBA_PLATFORM_ESSENTIALS,
      ownedOriginal: published.course,
      partnerProvider: partner,
      partnerCourse: imported.accepted[0],
    });
    expect(gates.ownedContextReady).toBe(true);
    expect(gates.ownedIngestAllowed).toBe(true);
    expect(gates.partnerDenied).toBe(true);
  });
});
