/**
 * Originals completion contract.
 * PC2 educational rules: every lesson, every module quiz, final assessment.
 * Sandbox finals use the ingest GO: pe-final / ds-final / ai-final, 4/5, unlimited, SCORE.
 * Production Learning cannot persist this contract yet — sandbox state only.
 */

import { getSandboxCourse } from "../fixtures/courses";
import type { SandboxCourse, SandboxLesson } from "../fixtures/types";
import { flattenLessons, progressKey } from "./catalog";
import type { LearningSandboxState } from "./state";

export const FINAL_PASS_CORRECT = 4;
export const FINAL_PASS_TOTAL = 5;
export const MODULE_QUIZ_PASS_PERCENT = 70;

export const PRODUCTION_COMPLETION_GAP =
  "Production /learning does not persist sandbox notes, bookmarks, 4/5 score-mode finals (pe-final/ds-final/ai-final), or this Originals completion contract. Sandbox localStorage only. Do not create production enrollments or certificates.";

export function isContentLesson(lesson: SandboxLesson): boolean {
  return lesson.kind !== "quiz";
}

export function isModuleQuizLesson(lesson: SandboxLesson): boolean {
  return lesson.kind === "quiz";
}

export function gradeAnswers(
  questions: { id: string; correctChoiceId: string }[],
  answers: Record<string, string>
): { correct: number; total: number; percent: number; passed: boolean; passCorrect?: number } {
  const total = questions.length;
  const correct = questions.filter((question) => answers[question.id] === question.correctChoiceId).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent, passed: percent >= MODULE_QUIZ_PASS_PERCENT };
}

export function gradeFinalAssessment(
  course: SandboxCourse,
  answers: Record<string, string>
): { correct: number; total: number; passed: boolean; assessmentId: string } | null {
  const assessment = course.finalAssessment;
  if (!assessment) return null;
  const correct = assessment.questions.filter(
    (question) => answers[question.id] === question.correctChoiceId
  ).length;
  return {
    correct,
    total: assessment.passTotal,
    passed: correct >= assessment.passCorrect,
    assessmentId: assessment.id,
  };
}

export function moduleQuizLessons(course: SandboxCourse): SandboxLesson[] {
  return course.modules.flatMap((courseModule) => courseModule.lessons.filter(isModuleQuizLesson));
}

export function evaluateOriginalsCompletion(input: {
  course: SandboxCourse;
  state: LearningSandboxState;
  studentId: string;
}): {
  lessonsComplete: boolean;
  quizzesComplete: boolean;
  finalComplete: boolean;
  courseComplete: boolean;
  reason: string;
} {
  const key = progressKey(input.studentId, input.course.slug);
  const completed = new Set(input.state.completedLessons[key] ?? []);
  const lessons = flattenLessons(input.course);
  const lessonsComplete = lessons.length > 0 && lessons.every((row) => completed.has(row.lesson.id));
  const quizzes = moduleQuizLessons(input.course);
  const quizzesComplete = quizzes.every((quiz) => {
    const result = input.state.quizResults[`${input.studentId}::${input.course.slug}::${quiz.id}`];
    return result?.passed === true;
  });
  const assessment = input.state.assessments[key];
  const finalComplete = Boolean(assessment?.passed);
  if (!lessonsComplete) {
    return {
      lessonsComplete,
      quizzesComplete,
      finalComplete,
      courseComplete: false,
      reason: "All lessons must be completed.",
    };
  }
  if (!quizzesComplete) {
    return {
      lessonsComplete,
      quizzesComplete,
      finalComplete,
      courseComplete: false,
      reason: "Every module quiz must be passed.",
    };
  }
  if (!finalComplete) {
    return {
      lessonsComplete,
      quizzesComplete,
      finalComplete,
      courseComplete: false,
      reason: "Final assessment must be passed (4/5, unlimited retries).",
    };
  }
  return {
    lessonsComplete,
    quizzesComplete,
    finalComplete,
    courseComplete: true,
    reason: "Course lessons, module quizzes, and final assessment are complete.",
  };
}

export function getOriginalsCourse(slug: string): SandboxCourse | undefined {
  const course = getSandboxCourse(slug);
  return course?.kind === "UMTUBA_ORIGINAL" ? course : undefined;
}
