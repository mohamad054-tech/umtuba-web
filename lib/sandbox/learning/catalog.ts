import {
  courseLessonCount,
  getSandboxCourse,
  SANDBOX_COURSES,
} from "../fixtures/courses";
import { getSandboxPerson, SANDBOX_INSTRUCTORS } from "../fixtures/people";
import type { CourseKind, SandboxCourse, SandboxLesson } from "../fixtures/types";

export type CatalogKindFilter = "ALL" | CourseKind;
export type CatalogPriceFilter = "ALL" | "FREE" | "PAID" | "EXTERNAL";

export type CatalogQuery = {
  q?: string;
  kind?: CatalogKindFilter;
  instructorId?: string;
  price?: CatalogPriceFilter;
};

export function isPaidCourse(course: SandboxCourse): boolean {
  return course.listPriceMinor !== null && course.listPriceMinor > 0;
}

export function isFreeHostedCourse(course: SandboxCourse): boolean {
  return course.enrollmentMode !== "EXTERNAL_CONTINUE" && (course.listPriceMinor ?? 0) === 0;
}

export function flattenLessons(
  course: SandboxCourse
): Array<{ moduleId: string; moduleTitle: string; lesson: SandboxLesson; index: number }> {
  const rows: Array<{
    moduleId: string;
    moduleTitle: string;
    lesson: SandboxLesson;
    index: number;
  }> = [];
  let index = 0;
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      rows.push({ moduleId: courseModule.id, moduleTitle: courseModule.title, lesson, index });
      index += 1;
    }
  }
  return rows;
}

export function findLesson(
  course: SandboxCourse,
  lessonId: string
): { moduleTitle: string; lesson: SandboxLesson; index: number } | null {
  return flattenLessons(course).find((row) => row.lesson.id === lessonId) ?? null;
}

export function findExercise(course: SandboxCourse, exerciseId: string) {
  const courseExercise = course.exercises.find((exercise) => exercise.id === exerciseId);
  if (courseExercise) return courseExercise;
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      if (lesson.lessonExercise?.id === exerciseId) return lesson.lessonExercise;
    }
  }
  return null;
}

export function allExercises(course: SandboxCourse) {
  const lessonOnes = course.modules.flatMap((courseModule) =>
    courseModule.lessons
      .map((lesson) => lesson.lessonExercise)
      .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise))
  );
  return [...lessonOnes, ...course.exercises];
}

export function lessonBodyState(lesson: SandboxLesson): "PRESENT" | "MISSING" {
  return lesson.body.trim().length > 0 ? "PRESENT" : "MISSING";
}

export function filterSandboxCatalog(query: CatalogQuery = {}): SandboxCourse[] {
  const needle = query.q?.trim().toLowerCase() ?? "";
  return SANDBOX_COURSES.filter((course) => {
    if (query.kind && query.kind !== "ALL" && course.kind !== query.kind) return false;
    if (query.instructorId && course.instructorId !== query.instructorId) return false;
    if (query.price === "FREE" && !isFreeHostedCourse(course)) return false;
    if (query.price === "PAID" && !isPaidCourse(course)) return false;
    if (query.price === "EXTERNAL" && course.enrollmentMode !== "EXTERNAL_CONTINUE") return false;
    if (!needle) return true;
    const instructor = getSandboxPerson(course.instructorId);
    const hay = [
      course.title,
      course.shortDescription,
      course.fullDescription ?? "",
      course.slug,
      course.kind,
      instructor?.displayName ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

export function catalogSummary() {
  return {
    total: SANDBOX_COURSES.length,
    originals: SANDBOX_COURSES.filter((course) => course.kind === "UMTUBA_ORIGINAL").length,
    partner: SANDBOX_COURSES.filter((course) => course.kind === "PARTNER_COURSE").length,
    external: SANDBOX_COURSES.filter((course) => course.kind === "EXTERNAL_COURSE").length,
    instructors: SANDBOX_INSTRUCTORS.length,
    publicCatalog: 0,
  };
}

export function courseCardFacts(course: SandboxCourse) {
  return {
    slug: course.slug,
    title: course.title,
    kind: course.kind,
    lessons: courseLessonCount(course),
    modules: course.modules.length,
    paid: isPaidCourse(course),
    listPriceMinor: course.listPriceMinor,
    publicCatalog: course.publicCatalog,
    aiTutorAllowed: course.aiTutorAllowed,
    certificateOwner: course.certificateOwner,
  };
}

export function progressKey(studentId: string, courseSlug: string): string {
  return `${studentId}::${courseSlug}`;
}

export { getSandboxCourse, SANDBOX_COURSES };
