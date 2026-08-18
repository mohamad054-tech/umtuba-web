import { getSandboxCourse } from "../fixtures/courses";
import { FOCUS_STUDENT_ID } from "../fixtures/progress";
import type { PaymentOutcome } from "../fixtures/types";
import { findExercise, findLesson, flattenLessons, isPaidCourse, progressKey } from "./catalog";
import { certificateDecision } from "./certificates";
import { explainEnrollment } from "./enrollment";
import {
  advanceInstructorDraft,
  createInstructorDraft,
  type InstructorDraft,
} from "./instructor";
import { applyLearningPayment, type LearningPaymentRecord } from "./payments";

export type QuizResult = {
  studentId: string;
  courseSlug: string;
  lessonId: string;
  choiceId: string;
  passed: boolean;
};

export type ExerciseAnswer = {
  studentId: string;
  courseSlug: string;
  exerciseId: string;
  answer: string;
};

export type AssessmentResult = {
  studentId: string;
  courseSlug: string;
  correct: number;
  total: number;
  passed: boolean;
};

export type EnrollmentRecord = {
  studentId: string;
  courseSlug: string;
  enrolled: boolean;
};

export type LearningSandboxState = {
  actorStudentId: string;
  actorInstructorId: string;
  enrollments: Record<string, EnrollmentRecord>;
  completedLessons: Record<string, string[]>;
  quizResults: Record<string, QuizResult>;
  exerciseAnswers: Record<string, ExerciseAnswer>;
  assessments: Record<string, AssessmentResult>;
  payments: Record<string, LearningPaymentRecord>;
  drafts: InstructorDraft[];
  version: 2;
};

export const EMPTY_LEARNING_SANDBOX_STATE: LearningSandboxState = {
  actorStudentId: FOCUS_STUDENT_ID,
  actorInstructorId: "demo-instructor-01",
  enrollments: {},
  completedLessons: {},
  quizResults: {},
  exerciseAnswers: {},
  assessments: {},
  payments: {},
  drafts: [],
  version: 2,
};

export type LearningSandboxAction =
  | { type: "selectStudent"; studentId: string }
  | { type: "selectInstructor"; instructorId: string }
  | { type: "enroll"; studentId: string; courseSlug: string }
  | { type: "completeLesson"; studentId: string; courseSlug: string; lessonId: string }
  | {
      type: "submitQuiz";
      studentId: string;
      courseSlug: string;
      lessonId: string;
      choiceId: string;
    }
  | {
      type: "submitExercise";
      studentId: string;
      courseSlug: string;
      exerciseId: string;
      answer: string;
    }
  | {
      type: "submitAssessment";
      studentId: string;
      courseSlug: string;
      answers: Record<string, string>;
    }
  | { type: "pay"; studentId: string; courseSlug: string; outcome: PaymentOutcome }
  | { type: "createDraft"; instructorId: string; title: string }
  | { type: "advanceDraft"; draftId: string };

export function parseLearningSandboxState(raw: string | null | undefined): LearningSandboxState {
  if (!raw) return { ...EMPTY_LEARNING_SANDBOX_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<LearningSandboxState>;
    if (parsed.version !== 2) return { ...EMPTY_LEARNING_SANDBOX_STATE };
    return {
      ...EMPTY_LEARNING_SANDBOX_STATE,
      ...parsed,
      enrollments: parsed.enrollments ?? {},
      completedLessons: parsed.completedLessons ?? {},
      quizResults: parsed.quizResults ?? {},
      exerciseAnswers: parsed.exerciseAnswers ?? {},
      assessments: parsed.assessments ?? {},
      payments: parsed.payments ?? {},
      drafts: parsed.drafts ?? [],
      version: 2,
    };
  } catch {
    return { ...EMPTY_LEARNING_SANDBOX_STATE };
  }
}

export function isEnrolled(state: LearningSandboxState, studentId: string, courseSlug: string): boolean {
  const course = getSandboxCourse(courseSlug);
  if (!course) return false;
  if (course.enrollmentMode === "EXTERNAL_CONTINUE") return false;
  const payment = state.payments[progressKey(studentId, courseSlug)];
  if (isPaidCourse(course)) return payment?.outcome === "SUCCESS";
  if (course.enrollmentMode === "HOSTED" && !isPaidCourse(course)) {
    return state.enrollments[progressKey(studentId, courseSlug)]?.enrolled ?? false;
  }
  return Boolean(state.enrollments[progressKey(studentId, courseSlug)]?.enrolled);
}

export function enrollmentView(state: LearningSandboxState, studentId: string, courseSlug: string) {
  const course = getSandboxCourse(courseSlug);
  if (!course) return null;
  const payment = state.payments[progressKey(studentId, courseSlug)];
  return explainEnrollment(course, {
    enrolled: isEnrolled(state, studentId, courseSlug),
    paymentOutcome: payment?.outcome ?? null,
  });
}

export function reduceLearningSandboxState(
  state: LearningSandboxState,
  action: LearningSandboxAction
): LearningSandboxState {
  switch (action.type) {
    case "selectStudent":
      return { ...state, actorStudentId: action.studentId };
    case "selectInstructor":
      return { ...state, actorInstructorId: action.instructorId };
    case "enroll": {
      const course = getSandboxCourse(action.courseSlug);
      if (!course || course.enrollmentMode === "EXTERNAL_CONTINUE") return state;
      if (isPaidCourse(course)) return state;
      const key = progressKey(action.studentId, action.courseSlug);
      return {
        ...state,
        enrollments: {
          ...state.enrollments,
          [key]: { studentId: action.studentId, courseSlug: action.courseSlug, enrolled: true },
        },
      };
    }
    case "completeLesson": {
      if (!isEnrolled(state, action.studentId, action.courseSlug)) return state;
      const course = getSandboxCourse(action.courseSlug);
      if (!course || !findLesson(course, action.lessonId)) return state;
      const key = progressKey(action.studentId, action.courseSlug);
      const current = new Set(state.completedLessons[key] ?? []);
      current.add(action.lessonId);
      return {
        ...state,
        completedLessons: { ...state.completedLessons, [key]: [...current] },
      };
    }
    case "submitQuiz": {
      if (!isEnrolled(state, action.studentId, action.courseSlug)) return state;
      const course = getSandboxCourse(action.courseSlug);
      const found = course ? findLesson(course, action.lessonId) : null;
      const question = found?.lesson.quiz[0];
      if (!question) return state;
      const key = `${action.studentId}::${action.courseSlug}::${action.lessonId}`;
      return {
        ...state,
        quizResults: {
          ...state.quizResults,
          [key]: {
            studentId: action.studentId,
            courseSlug: action.courseSlug,
            lessonId: action.lessonId,
            choiceId: action.choiceId,
            passed: action.choiceId === question.correctChoiceId,
          },
        },
      };
    }
    case "submitExercise": {
      if (!isEnrolled(state, action.studentId, action.courseSlug)) return state;
      const course = getSandboxCourse(action.courseSlug);
      if (!course || !findExercise(course, action.exerciseId)) return state;
      const key = `${action.studentId}::${action.courseSlug}::${action.exerciseId}`;
      return {
        ...state,
        exerciseAnswers: {
          ...state.exerciseAnswers,
          [key]: {
            studentId: action.studentId,
            courseSlug: action.courseSlug,
            exerciseId: action.exerciseId,
            answer: action.answer.trim().slice(0, 400),
          },
        },
      };
    }
    case "submitAssessment": {
      if (!isEnrolled(state, action.studentId, action.courseSlug)) return state;
      const course = getSandboxCourse(action.courseSlug);
      if (!course) return state;
      const questions = flattenLessons(course).flatMap((row) => row.lesson.quiz);
      if (questions.length === 0) return state;
      const correct = questions.filter((question) => action.answers[question.id] === question.correctChoiceId).length;
      const passed = correct / questions.length >= 0.7;
      const key = progressKey(action.studentId, action.courseSlug);
      return {
        ...state,
        assessments: {
          ...state.assessments,
          [key]: {
            studentId: action.studentId,
            courseSlug: action.courseSlug,
            correct,
            total: questions.length,
            passed,
          },
        },
      };
    }
    case "pay": {
      const course = getSandboxCourse(action.courseSlug);
      if (!course || !isPaidCourse(course)) return state;
      const record = applyLearningPayment(course, action.studentId, action.outcome);
      const key = progressKey(action.studentId, action.courseSlug);
      const enrolled = record.outcome === "SUCCESS";
      return {
        ...state,
        payments: { ...state.payments, [key]: record },
        enrollments: {
          ...state.enrollments,
          [key]: { studentId: action.studentId, courseSlug: action.courseSlug, enrolled },
        },
      };
    }
    case "createDraft": {
      const draft = createInstructorDraft(action.instructorId, action.title, state.drafts.length);
      if ("ok" in draft) return state;
      return { ...state, drafts: [...state.drafts, draft] };
    }
    case "advanceDraft": {
      return {
        ...state,
        drafts: state.drafts.map((draft) =>
          draft.id === action.draftId ? advanceInstructorDraft(draft) : draft
        ),
      };
    }
    default:
      return state;
  }
}

export function certificateFor(
  state: LearningSandboxState,
  studentId: string,
  courseSlug: string
) {
  const course = getSandboxCourse(courseSlug);
  if (!course) return null;
  const enrolled = isEnrolled(state, studentId, courseSlug);
  const lessons = flattenLessons(course);
  const completed = new Set(state.completedLessons[progressKey(studentId, courseSlug)] ?? []);
  const lessonsDone = lessons.length > 0 && lessons.every((row) => completed.has(row.lesson.id));
  const assessment = state.assessments[progressKey(studentId, courseSlug)];
  const exercisesDone = course.exercises.every((exercise) =>
    Object.values(state.exerciseAnswers).some(
      (row) =>
        row.studentId === studentId &&
        row.courseSlug === courseSlug &&
        row.exerciseId === exercise.id &&
        row.answer.trim().length > 0
    )
  );
  return certificateDecision(course, {
    enrolled,
    complete: lessonsDone && Boolean(assessment?.passed) && exercisesDone,
  });
}
