import { describe, expect, it } from "vitest";
import { publishOriginal } from "../authoring";
import {
  AI_FUNDAMENTALS_FOR_EVERYONE,
  DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS,
  UMTUBA_ORIGINAL_PILOT_COURSES,
  UMTUBA_PLATFORM_ESSENTIALS,
  assemblePilotDraft,
  buildAiTutorContext,
  buildLearnerOverview,
  correctAnswersFor,
  countPilotLessons,
  countPilotQuizzes,
  emptyPilotProgress,
  evaluatePilotAiTutor,
  evaluatePilotCertificatePath,
  evaluatePilotCompletion,
  gradeQuiz,
  markLessonComplete,
  recordQuizResult,
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
  const final = gradeQuiz(course.finalAssessment, correctAnswersFor(course.finalAssessment));
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
      expect(course.contentOwner).toBe("UMTUBA");
      expect(course.contentRights).toBe("OWNED");
      expect(course.aiTutorAllowed).toBe(true);
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
});
