import { describe, expect, it } from "vitest";
import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "../fixtures/originals";
import { contentLessons, lessonExercises, moduleQuizzes } from "../fixtures/originals/adapt";
import { UMTUBA_ORIGINAL_PILOT_COURSES } from "../fixtures/originals/pilot";
import { renderSandboxCertificate } from "./certificates";
import {
  evaluateOriginalsCompletion,
  FINAL_PASS_CORRECT,
  FINAL_PASS_TOTAL,
  PRODUCTION_COMPLETION_GAP,
} from "./completion";
import { flattenLessons } from "./catalog";
import {
  EMPTY_LEARNING_SANDBOX_STATE,
  certificateFor,
  reduceLearningSandboxState,
} from "./state";
import { resolveSandboxTutorAccess, sandboxTutorAnswer } from "./tutor";
import { SANDBOX_COURSES } from "../fixtures/courses";

function completeOriginal(
  slug: string,
  studentId: string,
  finalAnswers: Record<string, string>
) {
  const course = UMTUBA_ORIGINAL_SANDBOX_COURSES.find((row) => row.slug === slug)!;
  let state = reduceLearningSandboxState(EMPTY_LEARNING_SANDBOX_STATE, {
    type: "enroll",
    studentId,
    courseSlug: slug,
  });
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
  state = reduceLearningSandboxState(state, {
    type: "submitAssessment",
    studentId,
    courseSlug: slug,
    answers: finalAnswers,
  });
  return { course, state };
}

describe("P0 ingest without content loss", () => {
  it("keeps 3/12/36 authored lessons and does not rewrite bodies", () => {
    expect(UMTUBA_ORIGINAL_SANDBOX_COURSES).toHaveLength(3);
    expect(UMTUBA_ORIGINAL_PILOT_COURSES).toHaveLength(3);
    let lessons = 0;
    let quizzes = 0;
    let lessonEx = 0;
    let courseEx = 0;
    for (const [index, course] of UMTUBA_ORIGINAL_SANDBOX_COURSES.entries()) {
      const source = UMTUBA_ORIGINAL_PILOT_COURSES[index]!;
      expect(course.modules).toHaveLength(4);
      expect(flattenLessons(course)).toHaveLength(12);
      lessons += flattenLessons(course).length;
      quizzes += moduleQuizzes(course).length;
      lessonEx += lessonExercises(course).length;
      courseEx += course.exercises.length;
      expect(contentLessons(course)).toHaveLength(8);
      expect(moduleQuizzes(course)).toHaveLength(4);
      expect(lessonExercises(course)).toHaveLength(8);
      expect(course.exercises.length).toBeGreaterThanOrEqual(2);
      expect(course.publicCatalog).toBe(false);
      expect(course.publishState).toBe("DRAFT");
      expect(course.contentRights).toBe("OWNED");
      expect(course.aiTutorAllowed).toBe(true);
      for (const row of flattenLessons(course)) {
        const sourceLesson = source.modules
          .flatMap((courseModule) => courseModule.lessons)
          .find((lesson) => lesson.id === row.lesson.id);
        expect(sourceLesson).toBeTruthy();
        expect(row.lesson.body).toBe(sourceLesson!.body);
        expect(row.lesson.body.length).toBeGreaterThan(20);
      }
    }
    expect(lessons).toBe(36);
    expect(quizzes).toBe(12);
    expect(lessonEx).toBe(24);
    expect(courseEx).toBeGreaterThanOrEqual(6);
  });

  it("wires pe-final ds-final ai-final as 4/5 score mode", () => {
    const ids = UMTUBA_ORIGINAL_SANDBOX_COURSES.map((course) => course.finalAssessment?.id);
    expect(ids).toEqual(["pe-final", "ds-final", "ai-final"]);
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      expect(course.finalAssessment?.questions).toHaveLength(FINAL_PASS_TOTAL);
      expect(course.finalAssessment?.passCorrect).toBe(FINAL_PASS_CORRECT);
      expect(course.finalAssessment?.attempts).toBe("UNLIMITED");
      expect(course.finalAssessment?.mode).toBe("SCORE");
      expect(course.finalAssessment?.reviewBank.length).toBeGreaterThan(0);
    }
  });
});

describe("P9/P10 student E2E and three-course QA", () => {
  it("passes each original at 4/5+ and fails below 4/5 with retry", () => {
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      const failAnswers = Object.fromEntries(
        course.finalAssessment!.questions.map((question, index) => [
          question.id,
          index < 3 ? question.correctChoiceId : question.choices.find((choice) => choice.id !== question.correctChoiceId)!.id,
        ])
      );
      const failed = completeOriginal(course.slug, "demo-student-01", failAnswers);
      const failedCompletion = evaluateOriginalsCompletion({
        course: failed.course,
        state: failed.state,
        studentId: "demo-student-01",
      });
      expect(failedCompletion.finalComplete).toBe(false);
      expect(failedCompletion.courseComplete).toBe(false);
      expect(certificateFor(failed.state, "demo-student-01", course.slug)?.canIssue).toBe(false);
      expect(failed.state.assessments["demo-student-01::" + course.slug]?.attempts).toBe(1);

      const passAnswers = Object.fromEntries(
        course.finalAssessment!.questions.map((question) => [question.id, question.correctChoiceId])
      );
      const passed = completeOriginal(course.slug, "demo-student-01", passAnswers);
      const done = evaluateOriginalsCompletion({
        course: passed.course,
        state: passed.state,
        studentId: "demo-student-01",
      });
      expect(done.courseComplete).toBe(true);
      expect(certificateFor(passed.state, "demo-student-01", course.slug)?.canIssue).toBe(true);
      expect(certificateFor(passed.state, "demo-student-01", course.slug)?.issuer).toBe("UMTUBA");
    }
  });

  it("renders an UMTUBA sandbox certificate without accreditation claims", () => {
    const preview = renderSandboxCertificate({
      studentName: "Demo Student 01",
      courseTitle: "UMTUBA Platform Essentials",
      courseSlug: "umtuba-platform-essentials",
      studentId: "demo-student-01",
      statement: "Issued by UMTUBA.",
      issued: true,
    });
    expect(preview.issuer).toBe("UMTUBA");
    expect(preview.marking).toBe("SANDBOX / DEMO");
    expect(preview.realCredential).toBe(false);
    expect(preview.accreditationClaim).toBe("NONE");
    expect(preview.statement.toLowerCase()).not.toMatch(/accredited degree|professional license/);
  });

  it("keeps partner AI blocked and originals tutor on 36 lessons", () => {
    const partner = SANDBOX_COURSES.find((course) => course.kind === "PARTNER_COURSE")!;
    expect(resolveSandboxTutorAccess(partner).allowed).toBe(false);
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      for (const row of flattenLessons(course)) {
        if (row.lesson.kind === "quiz") continue;
        const answer = sandboxTutorAnswer(course, row.lesson, "summarize");
        expect(answer.allowed).toBe(true);
        expect(answer.sendsToExternalAi).toBe(false);
        expect(answer.context?.lessonTitle).toBe(row.lesson.title);
        expect(answer.context?.courseTitle).toBe(course.title);
      }
    }
    expect(PRODUCTION_COMPLETION_GAP).toMatch(/Production \/learning/);
  });
});
