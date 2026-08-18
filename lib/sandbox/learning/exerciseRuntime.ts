/**
 * Learning sandbox exercise resolver. Does not rewrite authored prompts.
 */

import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "../fixtures/originals";
import type { SandboxCourse, SandboxExercise } from "../fixtures/types";
import { allExercises, findExercise, getSandboxCourse } from "./catalog";
import { isLearningSandboxId, learningSandboxHref } from "./routes";

export type ExerciseResolveReason = "unknown-course" | "invalid-exercise-id" | "unknown-exercise";

export type ResolvedLearningExercise =
  | {
      ok: true;
      course: SandboxCourse;
      exercise: SandboxExercise;
      courseHref: string;
      lessonHref: string | null;
    }
  | {
      ok: false;
      reason: ExerciseResolveReason;
      course: SandboxCourse | null;
      courseHref: string | null;
    };

export function resolveLearningExercise(slug: string, exerciseId: string): ResolvedLearningExercise {
  const course = getSandboxCourse(slug);
  if (!course) {
    return { ok: false, reason: "unknown-course", course: null, courseHref: null };
  }
  const courseHref = learningSandboxHref({ surface: "course", slug: course.slug });
  if (!isLearningSandboxId(exerciseId)) {
    return { ok: false, reason: "invalid-exercise-id", course, courseHref };
  }
  const exercise = findExercise(course, exerciseId);
  if (!exercise) {
    return { ok: false, reason: "unknown-exercise", course, courseHref };
  }
  return {
    ok: true,
    course,
    exercise,
    courseHref,
    lessonHref: exercise.lessonId
      ? learningSandboxHref({ surface: "lesson", slug: course.slug, lessonId: exercise.lessonId })
      : null,
  };
}

export type ListedExercise = {
  courseSlug: string;
  courseTitle: string;
  exerciseId: string;
  title: string;
  scope: SandboxExercise["scope"];
  lessonId?: string;
  href: string;
};

export function listCourseExercises(course: SandboxCourse): ListedExercise[] {
  return allExercises(course).map((exercise) => ({
    courseSlug: course.slug,
    courseTitle: course.title,
    exerciseId: exercise.id,
    title: exercise.title,
    scope: exercise.scope,
    lessonId: exercise.lessonId,
    href: learningSandboxHref({ surface: "exercise", slug: course.slug, exerciseId: exercise.id }),
  }));
}

export function listOriginalExercises(): ListedExercise[] {
  return UMTUBA_ORIGINAL_SANDBOX_COURSES.flatMap(listCourseExercises);
}

export function originalExerciseCounts() {
  const rows = listOriginalExercises();
  return {
    lesson: rows.filter((row) => row.scope === "lesson").length,
    course: rows.filter((row) => row.scope === "course").length,
    total: rows.length,
  };
}
