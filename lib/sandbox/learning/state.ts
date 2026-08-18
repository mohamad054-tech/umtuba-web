import { getSandboxCourse } from "../fixtures/courses";
import { FOCUS_STUDENT_ID } from "../fixtures/progress";
import { findExercise, findLesson, flattenLessons, isPaidCourse, progressKey } from "./catalog";
import { certificateDecision } from "./certificates";
import {
  evaluateOriginalsCompletion,
  gradeAnswers,
  gradeFinalAssessment,
} from "./completion";
import { explainEnrollment } from "./enrollment";
import {
  advanceInstructorDraft,
  createInstructorDraft,
  type InstructorDraft,
} from "./instructor";
import {
  applyLearningPayment,
  type LearningPaymentOutcome,
  type LearningPaymentRecord,
} from "./payments";

export type QuizResult = {
  studentId: string;
  courseSlug: string;
  lessonId: string;
  choiceId: string;
  answers: Record<string, string>;
  correct: number;
  total: number;
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
  assessmentId?: string;
  correct: number;
  total: number;
  passed: boolean;
  attempts: number;
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
  notes: Record<string, string>;
  bookmarks: Record<string, boolean>;
  payments: Record<string, LearningPaymentRecord>;
  drafts: InstructorDraft[];
  version: 3;
};

export const EMPTY_LEARNING_SANDBOX_STATE: LearningSandboxState = {
  actorStudentId: FOCUS_STUDENT_ID,
  actorInstructorId: "demo-instructor-01",
  enrollments: {},
  completedLessons: {},
  quizResults: {},
  exerciseAnswers: {},
  assessments: {},
  notes: {},
  bookmarks: {},
  payments: {},
  drafts: [],
  version: 3,
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
      choiceId?: string;
      answers?: Record<string, string>;
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
  | { type: "pay"; studentId: string; courseSlug: string; outcome: LearningPaymentOutcome }
  | {
      type: "saveNote";
      studentId: string;
      courseSlug: string;
      lessonId: string;
      note: string;
    }
  | {
      type: "toggleBookmark";
      studentId: string;
      courseSlug: string;
      lessonId: string;
    }
  | { type: "createDraft"; instructorId: string; title: string }
  | { type: "advanceDraft"; draftId: string };

export function parseLearningSandboxState(raw: string | null | undefined): LearningSandboxState {
  if (!raw) return { ...EMPTY_LEARNING_SANDBOX_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<LearningSandboxState>;
    if (parsed.version !== 3) return { ...EMPTY_LEARNING_SANDBOX_STATE };
    return {
      ...EMPTY_LEARNING_SANDBOX_STATE,
      ...parsed,
      enrollments: parsed.enrollments ?? {},
      completedLessons: parsed.completedLessons ?? {},
      quizResults: parsed.quizResults ?? {},
      exerciseAnswers: parsed.exerciseAnswers ?? {},
      assessments: parsed.assessments ?? {},
      notes: parsed.notes ?? {},
      bookmarks: parsed.bookmarks ?? {},
      payments: parsed.payments ?? {},
      drafts: parsed.drafts ?? [],
      version: 3,
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
      if (!found || found.lesson.quiz.length === 0) return state;
      const answers =
        action.answers ??
        (action.choiceId ? { [found.lesson.quiz[0]!.id]: action.choiceId } : {});
      const graded = gradeAnswers(found.lesson.quiz, answers);
      const key = `${action.studentId}::${action.courseSlug}::${action.lessonId}`;
      return {
        ...state,
        quizResults: {
          ...state.quizResults,
          [key]: {
            studentId: action.studentId,
            courseSlug: action.courseSlug,
            lessonId: action.lessonId,
            choiceId: action.choiceId ?? Object.values(answers)[0] ?? "",
            answers,
            correct: graded.correct,
            total: graded.total,
            passed: graded.passed,
          },
        },
        completedLessons: {
          ...state.completedLessons,
          [progressKey(action.studentId, action.courseSlug)]: [
            ...new Set([
              ...(state.completedLessons[progressKey(action.studentId, action.courseSlug)] ?? []),
              action.lessonId,
            ]),
          ],
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
      const key = progressKey(action.studentId, action.courseSlug);
      const previous = state.assessments[key];
      const scored = course.finalAssessment ? gradeFinalAssessment(course, action.answers) : null;
      if (scored) {
        return {
          ...state,
          assessments: {
            ...state.assessments,
            [key]: {
              studentId: action.studentId,
              courseSlug: action.courseSlug,
              assessmentId: scored.assessmentId,
              correct: scored.correct,
              total: scored.total,
              passed: scored.passed,
              attempts: (previous?.attempts ?? 0) + 1,
            },
          },
        };
      }
      const questions = flattenLessons(course).flatMap((row) => row.lesson.quiz);
      if (questions.length === 0) return state;
      const graded = gradeAnswers(questions, action.answers);
      return {
        ...state,
        assessments: {
          ...state.assessments,
          [key]: {
            studentId: action.studentId,
            courseSlug: action.courseSlug,
            correct: graded.correct,
            total: graded.total,
            passed: graded.passed,
            attempts: (previous?.attempts ?? 0) + 1,
          },
        },
      };
    }
    case "saveNote": {
      if (!isEnrolled(state, action.studentId, action.courseSlug)) return state;
      const key = `${action.studentId}::${action.courseSlug}::${action.lessonId}`;
      return {
        ...state,
        notes: { ...state.notes, [key]: action.note.trim().slice(0, 800) },
      };
    }
    case "toggleBookmark": {
      if (!isEnrolled(state, action.studentId, action.courseSlug)) return state;
      const key = `${action.studentId}::${action.courseSlug}::${action.lessonId}`;
      return {
        ...state,
        bookmarks: { ...state.bookmarks, [key]: !state.bookmarks[key] },
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
  if (course.kind === "UMTUBA_ORIGINAL") {
    const completion = evaluateOriginalsCompletion({ course, state, studentId });
    return certificateDecision(course, {
      enrolled,
      complete: completion.courseComplete,
    });
  }
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
