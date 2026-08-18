import { courseLessonCount, getSandboxCourse } from "../fixtures/courses";
import { FOCUS_STUDENT_ID, progressForStudent, type StudentProgressRow } from "../fixtures/progress";
import { flattenLessons, progressKey } from "./catalog";
import type { LearningSandboxState } from "./state";

export { FOCUS_STUDENT_ID, progressForStudent };

export type LiveProgress = {
  studentId: string;
  courseSlug: string;
  courseTitle: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  percent: number;
  quizzesPassed: number;
  exercisesDone: number;
  assessmentPassed: boolean;
  complete: boolean;
};

export function liveProgress(
  state: LearningSandboxState,
  studentId: string,
  courseSlug: string
): LiveProgress | null {
  const course = getSandboxCourse(courseSlug);
  if (!course) return null;
  const lessons = flattenLessons(course);
  const completed = new Set(state.completedLessons[progressKey(studentId, courseSlug)] ?? []);
  const lessonsCompleted = lessons.filter((row) => completed.has(row.lesson.id)).length;
  const lessonsTotal = courseLessonCount(course);
  const quizzesPassed = Object.values(state.quizResults).filter(
    (row) => row.studentId === studentId && row.courseSlug === courseSlug && row.passed
  ).length;
  const exercisesDone = Object.values(state.exerciseAnswers).filter(
    (row) => row.studentId === studentId && row.courseSlug === courseSlug && row.answer.trim().length > 0
  ).length;
  const assessment = state.assessments[progressKey(studentId, courseSlug)];
  const percent = lessonsTotal === 0 ? 0 : Math.round((lessonsCompleted / lessonsTotal) * 100);
  const complete =
    lessonsTotal > 0 &&
    lessonsCompleted >= lessonsTotal &&
    Boolean(assessment?.passed) &&
    course.exercises.every((exercise) =>
      Object.values(state.exerciseAnswers).some(
        (row) =>
          row.studentId === studentId &&
          row.courseSlug === courseSlug &&
          row.exerciseId === exercise.id &&
          row.answer.trim().length > 0
      )
    );
  return {
    studentId,
    courseSlug,
    courseTitle: course.title,
    lessonsCompleted,
    lessonsTotal,
    percent,
    quizzesPassed,
    exercisesDone,
    assessmentPassed: Boolean(assessment?.passed),
    complete,
  };
}

export { progressKey };

export function mergedStudentRows(
  state: LearningSandboxState,
  studentId: string
): Array<StudentProgressRow | LiveProgress> {
  const live = Object.keys(state.enrollments)
    .filter((key) => key.startsWith(`${studentId}::`))
    .map((key) => liveProgress(state, studentId, key.split("::")[1] ?? ""))
    .filter((row): row is LiveProgress => Boolean(row));
  const fixtures = progressForStudent(studentId);
  const seen = new Set(live.map((row) => row.courseSlug));
  return [...live, ...fixtures.filter((row) => !seen.has(row.courseSlug))];
}
